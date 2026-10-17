package com.qianrenni.crossterm

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

/**
 * 宿主容器 Application。
 *
 * P1 阶段只承接 RN 引擎；后续卡片 DSL / H5 / 小程序引擎在此注册（见 PLAN.md 容器层）。
 */
class MainApplication : Application(), ReactApplication {

    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
            context = applicationContext,
            packageList = PackageList(this).packages.apply {
                // 无法自动链接的 Package 在此手动添加
            },
        )
    }

    override fun onCreate() {
        super.onCreate()
        loadReactNative(this)
    }
}
