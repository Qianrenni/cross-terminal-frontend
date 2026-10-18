package com.qianrenni.crossterm.ota

import android.content.Context
import org.json.JSONObject
import java.io.File

/**
 * 已下载 Bundle 的落盘布局与「当前 / 上一版」指针。
 *
 * ```text
 * filesDir/ota/
 * ├── bundles/<versionCode>/bundle.hbc   # 可加载的包（Hermes 字节码）
 * ├── staging/<versionCode>.part         # 下载中的临时文件，校验通过才移入 bundles/
 * └── state.json                         # {"current": {…}, "previous": {…}}
 * ```
 *
 * 与 `ROADMAP.md` §3.2 一致，唯一差异：目录名用 `versionCode` 而不是语义版本号——
 * `versionCode` 才是服务端分配、单调递增的比较依据，语义版本只用于展示。
 *
 * - **先落包、再写指针**：`state.json` 存在 ⇒ 里面指向的包一定完整；
 * - 指针用「临时文件 + rename」原子替换，进程被杀不会留下半截 JSON；
 * - 保留 current + previous 两代，给后续「崩溃回滚」（ROADMAP 步骤 7）留好数据。
 */
internal object OtaBundleStore {

    /** 与 `packages/rn-app/app.json` 的 `name`（以及 `index.ts` 注册名）一致 */
    const val DEFAULT_ENTRY: String = "MainComponent"

    private const val ROOT_DIR = "ota"
    private const val BUNDLES_DIR = "bundles"
    private const val STAGING_DIR = "staging"
    private const val STATE_FILE = "state.json"
    private const val BUNDLE_FILE = "bundle.hbc"

    /** 指针里的一代包。 */
    data class Revision(
        val versionCode: Int,
        /** 服务端给的展示用版本号（如 `2.0.0`），仅用于日志 / 排查 */
        val version: String,
        /** `AppRegistry.registerComponent` 注册的组件名 */
        val entry: String,
        val md5: String,
    )

    /** 当前生效包。 */
    data class Active(val revision: Revision, val bundle: File)

    private fun root(context: Context): File = File(context.filesDir, ROOT_DIR)

    /**
     * 读当前生效包；状态文件缺失、包被清理 / 长度为 0 时返回 null。
     *
     * 返回 null 时调用方回落到 APK 内置的 `assets://index.android.bundle`。
     */
    fun active(context: Context): Active? {
        val revision = currentRevision(context) ?: return null
        val bundle = File(File(File(root(context), BUNDLES_DIR), revision.versionCode.toString()), BUNDLE_FILE)
        return if (bundle.isFile && bundle.length() > 0) Active(revision, bundle) else null
    }

    private fun currentRevision(context: Context): Revision? {
        val state = File(root(context), STATE_FILE)
        if (!state.isFile) return null
        return runCatching {
            val current = JSONObject(state.readText()).getJSONObject("current")
            Revision(
                versionCode = current.getInt("versionCode"),
                version = current.optString("version"),
                entry = current.optString("entry").ifEmpty { DEFAULT_ENTRY },
                md5 = current.optString("md5"),
            )
        }.getOrNull()
    }

    /** 下载中的临时文件（与 `bundles/` 同一分区，`renameTo` 才是原子替换）。 */
    fun stagingFile(context: Context, versionCode: Int): File {
        val dir = File(root(context), STAGING_DIR).apply { mkdirs() }
        val file = File(dir, "$versionCode.part")
        file.delete()
        return file
    }

    /** 校验通过后提交：落包 → 原子写指针（current ← 新版本，previous ← 老版本）→ 清理更老的包。 */
    fun commit(context: Context, revision: Revision, stagedFile: File) {
        val targetDir = File(File(root(context), BUNDLES_DIR), revision.versionCode.toString()).apply { mkdirs() }
        val target = File(targetDir, BUNDLE_FILE)
        if (target.exists()) target.delete()
        check(stagedFile.renameTo(target)) {
            "OTA 包落盘失败：${stagedFile.absolutePath} → ${target.absolutePath}"
        }

        val previous = currentRevision(context)
        writeState(context, current = revision, previous = previous)
        prune(context, keep = setOfNotNull(revision.versionCode, previous?.versionCode))
    }

    private fun writeState(context: Context, current: Revision, previous: Revision?) {
        val state = JSONObject().put("current", current.toJson())
        if (previous != null) state.put("previous", previous.toJson())

        val root = root(context)
        val pointer = File(root, STATE_FILE)
        val temp = File(root, "$STATE_FILE.tmp")
        temp.writeText(state.toString())
        if (pointer.exists()) pointer.delete()
        check(temp.renameTo(pointer)) { "OTA 状态写入失败：${pointer.absolutePath}" }
    }

    /** 只留 current / previous，避免历史包占满用户磁盘。 */
    private fun prune(context: Context, keep: Set<Int>) {
        File(root(context), BUNDLES_DIR).listFiles()?.forEach { child ->
            val versionCode = child.name.toIntOrNull()
            if (child.isDirectory && versionCode != null && versionCode !in keep) {
                child.deleteRecursively()
            }
        }
        File(root(context), STAGING_DIR).listFiles()?.forEach { it.deleteRecursively() }
    }

    private fun Revision.toJson(): JSONObject = JSONObject()
        .put("versionCode", versionCode)
        .put("version", version)
        .put("entry", entry)
        .put("md5", md5)
}
