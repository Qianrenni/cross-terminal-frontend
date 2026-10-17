# OTA 发版后端（Ktor）

统一动态发版系统的**服务端**。负责产物（RN Bundle / 卡片模板 / H5 离线包 / 小程序包）的
上传、版本管理、静态 manifest 预生成、灰度与回滚。

- **技术栈**：Ktor 3.5（Kotlin/JVM 21）+ Netty
- **构建**：Gradle Wrapper（`./gradlew`，Gradle 9.4.1），版本由 `gradle/libs.versions.toml` 统一管理
- **存储**：**不依赖数据库**，产物 / 元数据 / manifest 全部落盘（P1 刻意从简）

## 快速开始

```powershell
cd backend

# 开发环境（无需鉴权）
$env:OTA_DATA_DIR = "data"
$env:SERVER_URL   = "http://localhost:8080"
.\gradlew.bat run
```

```powershell
.\gradlew.bat test      # 端到端测试：发布 → manifest → 回滚
```

## 配置（环境变量）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `OTA_DATA_DIR` | `data` | 发版数据根目录 |
| `HOST` / `PORT` | `0.0.0.0` / `8080` | 监听地址 |
| `SERVER_URL` | `http://localhost:8080` | 对外地址，用于拼装 manifest 里的产物 URL |
| `ADMIN_TOKEN` | 空（不鉴权） | 管理端令牌；设置后 `/admin/**` 需 `Authorization: Bearer <token>` |
| `MAX_BUNDLE_MB` | `64` | 单包体积上限 |

## 接口

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| `GET` | `/health` | 无 | 健康检查 |
| `GET` | `/ota/{appKey}/{platform}/{binaryVersion}/{renderer}/manifest.json` | 无 | **客户端检查更新**（预生成静态文件，可整体交给 CDN） |
| `GET` | `/ota-files/{appKey}/{platform}/{renderer}/{versionCode}/{file}` | 无 | 产物下载（生产环境交给对象存储 + CDN） |
| `POST` | `/admin/releases` | 管理令牌 | 上传产物并发布（multipart） |
| `GET` | `/admin/releases?appKey=` | 管理令牌 | 发布历史 |
| `POST` | `/admin/releases/activate?appKey=&platform=&renderer=&versionCode=` | 管理令牌 | 切生效版本（发布验证 / 回滚） |
| `GET` | `/api/releases/active?appKey=&platform=&renderer=` | 无 | 当前生效版本（兜底 / 排查） |

### 渲染形态（`renderer`）

`react_native` / `h5` / `native_card` / `miniprogram`

> `native` 页面随 APK 发布，不参与 OTA，因此不在枚举内。

### Manifest 结构

```json
{
  "appKey": "guga_app",
  "platform": "android",
  "renderer": "react_native",
  "version": "2.0.0",
  "versionCode": 2,
  "binaryVersionRange": { "min": 1, "max": 3 },
  "fingerprint": "",
  "bundle": {
    "url": "http://localhost:8080/ota-files/guga_app/android/react_native/2/bundle.bundle",
    "md5": "9c8f...",
    "size": 1234567
  },
  "rollout": { "strategy": "percentage", "percent": 100 },
  "createdAt": "2026-10-12T10:00:00Z"
}
```

`binaryVersionRange` 声明该产物兼容的**原生 App versionCode** 区间；客户端据此跳过不兼容的更新。

## 发布示例

```powershell
curl.exe -X POST http://localhost:8080/admin/releases `
  -H "Authorization: Bearer <ADMIN_TOKEN>" `
  -F "appKey=guga_app" -F "platform=android" -F "renderer=react_native" `
  -F "version=2.0.0" -F "entry=MainComponent" `
  -F "minBinaryVersion=1" -F "maxBinaryVersion=3" -F "rollout=100" `
  -F "file=@packages/rn-app/build/index.android.bundle"
```

回滚：

```powershell
curl.exe -X POST "http://localhost:8080/admin/releases/activate?appKey=guga_app&platform=android&renderer=react_native&versionCode=1" `
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

## 存储布局

```
data/
├── files/{appKey}/{platform}/{renderer}/{versionCode}/bundle.{ext}          # 产物
├── releases/{appKey}/{platform}/{renderer}/{versionCode}/release.json       # 元数据（权威记录）
└── manifests/{appKey}/{platform}/{binaryVersion}/{renderer}/manifest.json   # 预生成静态 manifest
```

**设计要点**

- 版本号**由服务端分配**（同 `appKey/platform/renderer` 内 `max + 1`），客户端无法伪造版本倒退。
- 所有写入**先写临时文件再改名**，进程被杀不会留下半截 JSON。
- 发布即生效并**重生成静态 manifest**；`activate` 用于灰度验证后的"切正式"与出问题回滚。
- 重生成时先清空 `manifests/{appKey}/{platform}` 整目录，避免旧 manifest 残留导致客户端拿到过期版本。
