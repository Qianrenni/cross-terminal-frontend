# @cross-terminal/rn-app

跨端容器的 **RN 业务工程**：产出可被 OTA 下发的 **Hermes Bundle**。

本工程**只负责产出 JS 侧产物**（`index.<platform>.bundle`），不包含 `android/`、`ios/` 原生工程——
原生宿主在仓库根的 `android/` 目录中独立构建，二者通过"Bundle 名 + 根组件名"解耦。

## 依赖版本

| 包                            | 版本           | 说明                                                                                        |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------------------- |
| `react-native`                | `0.87.1`       | ⚠️ 见下方「版本选择」——**0.86 及以下**的 gradle 插件依赖 foojay 0.5.0，在 Gradle 9.x 上会崩 |
| `react` / `react-dom`         | `^19.2.3`      | RN 0.87 的 peerDependency                                                                   |
| `react-native-web`            | `^0.21.4`      | Web 端复用同一份 `App.tsx`                                                                  |
| `vite`                        | `^8.3.4`       | Web 构建 / 开发服务器                                                                       |
| `@react-native-community/cli` | `20.2.0`       | RN 0.71 起 CLI 已拆包，需显式声明                                                           |
| `hermes-compiler`             | 随 RN 传递依赖 | RN 0.87 起 `hermesc` 移到该包（构建脚本会自动查找）                                         |

### 版本选择

`PLAN.md` 曾推荐 **RN 0.82.1 + RNOH 0.82.30**（为鸿蒙端一致）。但 0.82 的 gradle 插件
固定使用 foojay-resolver **0.5.0**，它引用了 Gradle 9.x 已移除的 `JvmVendorSpec.IBM_SEMERU`，
在 Gradle 9.x 上必然抛 `NoSuchFieldError`（除非本机已装 JDK 17）。

因此升级到 **0.87.1**（其 foojay 为 1.0.0）。代价：**鸿蒙（P2）需重新对齐 RNOH 版本**。

## 包管理器：pnpm workspace

本仓库是 **pnpm workspace 多包仓库**：`pnpm-workspace.yaml` / `.npmrc` / `pnpm-lock.yaml` 都在**仓库根目录**。

- 安装依赖：在**仓库根目录**执行 `pnpm install`（不要在子包内单独 install）
- 根 `.npmrc` 固定 `node-linker=hoisted`——pnpm 默认的符号链接结构会让 Metro 与 RN 原生构建脚本找不到传递依赖
- 组件库 `@cross-terminal/components` 以 `workspace:*` 链接进来；Metro 的 `watchFolders` 已指向仓库根

```powershell
# 在仓库根目录
pnpm install
pnpm --filter @cross-terminal/rn-app run start:rn
```

## 常用命令

| 命令                                         | 作用                                                                       |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| `pnpm run start:rn`                          | 启动 Metro 开发服务器（供原生宿主调试）                                    |
| `pnpm run start:web`                         | 启动 Web 开发服务器（Vite，默认 http://localhost:5173）                    |
| `pnpm run build:web`                         | 构建 Web 产物 → `dist/web/`                                                |
| `pnpm run build:bundle [-- --version x.y.z]` | 构建 **Hermes Bundle** → `dist/index.android.bundle` + `dist/release.json` |
| `pnpm run publish:bundle`                    | 把产物发布到发版后端                                                       |
| `pnpm run typecheck` / `typecheck:web`       | RN 侧 / Web 侧类型检查                                                     |

```powershell
pnpm run build:bundle -- --version 2.0.0   # 构建 Hermes Bundle
pnpm run publish:bundle                    # 发布到发版后端
```

## Web 端（react-native-web）

同一份 `App.tsx` 既跑原生也跑浏览器，靠 `vite.config.mts` 里的别名 `react-native` → `react-native-web` 实现。

> 配置用 `.mts` 而不是 `.ts`：本包没有 `"type": "module"`（加了会破坏 Metro 的 CJS 配置），
> 用 `.mts` 才能让 Vite 以 ESM 加载它，否则启动时会提示「ESM 语法被当 CJS 加载」。

- Web 入口：`web/main.tsx` + `web/index.html`
- 原生入口：`index.ts`（由原生容器 `startReactApplication` 拉起）
- 容器注入的 props 在 Web 端用 **URL query** 模拟：

  ```
  http://localhost:5173/?route=/rn/demo&appKey=guga_app&versionCode=2&dark=1
  ```

平台差异化文件按 `.web.tsx` / `.web.ts` 优先解析（当前尚未用到）。

## 验证 OTA 是否生效

改 `App.tsx` 里的 `BUILD_MARKER`（如 `'build-1'` → `'build-2'`），重新构建并发布；
App 冷启动拉到新包后，页面上的"构建标记"应随之变化。这是最直观的端到端验证手段。

## 约定

- `app.json` 的 `name` 即 **RN 根组件名**，必须与服务端下发的 `entry` 字段一致（当前为 `MainComponent`）。
- 原生入口固定为 `index.ts`；Web 入口为 `web/main.tsx`。
- 容器通过 `initialProperties` 注入 `route` / `appKey` / `versionCode` / `dark`，见 `App.tsx` 的 `ContainerProps`。
- 业务代码必须保持**平台无关**（只使用 `react-native` 导出的 API），原生专有能力走桥接层。
