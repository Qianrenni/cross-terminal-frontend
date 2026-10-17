# scripts

构建与发布脚本。全部是零依赖的 Node ESM 脚本（Node ≥ 20，使用内置 `fetch` / `FormData` / `Blob`）。

## 提交信息校验（git 钩子用）

`verify-commit-msg.mjs` 由 `.husky/commit-msg` 调用，强制提交信息格式：

```text
[改动][影响] 摘要

# 例：
[design][button] 三层 token 改成字典，圆角按高度算
```

- `Merge` / `Revert` / `fixup!` / `squash!` 开头自动放行；
- 首行 ≤ 100 字符；
- 手动验证：`node scripts/verify-commit-msg.mjs <某个文件>`

## 一条命令构建 + 发布

```powershell
# 1) 构建 Hermes Bundle（产物在 packages/rn-app/dist/）
node scripts/build-bundle.mjs --version 2.0.0

# 2) 发布到发版后端
$env:OTA_SERVER_URL  = "http://localhost:8080"
$env:OTA_ADMIN_TOKEN = "dev-token"      # 后端未配 ADMIN_TOKEN 时可省略
node scripts/publish-bundle.mjs
```

也可以从 RN 工程里调用（推荐）：

```powershell
cd packages/rn-app
pnpm run build:bundle -- --version 2.0.0
pnpm run publish:bundle
```

## build-bundle.mjs

```
node scripts/build-bundle.mjs [选项]

  --version <semver>        发布版本号（默认取 rn-app/package.json 的 version）
  --platform <android|ios>  目标平台（默认 android）
  --dev <true|false>        是否 dev 包（默认 false）
  --appKey <key>            页面包标识（默认 guga_app）
  --entry <name>            RN 根组件名（默认 MainComponent，须与 index.js 注册名一致）
  --minBinaryVersion <n>    兼容的原生 versionCode 下界（默认 1）
  --maxBinaryVersion <n>    兼容的原生 versionCode 上界（默认 20，区间跨度上限 200）
  --rollout <0-100>         灰度百分比（默认 100）
```

流程：`react-native bundle` → `hermesc -O -emit-binary` → 计算 MD5 / 体积 → 写 `dist/release.json`。

> `hermesc` 的位置随 RN 版本与包管理器布局变化：**RN 0.87+** 在独立包 `hermes-compiler/hermesc/<platform>-bin/`，
> 更早版本在 `react-native/sdks/hermesc/<platform>-bin/`；另外 **pnpm workspace 会把依赖 hoist 到仓库根**。
> 脚本从 `packages/rn-app` 起逐级向上查找 `node_modules`，命中即用。
> 若都找不到，会保留 JS 源包并告警——**Hermes 开启的 App 无法加载 JS 源包**，请确保使用 Hermes 产物。

## publish-bundle.mjs

把 `dist/release.json` 描述的产物以 multipart 提交到 `POST /admin/releases`。

| 环境变量          | 默认值                  | 说明                                        |
| ----------------- | ----------------------- | ------------------------------------------- |
| `OTA_SERVER_URL`  | `http://localhost:8080` | 后端地址                                    |
| `OTA_ADMIN_TOKEN` | 空                      | 管理令牌（后端配置了 `ADMIN_TOKEN` 时必填） |
| `OTA_DESCRIPTION` | 空                      | 发布说明                                    |
| `OTA_FINGERPRINT` | 空                      | 原生工程指纹（P2 启用）                     |

> **注意**：后端 `formFieldLimit` 必须 ≥ 包体积，否则大包会被拒。
> 本仓库已将其对齐 `MAX_BUNDLE_MB`（见 `backend/src/main/kotlin/com/qianrenni/ota/Routes.kt`）。
