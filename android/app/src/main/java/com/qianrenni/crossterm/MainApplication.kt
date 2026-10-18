package com.qianrenni.crossterm

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.qianrenni.crossterm.ota.OtaBundleStore
import com.qianrenni.crossterm.ota.OtaUpdater

/**
 * 宿主容器 Application。
 *
 * Bundle 来源优先级：
 * 1. **OTA 已下载包**（`filesDir/ota/bundles/<versionCode>/bundle.hbc`）——release 构建生效；
 * 2. APK 内置的 `assets://index.android.bundle`——首次安装 / 还没来得及拉更新的兜底；
 * 3. debug 构建固定走 Metro（`jsBundleFilePath = null`），避免本地调试被旧包带偏。
 *
 * 冷启动时同时在后台线程检查更新；下载并校验通过后写「生效指针」，**下次冷启动**切到新包。
 */
class MainApplication : Application(), ReactApplication {

    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
            context = applicationContext,
            packageList = PackageList(this).packages.apply {
                // 无法自动链接的 Package 在此手动添加
            },
            jsBundleFilePath = resolveOtaBundlePath(),
        )
    }

    override fun onCreate() {
        super.onCreate()
        loadReactNative(this)
        if (BuildConfig.OTA_ENABLED) {
            OtaUpdater.syncAsync(this)
        }
    }

    /**
     * 有 OTA 包就返回其绝对路径（`JSBundleLoader.createFileLoader`），否则返回 null 走内置 assets。
     *
     * 这里**同步读磁盘**（只读一个小 JSON），不能做网络请求——ReactHost 是在主线程创建的。
     */
    private fun resolveOtaBundlePath(): String? {
        if (BuildConfig.DEBUG) return null
        return OtaBundleStore.active(this)?.bundle?.absolutePath
    }
}
