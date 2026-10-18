package com.qianrenni.crossterm

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.qianrenni.crossterm.ota.OtaBundleStore

/**
 * 宿主容器主 Activity。
 *
 * `mainComponentName` 必须与 RN 侧 `AppRegistry.registerComponent` 注册的名字一致
 * （`packages/rn-app/app.json` 的 `name`，当前为 `MainComponent`）。
 * 走 OTA 包时以包内记录的 `entry` 为准（服务端发布时可改），读不到则回落默认值。
 */
class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String {
        if (BuildConfig.DEBUG) return OtaBundleStore.DEFAULT_ENTRY
        return OtaBundleStore.active(this)?.revision?.entry ?: OtaBundleStore.DEFAULT_ENTRY
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
