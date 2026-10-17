package com.qianrenni.ota

import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.PartData
import io.ktor.http.content.forEachPart
import io.ktor.server.application.ApplicationCall
import io.ktor.server.request.receiveMultipart
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.utils.io.readAvailable
import kotlinx.serialization.Serializable
import java.io.File
import kotlin.io.path.createTempFile

/** 发布成功后的响应：元数据 + 可直接给客户端/二维码使用的 manifest 地址。 */
@Serializable
data class PublishResponse(
    val release: ReleaseMeta,
    val manifestUrl: String,
)

/** 管理端令牌校验；未配置令牌时放行（仅本地开发）。 */
private suspend fun ApplicationCall.ensureAdmin(config: OtaConfig): Boolean {
    val expected = config.adminToken ?: return true
    val provided = request.headers[HttpHeaders.Authorization]
        ?.removePrefix("Bearer ")
        ?.trim()
    if (provided == expected) return true
    respond(HttpStatusCode.Unauthorized, ErrorResponse(code = 401, message = "管理接口未授权"))
    return false
}

/**
 * 发版路由。
 *
 * | 方法 | 路径 | 鉴权 | 说明 |
 * | ---- | ---- | ---- | ---- |
 * | POST | `/admin/releases` | 管理令牌 | 上传产物并发布（multipart） |
 * | GET  | `/admin/releases?appKey=` | 管理令牌 | 发布历史 |
 * | POST | `/admin/releases/activate` | 管理令牌 | 切生效版本（发布/回滚） |
 * | GET  | `/api/releases/active` | 无 | 当前生效版本（客户端兜底/排查用） |
 */
fun Route.otaRoutes(store: ReleaseStore, config: OtaConfig) {
    route("/admin/releases") {
        // POST /admin/releases - 上传产物并发布
        post {
            if (!call.ensureAdmin(config)) return@post

            var appKey: String? = null
            var platform: String? = null
            var renderer: String? = null
            var version: String? = null
            var entry: String? = null
            var description: String? = null
            var minBinaryVersion: String? = null
            var maxBinaryVersion: String? = null
            var fingerprint: String? = null
            var rollout: String? = null
            var fileName: String? = null
            var upload: File? = null

            // formFieldLimit 需覆盖包体积：解析器在以包体积为界的扫描缓冲内寻找分隔符
            val multipart = call.receiveMultipart(formFieldLimit = config.maxBundleBytes)
            multipart.forEachPart { part ->
                when (part) {
                    is PartData.FormItem -> when (part.name) {
                        "appKey" -> appKey = part.value
                        "platform" -> platform = part.value
                        "renderer" -> renderer = part.value
                        "version" -> version = part.value
                        "entry" -> entry = part.value
                        "description" -> description = part.value
                        "minBinaryVersion" -> minBinaryVersion = part.value
                        "maxBinaryVersion" -> maxBinaryVersion = part.value
                        "fingerprint" -> fingerprint = part.value
                        "rollout" -> rollout = part.value
                    }

                    is PartData.FileItem -> if (part.name == "file") {
                        fileName = part.originalFileName
                        val temp = createTempFile("ota_upload", "tmp").toFile()
                        // 手动流式落盘：Ktor 3 的 ByteReadChannel 直接读，不引入额外 bytecode
                        temp.outputStream().use { out ->
                            val buffer = ByteArray(64 * 1024)
                            val channel = part.provider()
                            while (true) {
                                val read = channel.readAvailable(buffer, 0, buffer.size)
                                if (read <= 0) break
                                out.write(buffer, 0, read)
                            }
                        }
                        upload = temp
                    }

                    else -> {}
                }
                part.release()
            }

            val content = upload ?: throw IllegalArgumentException("包文件不能为空（字段名 file）")
            try {
                val meta = store.publish(
                    PublishRequest(
                        appKey = requireNotNull(appKey) { "appKey 不能为空" },
                        platform = requireNotNull(platform) { "platform 不能为空" },
                        renderer = requireNotNull(renderer) { "renderer 不能为空" },
                        version = version,
                        entry = requireNotNull(entry) { "entry 不能为空" },
                        description = description.orEmpty(),
                        minBinaryVersion = requireNotNull(minBinaryVersion) { "minBinaryVersion 不能为空" }
                            .toIntOrNull() ?: throw IllegalArgumentException("minBinaryVersion 非法"),
                        maxBinaryVersion = requireNotNull(maxBinaryVersion) { "maxBinaryVersion 不能为空" }
                            .toIntOrNull() ?: throw IllegalArgumentException("maxBinaryVersion 非法"),
                        fingerprint = fingerprint.orEmpty(),
                        rolloutPercent = rollout?.toIntOrNull() ?: 100,
                        originalFileName = fileName,
                        content = content,
                    )
                )
                call.respond(
                    HttpStatusCode.Created,
                    PublishResponse(
                        release = meta,
                        manifestUrl = manifestUrl(config, meta, meta.binaryVersionRange.max),
                    ),
                )
            } finally {
                // 已复制进产物目录，清理上传临时文件，避免堆积
                content.delete()
            }
        }

        // GET /admin/releases?appKey= - 发布历史
        get {
            if (!call.ensureAdmin(config)) return@get
            call.respond(store.list(call.request.queryParameters["appKey"]))
        }

        // POST /admin/releases/activate?appKey=&platform=&renderer=&versionCode= - 切生效版本
        post("/activate") {
            if (!call.ensureAdmin(config)) return@post
            val appKey = call.request.queryParameters["appKey"]
                ?: throw IllegalArgumentException("appKey 不能为空")
            val platform = call.request.queryParameters["platform"]
                ?: throw IllegalArgumentException("platform 不能为空")
            val renderer = call.request.queryParameters["renderer"]
                ?: throw IllegalArgumentException("renderer 不能为空")
            val versionCode = call.request.queryParameters["versionCode"]?.toIntOrNull()
                ?: throw IllegalArgumentException("versionCode 非法")
            call.respond(store.activate(appKey, platform, renderer, versionCode))
        }
    }

    // GET /api/releases/active?appKey=&platform=&renderer= - 当前生效版本（无需鉴权）
    get("/api/releases/active") {
        val appKey = call.request.queryParameters["appKey"]
            ?: throw IllegalArgumentException("appKey 不能为空")
        val platform = call.request.queryParameters["platform"]
            ?: throw IllegalArgumentException("platform 不能为空")
        val renderer = call.request.queryParameters["renderer"]
            ?: throw IllegalArgumentException("renderer 不能为空")
        val meta = store.active(appKey, platform, renderer)
            ?: throw IllegalArgumentException("暂无生效版本")
        call.respond(meta)
    }
}

private fun manifestUrl(config: OtaConfig, meta: ReleaseMeta, binaryVersion: Int): String =
    "${config.serverUrl}/ota/${meta.appKey}/${meta.platform}/$binaryVersion/${meta.renderer}/manifest.json"
