plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(ktorLibs.plugins.ktor)
    alias(libs.plugins.kotlin.serialization)
}

group = "com.qianrenni"
version = "1.0.0-SNAPSHOT"

application {
    mainClass = "com.qianrenni.ota.ApplicationKt"
}

kotlin {
    jvmToolchain(21)
}

dependencies {
    implementation(ktorLibs.server.core)
    implementation(ktorLibs.server.netty)
    implementation(ktorLibs.server.contentNegotiation)
    implementation(ktorLibs.serialization.kotlinx.json)
    implementation(ktorLibs.server.statusPages)
    implementation(ktorLibs.server.callLogging)
    implementation(ktorLibs.server.compression)
    implementation(ktorLibs.server.autoHeadResponse)
    implementation(ktorLibs.server.cachingHeaders)
    implementation(ktorLibs.server.conditionalHeaders)
    implementation(ktorLibs.server.defaultHeaders)
    implementation(ktorLibs.server.cors)

    implementation(libs.logback.classic)

    testImplementation(kotlin("test"))
    testImplementation(ktorLibs.server.testHost)
}

tasks.test {
    // 测试使用独立的临时数据目录，避免触碰真实发版数据
    environment("OTA_DATA_DIR", layout.buildDirectory.dir("test-data").get().asFile.absolutePath)
    environment("ADMIN_TOKEN", "test-token")
    testLogging {
        events("passed", "skipped", "failed")
    }
}
