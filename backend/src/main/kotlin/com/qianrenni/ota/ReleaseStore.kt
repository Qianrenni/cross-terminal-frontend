package com.qianrenni.ota

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory
import java.io.File
import java.security.MessageDigest
import java.time.Instant

/** 一次发布请求（已从 multipart 解析并清洗）。 */
data class PublishRequest(
    val appKey: String,
    val platform: String,
    val renderer: String,
    val version: String?,
    val entry: String,
    val description: String,
    val minBinaryVersion: Int,
    val maxBinaryVersion: Int,
    val fingerprint: String,
    val rolloutPercent: Int,
    val originalFileName: String?,
    val content: File,
)

/**
 * 文件系统发版存储：**不依赖数据库**，产物 / 元数据 / manifest 全部落盘。
 *
 * ```
 * data/
 * ├── files/{appKey}/{platform}/{renderer}/{versionCode}/bundle.{ext}          # 产物（对外 /ota-files）
 * ├── releases/{appKey}/{platform}/{renderer}/{versionCode}/release.json       # 元数据（权威记录）
 * └── manifests/{appKey}/{platform}/{binaryVersion}/{renderer}/manifest.json    # 预生成静态 manifest（对外 /ota）
 * ```
 *
 * 设计要点：
 * - **版本号由服务端分配**（同 triple 内 max+1），避免客户端自报版本造成覆盖或倒退；
 * - **写入一律「先写临时文件再改名」**，进程被杀也不会留下半截 JSON；
 * - **发布即生效**并重生成静态 manifest；`activate` 用于灰度验证后的切正式与出问题回滚。
 */
class ReleaseStore(private val config: OtaConfig) {

    private val json = Json {
        prettyPrint = true
        ignoreUnknownKeys = true
        encodeDefaults = true
    }
    private val log = LoggerFactory.getLogger(ReleaseStore::class.java)

    private val filesRoot = File(config.dataDir, "files")
    private val releasesRoot = File(config.dataDir, "releases")
    private val manifestsRoot = File(config.dataDir, "manifests")

    /** 对外静态目录（读取时确保存在，避免静态路由启动失败）。 */
    val manifestsDir: File get() = manifestsRoot.apply { mkdirs() }
    val filesDir: File get() = filesRoot.apply { mkdirs() }

    // ------------------------------------------------------------------ 发布

    suspend fun publish(request: PublishRequest): ReleaseMeta = withContext(Dispatchers.IO) {
        val appKey = validatedAppKey(request.appKey)
        val platform = validatedPlatform(request.platform)
        val renderer = validatedRenderer(request.renderer)
        val extension = validatedExtension(request.originalFileName)
        val entry = request.entry.trim()

        require(entry.isNotEmpty()) { "entry 不能为空" }
        require(entry.length <= 255) { "entry 不超过 255 字符" }
        require(!entry.contains("..")) { "entry 不允许包含 .." }
        require(request.content.length() > 0) { "包内容为空" }
        require(request.content.length() <= config.maxBundleBytes) {
            "包体积超过上限 ${config.maxBundleBytes / 1024 / 1024}MB"
        }
        require(request.minBinaryVersion >= 0) { "minBinaryVersion 不能为负" }
        require(request.maxBinaryVersion >= request.minBinaryVersion) {
            "maxBinaryVersion 不能小于 minBinaryVersion"
        }
        require(request.maxBinaryVersion - request.minBinaryVersion <= MAX_BINARY_RANGE) {
            "兼容区间跨度过大（最多 $MAX_BINARY_RANGE 个原生版本）"
        }
        val percent = request.rolloutPercent.coerceIn(0, 100)

        val versionCode = nextVersionCode(appKey, platform, renderer)
        val version = request.version?.trim()?.takeIf { it.isNotEmpty() } ?: versionCode.toString()
        val md5 = md5Of(request.content)
        val size = request.content.length()

        // 1) 产物落盘
        val artifactDir = File(filesRoot, "$appKey/$platform/$renderer/$versionCode")
        check(artifactDir.mkdirs() || artifactDir.isDirectory) { "无法创建产物目录：$artifactDir" }
        val artifact = File(artifactDir, "bundle.$extension")
        request.content.copyTo(artifact, overwrite = true)

        // 2) 元数据落盘（新版本自动成为生效版本）
        val meta = ReleaseMeta(
            appKey = appKey,
            platform = platform,
            renderer = renderer,
            version = version,
            versionCode = versionCode,
            binaryVersionRange = BinaryVersionRange(request.minBinaryVersion, request.maxBinaryVersion),
            fingerprint = request.fingerprint.trim(),
            entry = entry,
            description = request.description.trim(),
            rollout = Rollout(percent = percent),
            md5 = md5,
            size = size,
            fileName = artifact.name,
            createdAt = Instant.now().toString(),
            active = true,
        )
        writeMeta(meta)
        clearActiveExcept(appKey, platform, renderer, versionCode)

        // 3) 重生成该 (appKey, platform) 下所有 renderer 的静态 manifest
        regenerateManifests(appKey, platform)

        log.info(
            "发布成功 appKey={} platform={} renderer={} versionCode={} size={} rollout={}%",
            appKey, platform, renderer, versionCode, size, percent,
        )
        requireNotNull(readMeta(appKey, platform, renderer, versionCode)) { "元数据写入后读取失败" }
    }

    // ------------------------------------------------------------------ 查询 / 切换

    suspend fun list(appKey: String? = null): List<ReleaseMeta> = withContext(Dispatchers.IO) {
        val key = appKey?.trim()?.takeIf { it.isNotEmpty() }
        val base = if (key == null) releasesRoot else File(releasesRoot, key)
        if (!base.isDirectory) return@withContext emptyList()
        base.walkTopDown()
            .filter { it.isFile && it.name == META_FILE }
            .mapNotNull { readMeta(it) }
            .sortedWith(compareBy({ it.appKey }, { it.platform }, { it.renderer }, { -it.versionCode }))
            .toList()
    }

    suspend fun active(appKey: String, platform: String, renderer: String): ReleaseMeta? =
        withContext(Dispatchers.IO) { activeMeta(appKey, platform, renderer) }

    /** 把指定版本切为生效版本（发布验证通过后的「切正式」与出问题时的「回滚」）。 */
    suspend fun activate(
        appKey: String,
        platform: String,
        renderer: String,
        versionCode: Int,
    ): ReleaseMeta = withContext(Dispatchers.IO) {
        val target = readMeta(appKey, platform, renderer, versionCode)
            ?: throw IllegalArgumentException("版本不存在：$appKey/$platform/$renderer/$versionCode")
        clearActiveExcept(appKey, platform, renderer, versionCode)
        regenerateManifests(appKey, platform)
        log.info("切换生效版本 {} {} {} -> {}", appKey, platform, renderer, versionCode)
        target.copy(active = true)
    }

    // ------------------------------------------------------------------ 内部

    private fun activeMeta(appKey: String, platform: String, renderer: String): ReleaseMeta? {
        val metas = metasFor(appKey, platform, renderer)
        return metas.firstOrNull { it.active } ?: metas.maxByOrNull { it.versionCode }
    }

    private fun metasFor(appKey: String, platform: String, renderer: String): List<ReleaseMeta> {
        val dir = File(releasesRoot, "$appKey/$platform/$renderer")
        if (!dir.isDirectory) return emptyList()
        return dir.listFiles().orEmpty()
            .filter { it.isDirectory }
            .mapNotNull { readMeta(File(it, META_FILE)) }
    }

    private fun readMeta(appKey: String, platform: String, renderer: String, versionCode: Int): ReleaseMeta? =
        readMeta(File(releasesRoot, "$appKey/$platform/$renderer/$versionCode/$META_FILE"))

    private fun readMeta(file: File): ReleaseMeta? =
        if (!file.isFile) null
        else runCatching { json.decodeFromString<ReleaseMeta>(file.readText()) }.getOrNull()

    private fun writeMeta(meta: ReleaseMeta) {
        val dir = File(releasesRoot, "${meta.appKey}/${meta.platform}/${meta.renderer}/${meta.versionCode}")
        check(dir.mkdirs() || dir.isDirectory) { "无法创建元数据目录：$dir" }
        atomicWrite(File(dir, META_FILE), json.encodeToString(meta))
    }

    private fun clearActiveExcept(appKey: String, platform: String, renderer: String, keepVersionCode: Int) {
        metasFor(appKey, platform, renderer).forEach { meta ->
            val shouldBeActive = meta.versionCode == keepVersionCode
            if (meta.active != shouldBeActive) writeMeta(meta.copy(active = shouldBeActive))
        }
    }

    private fun nextVersionCode(appKey: String, platform: String, renderer: String): Int =
        (metasFor(appKey, platform, renderer).maxOfOrNull { it.versionCode } ?: 0) + 1

    /**
     * 重生成 (appKey, platform) 下所有 renderer 的静态 manifest。
     *
     * 先整目录清空再写，避免「切了生效版本但旧 manifest 还在」导致客户端拿到过期版本。
     */
    private fun regenerateManifests(appKey: String, platform: String) {
        File(manifestsRoot, "$appKey/$platform").deleteRecursively()

        val platformDir = File(releasesRoot, "$appKey/$platform")
        val renderers = platformDir.listFiles().orEmpty()
            .filter { it.isDirectory }
            .map { it.name }

        renderers.forEach { renderer ->
            val meta = activeMeta(appKey, platform, renderer) ?: return@forEach
            val range = meta.binaryVersionRange
            for (binaryVersion in range.min..range.max) {
                val manifest = Manifest(
                    appKey = meta.appKey,
                    platform = meta.platform,
                    renderer = meta.renderer,
                    version = meta.version,
                    versionCode = meta.versionCode,
                    binaryVersionRange = range,
                    fingerprint = meta.fingerprint,
                    bundle = BundleArtifact(
                        url = artifactUrl(meta),
                        md5 = meta.md5,
                        size = meta.size,
                    ),
                    rollout = meta.rollout,
                    createdAt = meta.createdAt,
                )
                val file = File(manifestsRoot, "$appKey/$platform/$binaryVersion/$renderer/$MANIFEST_FILE")
                file.parentFile?.mkdirs()
                atomicWrite(file, json.encodeToString(manifest))
            }
            log.debug(
                "生成 manifest {} {} {} binaryVersion={}..{}",
                appKey, platform, renderer, range.min, range.max,
            )
        }
    }

    private fun artifactUrl(meta: ReleaseMeta): String =
        "${config.serverUrl}/ota-files/${meta.appKey}/${meta.platform}/${meta.renderer}/${meta.versionCode}/${meta.fileName}"

    /** 先写临时文件再改名：崩溃时不会留下半截内容。 */
    private fun atomicWrite(file: File, content: String) {
        file.parentFile?.mkdirs()
        val temp = File(file.parentFile, "${file.name}.tmp")
        temp.writeText(content)
        if (!temp.renameTo(file)) {
            temp.copyTo(file, overwrite = true)
            temp.delete()
        }
    }

    private fun md5Of(file: File): String {
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

    private fun validatedAppKey(raw: String): String {
        val value = raw.trim().lowercase()
        require(APP_KEY_PATTERN.matches(value)) { "appKey 只允许小写字母/数字/下划线/中划线，长度 1~64" }
        return value
    }

    private fun validatedPlatform(raw: String): String {
        val value = raw.trim().lowercase()
        require(value in PLATFORMS) { "platform 只支持：${PLATFORMS.joinToString("/")}" }
        return value
    }

    private fun validatedRenderer(raw: String): String {
        val value = raw.trim().lowercase()
        require(value in RENDERERS) { "renderer 只支持：${RENDERERS.joinToString("/")}" }
        return value
    }

    private fun validatedExtension(originalFileName: String?): String {
        val ext = originalFileName?.substringAfterLast('.', "")?.trim()?.lowercase().orEmpty()
        require(ext in EXTENSIONS) { "包扩展名只支持：${EXTENSIONS.joinToString("/")}" }
        return ext
    }

    private companion object {
        const val META_FILE = "release.json"
        const val MANIFEST_FILE = "manifest.json"

        /** 单次发布允许覆盖的原生版本跨度，避免 manifest 数量爆炸 */
        const val MAX_BINARY_RANGE = 200

        val APP_KEY_PATTERN = Regex("[a-z0-9_-]{1,64}")
        val PLATFORMS = setOf("android", "ios", "harmony")

        /** 四类渲染形态；native 随包发布，不参与 OTA */
        val RENDERERS = setOf("react_native", "h5", "native_card", "miniprogram")
        val EXTENSIONS = setOf("js", "bundle", "hbc", "zip", "html", "json")
    }
}
