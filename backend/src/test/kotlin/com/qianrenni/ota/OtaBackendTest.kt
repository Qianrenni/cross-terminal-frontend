package com.qianrenni.ota

import io.ktor.client.request.forms.MultiPartFormDataContent
import io.ktor.client.request.forms.formData
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.Json
import java.io.File
import java.security.MessageDigest
import kotlin.io.path.createTempDirectory
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * 发版后端端到端测试：发布 → 静态 manifest → 切换/回滚。
 *
 * 全程走真实 HTTP（testApplication），覆盖 multipart 上传与静态文件服务两条链路。
 */
class OtaBackendTest {

    private val json = Json { ignoreUnknownKeys = true }

    private fun newConfig(): OtaConfig = OtaConfig(
        dataDir = createTempDirectory("ota-test").toFile(),
        host = "0.0.0.0",
        port = 0,
        serverUrl = "http://localhost:8080",
        adminToken = "test-token",
        maxBundleBytes = 8L * 1024 * 1024,
    )

    private fun md5(bytes: ByteArray): String =
        MessageDigest.getInstance("MD5").digest(bytes).joinToString("") { "%02x".format(it) }

    private fun uploadBody(
        bytes: ByteArray,
        fileName: String,
        version: String,
        renderer: String = "react_native",
        min: String = "1",
        max: String = "3",
    ) = MultiPartFormDataContent(
        formData {
            append("appKey", "guga_app")
            append("platform", "android")
            append("renderer", renderer)
            append("version", version)
            append("entry", "MainComponent")
            append("minBinaryVersion", min)
            append("maxBinaryVersion", max)
            append("rollout", "100")
            append(
                "file",
                bytes,
                Headers.build {
                    append(HttpHeaders.ContentDisposition, "filename=\"$fileName\"")
                },
            )
        },
    )

    @Test
    fun `发布生成静态 manifest 且支持切换回滚`() = testApplication {
        val config = newConfig()
        application { module(config) }
        val token = "Bearer test-token"

        // 1) 发布 v1（versionCode = 1）
        val v1Bytes = "var version = 1;".toByteArray()
        val publish1 = client.post("/admin/releases") {
            header(HttpHeaders.Authorization, token)
            setBody(uploadBody(v1Bytes, "index.android.bundle", "1.0.0"))
        }
        assertEquals(HttpStatusCode.Created, publish1.status, publish1.bodyAsText())
        val release1 = json.decodeFromString<PublishResponse>(publish1.bodyAsText()).release
        assertEquals(1, release1.versionCode)

        // 2) 客户端按「原生版本 2」拉取静态 manifest
        val manifestPath = "/ota/guga_app/android/2/react_native/manifest.json"
        val manifestResp = client.get(manifestPath)
        assertEquals(HttpStatusCode.OK, manifestResp.status)
        val manifest1 = json.decodeFromString<Manifest>(manifestResp.bodyAsText())
        assertEquals(1, manifest1.versionCode)
        assertEquals("1.0.0", manifest1.version)
        assertEquals(md5(v1Bytes), manifest1.bundle.md5)
        assertEquals(v1Bytes.size.toLong(), manifest1.bundle.size)

        // 3) 产物可被下载
        val artifactPath = manifest1.bundle.url.substringAfter(config.serverUrl)
        val artifactResp = client.get(artifactPath)
        assertEquals(HttpStatusCode.OK, artifactResp.status)

        // 4) 发布 v2（versionCode = 2），manifest 自动指向 v2
        val v2Bytes = "var version = 2;".toByteArray()
        val publish2 = client.post("/admin/releases") {
            header(HttpHeaders.Authorization, token)
            setBody(uploadBody(v2Bytes, "index.android.bundle", "2.0.0"))
        }
        assertEquals(HttpStatusCode.Created, publish2.status, publish2.bodyAsText())
        val manifest2 = json.decodeFromString<Manifest>(client.get(manifestPath).bodyAsText())
        assertEquals(2, manifest2.versionCode)
        assertEquals(md5(v2Bytes), manifest2.bundle.md5)

        // 5) 回滚到 v1：manifest 重新指向 v1
        val activate = client.post(
            "/admin/releases/activate?appKey=guga_app&platform=android&renderer=react_native&versionCode=1",
        ) { header(HttpHeaders.Authorization, token) }
        assertEquals(HttpStatusCode.OK, activate.status, activate.bodyAsText())
        val manifest3 = json.decodeFromString<Manifest>(client.get(manifestPath).bodyAsText())
        assertEquals(1, manifest3.versionCode, "回滚后 manifest 应指回 v1")
        assertEquals(md5(v1Bytes), manifest3.bundle.md5)

        // 6) 管理端可查发布历史
        val list = client.get("/admin/releases") { header(HttpHeaders.Authorization, token) }
        assertEquals(HttpStatusCode.OK, list.status)
        assertTrue(list.bodyAsText().contains("2.0.0"))
    }

    @Test
    fun `未授权与非法渲染形态会被拒绝`() = testApplication {
        val config = newConfig()
        application { module(config) }

        // 无令牌 → 401
        val unauthorized = client.post("/admin/releases") {
            setBody(uploadBody("x".toByteArray(), "index.bundle", "1.0.0"))
        }
        assertEquals(HttpStatusCode.Unauthorized, unauthorized.status)

        // 未知渲染形态 → 400
        val badRenderer = client.post("/admin/releases") {
            header(HttpHeaders.Authorization, "Bearer test-token")
            setBody(
                uploadBody(
                    "x".toByteArray(),
                    "index.bundle",
                    "1.0.0",
                    renderer = "flutter",
                )
            )
        }
        assertEquals(HttpStatusCode.BadRequest, badRenderer.status)
        assertTrue(badRenderer.bodyAsText().contains("renderer"))
    }

    @Test
    fun `超过 1MB 的产物也能正常发布`() = testApplication {
        // 回归：multipart 的 formFieldLimit 曾固定为 1MB，
        // 导致 1.4MB 的真实 Hermes Bundle 被拒（"Limit of 1048576 bytes exceeded"）。
        val config = newConfig()
        application { module(config) }

        val big = ByteArray(1_500_000) { (it % 251).toByte() }
        val response = client.post("/admin/releases") {
            header(HttpHeaders.Authorization, "Bearer test-token")
            setBody(uploadBody(big, "index.android.bundle", "1.0.0", max = "5"))
        }
        assertEquals(HttpStatusCode.Created, response.status, response.bodyAsText())

        val manifest = json.decodeFromString<Manifest>(
            client.get("/ota/guga_app/android/1/react_native/manifest.json").bodyAsText(),
        )
        assertEquals(big.size.toLong(), manifest.bundle.size)
        assertEquals(md5(big), manifest.bundle.md5)
    }
}
