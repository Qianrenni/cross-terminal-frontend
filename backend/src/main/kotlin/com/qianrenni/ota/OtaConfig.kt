package com.qianrenni.ota

import java.io.File

/**
 * 发版后端配置，全部来自环境变量（静态敏感项不入动态配置区）。
 */
data class OtaConfig(
    /** 发版数据根目录：产物 / 元数据 / manifest 都落在这里 */
    val dataDir: File,
    val host: String,
    val port: Int,
    /** 对外访问地址，用于拼装 manifest 里的产物 URL */
    val serverUrl: String,
    /** 管理端令牌；为空表示不鉴权（仅本地开发） */
    val adminToken: String?,
    val maxBundleBytes: Long,
) {
    companion object {
        private fun env(key: String): String? = System.getenv(key)?.takeIf { it.isNotBlank() }

        fun fromEnv(): OtaConfig = OtaConfig(
            dataDir = File(env("OTA_DATA_DIR") ?: "data"),
            host = env("HOST") ?: "0.0.0.0",
            port = env("PORT")?.toIntOrNull() ?: 8080,
            serverUrl = (env("SERVER_URL") ?: "http://localhost:8080").trimEnd('/'),
            adminToken = env("ADMIN_TOKEN"),
            maxBundleBytes = (env("MAX_BUNDLE_MB")?.toLongOrNull() ?: 64L) * 1024 * 1024,
        )
    }
}
