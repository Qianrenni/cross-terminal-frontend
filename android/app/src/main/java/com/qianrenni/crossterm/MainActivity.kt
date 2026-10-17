package com.qianrenni.crossterm

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * 宿主容器主 Activity。
 *
 * `mainComponentName` 必须与 RN 侧 `AppRegistry.registerComponent` 注册的名字一致
 * （`packages/rn-app/app.json` 的 `name`，当前为 `MainComponent`）。
 */
class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "MainComponent"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
