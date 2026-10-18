# Android 容器壳（Kotlin + RN 0.87.1）

原生宿主只做三件事：**起 RN 运行时、决定加载哪份 Bundle、把宿主能力桥给 JS**。
业务 UI 全部在 `packages/rn-app`，通过 Metro（调试）或 OTA（线上）下发。

## Bundle 从哪来

| 场景      | 来源                                                          | 判定条件                                                |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| 本地调试  | **Metro**（`pnpm start:rn`）                                  | `BuildConfig.DEBUG == true`                             |
| 线上      | **OTA 已下载包** `filesDir/ota/bundles/<versionCode>/bundle.hbc` | release + `state.json` 里有可用包                        |
| 兜底      | APK 内置 `assets://index.android.bundle`                       | 首次安装 / 还没拉到更新 / 包被判定不可用                 |

- 冷启动时 `MainApplication` **同步**读一次 `state.json`（只读一个小 JSON），把路径交给
  `DefaultReactHost.getDefaultReactHost(jsBundleFilePath = …)`；读不到就传 `null` 走内置 assets。
- 同时起一个后台线程跑 `OtaUpdater.syncAsync`：拉 manifest → 比 `versionCode` → 查
  `binaryVersionRange` / 灰度 → 下载 → 校验 `size` + `md5` → 原子落盘。
- **新包在下次冷启动生效**（`JSBundleLoader` 在创建 `ReactHost` 时就固定了）。

## 本地存储布局

```
filesDir/ota/
├── bundles/<versionCode>/bundle.hbc   # current / previous 各一份
├── staging/<versionCode>.part         # 下载中，校验通过才移入 bundles/
└── state.json                         # {"current": {…}, "previous": {…}}
```

先落包、再写指针（临时文件 + rename 原子替换），所以「指针存在 ⇒ 包完整」。

## 配置（`android/gradle.properties` → `BuildConfig`）

| 属性                    | 默认值                  | 说明                                                   |
| ----------------------- | ----------------------- | ------------------------------------------------------ |
| `OTA_ENABLED`           | `true`                  | 关掉就只跑内置 assets bundle                            |
| `OTA_MANIFEST_BASE_URL` | `http://10.0.2.2:8080`  | 后端地址；`10.0.2.2` 是模拟器访问宿主机；生产换 CDN https |
| `OTA_APP_KEY`           | `guga_app`              | 与发布时一致                                            |
| `OTA_RENDERER`          | `react_native`          | 渲染形态                                                |

manifest 地址：`{base}/ota/{appKey}/android/{versionCode}/{renderer}/manifest.json`
（`versionCode` 取 `BuildConfig.VERSION_CODE`，当前为 1）。

> release 包默认禁明文 HTTP，`res/xml/network_security_config.xml` 只给
> `10.0.2.2` / `localhost` / `127.0.0.1` 开了口子，方便本地联调；生产请用 https。

## 端到端验证

```powershell
# 1) 起后端（另开一个终端）
cd backend; $env:OTA_DATA_DIR="data"; $env:SERVER_URL="http://10.0.2.2:8080"; .\gradlew.bat run

# 2) 改一行 JS，打个新包并发布（versionCode 由服务端自增）
#    packages/rn-app/App.tsx 里 BUILD_MARKER 改成 build-2
pnpm build:bundle -- --version 2.0.0
pnpm publish:bundle

# 3) 用 Android Studio 跑 release（或 debug 里临时把 OTA 生效条件改成 true）
#    第一次启动：拉 manifest → 下载 → 日志 OtaUpdater: 新包已就绪
#    杀掉重开：页面上的「构建标记」变成 build-2
```

日志过滤：`adb logcat -s OtaUpdater`。

## 已知边界

- **崩溃回滚未做**（ROADMAP 步骤 7）：`state.json` 已预留 `previous`，但还没接
  「首屏成功回调 + 连续启动失败计数」。
- **`fingerprint` 未校验**：原生依赖变了但 OTA 包没重打，会出现「能下载、一加载就崩」，
  P2 与 CI 联动时补。
- 灰度分桶用 `androidId + versionCode` 稳定散列，命中结果不随重启变化。
