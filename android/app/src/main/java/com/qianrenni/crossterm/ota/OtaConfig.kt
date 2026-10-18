package com.qianrenni.crossterm.ota

import com.qianrenni.crossterm.BuildConfig

/**
 * OTA 客户端配置。
 *
 * 全部来自编译期注入（`android/gradle.properties` → `buildConfigField`），
 * 换环境只改 properties，不动代码。
 *
 * manifest 地址与服务端约定一致：
 * `{base}/ota/{appKey}/{platform}/{binaryVersion}/{renderer}/manifest.json`
 */
data class OtaConfig(
    val manifestBaseUrl: String,
    val appKey: String,
    val platform: String,
    val renderer: String,
    /** 原生包 versionCode；服务端用它挑兼容的 manifest，客户端上报的就是它 */
    val binaryVersion: Int,
    val connectTimeoutMs: Int = 3_000,
    val readTimeoutMs: Int = 10_000,
) {
    val manifestUrl: String
        get() = "${manifestBaseUrl.trimEnd('/')}/ota/$appKey/$platform/$binaryVersion/$renderer/manifest.json"

    companion object {
        fun fromBuildConfig(): OtaConfig = OtaConfig(
            manifestBaseUrl = BuildConfig.OTA_MANIFEST_BASE_URL,
            appKey = BuildConfig.OTA_APP_KEY,
            platform = "android",
            renderer = BuildConfig.OTA_RENDERER,
            binaryVersion = BuildConfig.VERSION_CODE,
        )
    }
}
