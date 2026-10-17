package com.qianrenni.ota

import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.http.content.staticFiles
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.autohead.AutoHeadResponse
import io.ktor.server.plugins.calllogging.CallLogging
import io.ktor.server.plugins.compression.Compression
import io.ktor.server.plugins.compression.gzip
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.defaultheaders.DefaultHeaders
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import kotlinx.serialization.json.Json

fun main() {
    val config = OtaConfig.fromEnv()
    embeddedServer(Netty, port = config.port, host = config.host) { module(config) }
        .start(wait = true)
}

/**
 * 发版后端应用装配。
 *
 * 对外三条通道：
 * - `/ota` 前缀       —— 预生成的静态 manifest（生产环境整目录交给 CDN）
 * - `/ota-files` 前缀 —— 产物文件（生产环境交给对象存储 + CDN）
 * - `/admin` 前缀     —— 管理端上传 / 发布 / 回滚
 */
fun Application.module(config: OtaConfig = OtaConfig.fromEnv()) {
    val store = ReleaseStore(config)
    // 先触发目录创建，避免静态路由指向不存在的目录
    store.manifestsDir.mkdirs()
    store.filesDir.mkdirs()

    install(ContentNegotiation) {
        json(Json { prettyPrint = true; ignoreUnknownKeys = true; encodeDefaults = true })
    }
    install(DefaultHeaders)
    install(CallLogging)
    install(AutoHeadResponse)
    install(Compression) { gzip() }
    install(StatusPages) {
        exception<Throwable> { call, cause ->
            val message = cause.message ?: cause::class.simpleName ?: "未知错误"
            call.respond(HttpStatusCode.BadRequest, ErrorResponse(message = message))
        }
    }

    routing {
        get("/health") { call.respondText("ok") }

        // CDN-first：发布时预生成的静态 manifest
        staticFiles("/ota", store.manifestsDir)
        // 产物文件（生产环境应由对象存储/CDN 承担）
        staticFiles("/ota-files", store.filesDir)

        otaRoutes(store, config)
    }
}
