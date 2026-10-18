package com.qianrenni.crossterm.ota

import android.content.Context
import android.provider.Settings
import android.util.Log
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.zip.CRC32

/**
 * RN Bundle 的 OTA 客户端：拉静态 manifest → 版本 / 兼容性 / 灰度判断 → 下载 → 校验 → 落盘。
 *
 * 只依赖 `HttpURLConnection` + `org.json`，不引三方库；**不碰主线程**，
 * 由 `MainApplication.onCreate` 起后台线程跑。
 *
 * 生效时机：写指针后**下一次冷启动**由 `MainApplication` 读到新包交给 `ReactHost`。
 * 不在当次启动热切，是因为 `DefaultReactHost` 的 `JSBundleLoader` 在建宿主时就固定了。
 */
internal object OtaUpdater {

    private const val TAG = "OtaUpdater"

    sealed class Result {
        /** 服务端没有更新（或当前已是最新）。 */
        data class UpToDate(val currentVersionCode: Int) : Result()

        /** 新包已下载并落盘，下次冷启动生效。 */
        data class Downloaded(val versionCode: Int, val version: String, val path: String) : Result()

        /** 本次跳过（灰度未命中 / 与原生版本不兼容）。 */
        data class Skipped(val reason: String) : Result()

        data class Failed(val message: String) : Result()
    }

    /** 后台跑一次同步；任何异常都吞掉并回报 `Failed`，绝不影响启动。 */
    fun syncAsync(context: Context, config: OtaConfig = OtaConfig.fromBuildConfig()) {
        val appContext = context.applicationContext
        Thread({
            val result = runCatching { sync(appContext, config) }
                .getOrElse { error -> Result.Failed(error.message ?: error.javaClass.simpleName) }
            when (result) {
                is Result.Downloaded ->
                    Log.i(TAG, "新包已就绪：v${result.versionCode}(${result.version}) → ${result.path}，下次冷启动生效")
                is Result.UpToDate -> Log.i(TAG, "已是最新：v${result.currentVersionCode}")
                is Result.Skipped -> Log.i(TAG, "跳过更新：${result.reason}")
                is Result.Failed -> Log.w(TAG, "检查更新失败：${result.message}")
            }
        }, "ota-sync").apply { isDaemon = true }.start()
    }

    /** 阻塞式同步（只允许在后台线程调用）。 */
    fun sync(context: Context, config: OtaConfig): Result {
        val manifest = JSONObject(httpGetText(config.manifestUrl, config))

        val range = manifest.optJSONObject("binaryVersionRange")
        val minBinary = range?.optInt("min") ?: 0
        val maxBinary = range?.optInt("max") ?: Int.MAX_VALUE
        if (config.binaryVersion !in minBinary..maxBinary) {
            return Result.Skipped("包仅兼容 versionCode $minBinary..$maxBinary，当前是 ${config.binaryVersion}")
        }

        val versionCode = manifest.getInt("versionCode")
        val version = manifest.optString("version")
        val current = OtaBundleStore.active(context)?.revision?.versionCode ?: 0
        if (versionCode <= current) return Result.UpToDate(current)

        val percent = manifest.optJSONObject("rollout")?.optInt("percent") ?: 100
        if (percent < 100 && rolloutBucket(context, versionCode) >= percent) {
            return Result.Skipped("灰度未命中（${percent}%）")
        }

        val entry = manifest.optString("entry").ifEmpty { OtaBundleStore.DEFAULT_ENTRY }
        val bundle = manifest.getJSONObject("bundle")
        val url = bundle.getString("url")
        val expectedMd5 = bundle.optString("md5")
        val expectedSize = bundle.optLong("size")

        val staged = OtaBundleStore.stagingFile(context, versionCode)
        try {
            httpDownload(url, staged, config)
            if (expectedSize > 0 && staged.length() != expectedSize) {
                return Result.Failed("体积不一致：期望 $expectedSize，实际 ${staged.length()}")
            }
            if (expectedMd5.isNotEmpty() && !md5Hex(staged).equals(expectedMd5, ignoreCase = true)) {
                return Result.Failed("MD5 校验失败（可能被 CDN 截断或缓存了旧包）")
            }
            val revision = OtaBundleStore.Revision(
                versionCode = versionCode,
                version = version,
                entry = entry,
                md5 = expectedMd5,
            )
            OtaBundleStore.commit(context, revision, staged)
            val path = OtaBundleStore.active(context)?.bundle?.absolutePath.orEmpty()
            return Result.Downloaded(versionCode, version, path)
        } finally {
            if (staged.exists()) staged.delete()
        }
    }

    /**
     * 灰度分桶：`androidId + versionCode` 稳定散列到 0..99。
     * 同一设备同一版本每次结果一致——服务端放大 percent 时，已命中的设备不会被踢出去。
     */
    private fun rolloutBucket(context: Context, versionCode: Int): Int {
        val androidId = runCatching {
            Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        }.getOrNull().orEmpty()
        val crc = CRC32()
        crc.update("$androidId:$versionCode".toByteArray())
        return (crc.value % 100).toInt()
    }

    private fun httpGetText(url: String, config: OtaConfig): String {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = config.connectTimeoutMs
            readTimeout = config.readTimeoutMs
            requestMethod = "GET"
            setRequestProperty("Accept", "application/json")
        }
        try {
            val code = connection.responseCode
            check(code in 200..299) { "manifest 请求失败：HTTP $code（$url）" }
            return connection.inputStream.bufferedReader().use { it.readText() }
        } finally {
            connection.disconnect()
        }
    }

    private fun httpDownload(url: String, target: File, config: OtaConfig) {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = config.connectTimeoutMs
            readTimeout = config.readTimeoutMs
            requestMethod = "GET"
        }
        try {
            val code = connection.responseCode
            check(code in 200..299) { "Bundle 下载失败：HTTP $code（$url）" }
            connection.inputStream.use { input ->
                target.outputStream().use { output -> input.copyTo(output, DEFAULT_BUFFER_SIZE) }
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun md5Hex(file: File): String {
        val digest = MessageDigest.getInstance("MD5")
        file.inputStream().use { input ->
            val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
            while (true) {
                val read = input.read(buffer)
                if (read <= 0) break
                digest.update(buffer, 0, read)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }
}
