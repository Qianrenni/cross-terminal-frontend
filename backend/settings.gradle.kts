rootProject.name = "ota-backend"

pluginManagement {
    repositories {
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositories {
        mavenCentral()
    }
    versionCatalogs {
        // 官方 Ktor 版本目录：提供 server.* / serialization.* 等受管别名
        create("ktorLibs").from("io.ktor:ktor-version-catalog:3.5.0")
    }
}

// 本机 JDK 过新时，自动按 toolchain 下载合适的 JDK
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}
