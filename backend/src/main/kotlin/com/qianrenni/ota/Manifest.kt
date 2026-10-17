package com.qianrenni.ota

import kotlinx.serialization.Serializable

/** 该产物兼容的原生 App 版本区间（含两端）。 */
@Serializable
data class BinaryVersionRange(val min: Int, val max: Int)

/**
 * 灰度策略。
 *
 * P1 只实现按比例灰度（[percent] 0~100）；后续可扩展为按用户分组 / 白名单。
 */
@Serializable
data class Rollout(
    val strategy: String = "percentage",
    val percent: Int = 100,
)

/** 产物下载信息。 */
@Serializable
data class BundleArtifact(
    val url: String,
    val md5: String,
    val size: Long,
)

/**
 * 客户端「检查更新」拉取的 **静态 manifest**。
 *
 * 发布时预生成并落盘，生产环境把该目录整体托管到 CDN/对象存储——
 * 客户端拉的是静态资源而非每次都打后端 API，这是支撑大规模启动请求的关键（CDN-first）。
 */
@Serializable
data class Manifest(
    val appKey: String,
    val platform: String,
    val renderer: String,
    val version: String,
    val versionCode: Int,
    val binaryVersionRange: BinaryVersionRange,
    val fingerprint: String = "",
    val bundle: BundleArtifact,
    val rollout: Rollout = Rollout(),
    val createdAt: String,
)

/** 一次发布的元数据（落盘为 `release.json`，是发版的权威记录）。 */
@Serializable
data class ReleaseMeta(
    val appKey: String,
    val platform: String,
    val renderer: String,
    val version: String,
    val versionCode: Int,
    val binaryVersionRange: BinaryVersionRange,
    val fingerprint: String = "",
    /** h5：包内入口相对路径；rn：注册的 component 名 */
    val entry: String = "",
    val description: String = "",
    val rollout: Rollout = Rollout(),
    val md5: String,
    val size: Long,
    val fileName: String,
    val createdAt: String,
    /** 同 (appKey, platform, renderer) 下只允许一个生效版本 */
    val active: Boolean = false,
)

/** 统一错误响应。 */
@Serializable
data class ErrorResponse(val code: Int = 1, val message: String)
