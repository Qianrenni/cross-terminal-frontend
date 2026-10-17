# 落地路线图（ROADMAP）

> 本文档是 `PLAN.md`（架构设计）的**落地执行版**。`PLAN.md` 回答"要建成什么"，本文档回答"怎么一步步建、先建什么、验收标准是什么"。

## 0. 现状与既定决策

**现状**：仓库仅有设计文档（`PLAN.md`、`COMPONENT.md`），代码为零，`android/ ios/ harmony/ miniprogram/ web/ backend/ packages/` 均为空目录。

**已确认的落地决策**：

| 决策项     | 选择                      | 影响                                                     |
| ---------- | ------------------------- | -------------------------------------------------------- |
| 起步方式   | **Android + RN 最小闭环** | 先打通一条端到端链路，验证可行性                         |
| OTA 通道   | **自研下发逻辑**          | 自己实现 检查/下载/校验/切换/回滚，不依赖 CodePush/Pushy |
| 宿主 App   | **从零新建**              | 不背历史包袱，按目标架构搭建                             |
| 后端技术栈 | **Ktor（Kotlin/JVM）**    | 与 Android 宿主同语言栈，便于共享 manifest 数据模型      |

---

## 1. 总体策略：垂直切片，而非水平铺开

`PLAN.md` 描述的是**三端 × 四引擎 + 统一发版平台**，这是一个 10+ 人月的平台工程。若按"先把三端容器都搭好，再逐个接引擎"的水平方式推进，会在很长时间里**没有任何可验证成果**。

因此采用**垂直切片（Vertical Slice）**：先在**一个平台 + 一个引擎**上把"改代码 → 构建 → 发版 → 客户端更新生效 → 回滚"的**完整闭环**跑通，再横向复制到其它平台、纵向扩展到其它引擎。

```
水平铺开（❌ 不推荐）         垂直切片（✅ 推荐）
─────────────                ─────────────
[Android][iOS][Harmony]       改一行 RN 代码
   ↓        ↓      ↓              ↓
[RN][卡片][H5][小程序]        CI 构建 Bundle
   ↓        ↓      ↓              ↓
[后端][后台][监控]            上传 CDN + manifest
                              ↓
                           客户端拉取并生效
                              ↓
                           ⭐ 闭环验证成功
```

---

## 2. P1：Android + RN OTA 最小闭环

### 2.1 目标

> 修改一行 RN 代码 → CI 自动构建 Hermes Bundle → 生成 manifest 上传服务端 → Android App 冷启动拉取 → 新版本生效 → 出错可回滚。

### 2.2 验收标准（Definition of Done）

- [ ] 本地一条命令即可构建出 Hermes Bundle 并生成 manifest。
- [ ] 服务端能对外提供 `manifest.json` 和 Bundle 静态文件。
- [ ] App 首次启动从内置（assets）Bundle 运行。
- [ ] 服务端发布新版本后，App **冷启动自动下载**新 Bundle，**再启动一次**加载新版本。
- [ ] 下载后校验失败（MD5 不匹配）能拒绝安装并保留旧版本。
- [ ] 新版本加载失败/崩溃后，能**自动回滚**到上一稳定版本。
- [ ] 全程无需重新安装 APK。

### 2.3 刻意不做（Out of Scope）

- iOS、鸿蒙（P2）
- 卡片 DSL、H5、小程序（P3）
- 发版管理后台 UI、灰度引擎、监控告警（P4）
- 产物签名链（P1 先做 MD5 完整性校验，签名留 P2 补强）

---

## 3. P1 核心契约设计（⚠️ 最重要，先定协议）

这几项是全系统的"接口契约"，一旦定错，后续所有端都要返工。

### 3.1 Manifest 协议

服务端按 `平台 × 原生版本 × 渲染形态` 维度提供 manifest。P1 只用 `android × react_native`：

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

**字段取舍说明**：

- `version` / `versionCode`：`versionCode` 为服务端分配的**单调递增整数**，是版本比较的权威；`version` 仅作展示。
- `binaryVersionRange`：声明该产物兼容的原生 App `versionCode` 区间，客户端不匹配则**跳过更新**（对应 `PLAN.md` §4.4 兼容矩阵）。
- `fingerprint`：原生工程指纹。P1 先置空，P2 与 CI 联动做严格校验。
- `rollout`：P1 先固定 `percent: 100`，为 P4 灰度引擎预留结构。

### 3.2 客户端本地存储布局（Android）

```
filesDir/ota/
├── bundles/
│   ├── 1.1.0/index.android.bundle      # 历史版本（保留用于回滚）
│   └── 1.2.0/index.android.bundle      # 当前版本
├── staging/                            # 下载中的临时文件（校验通过后移入 bundles/）
│   └── index.android.bundle.part
└── state.json                          # 当前指针 + 回滚信息
```

`state.json`：

```json
{
  "current": { "version": "1.2.0", "path": "bundles/1.2.0/index.android.bundle" },
  "previous": { "version": "1.1.0", "path": "bundles/1.1.0/index.android.bundle" },
  "pending_confirm": true,
  "launch_attempts": 1
}
```

- `pending_confirm` / `launch_attempts`：**崩溃回滚的判据**。新版本首次加载时置 `pending_confirm=true`，RN 首屏成功渲染后回调 SDK 置 `false`；若连续 `launch_attempts` 超过阈值（如 2 次）仍未确认，SDK 判定新版本有问题，回滚到 `previous`。

### 3.3 更新流程状态机

```
        ┌──────────────┐
启动 ──▶│ 读取 state   │
        └──────┬───────┘
               │ 有 current？ ──否──▶ 用 assets 内置 Bundle
               │ 是
               ▼
        ┌──────────────┐   pending_confirm 且 attempts≥2
        │ 选择加载版本 │──────────────▶ 回滚到 previous
        └──────┬───────┘
               ▼
        加载并渲染 RN ──▶ 首屏成功 ──▶ state.pending_confirm=false
               │
               │（后台并行）
               ▼
        拉取 manifest ─▶ 版本/兼容性/灰度判断 ─▶ 下载到 staging
               │                                   │
               │                              MD5 校验失败 ─▶ 丢弃
               │                                   │ 成功
               ▼                                   ▼
        写 state.previous = current        移入 bundles/<v>/
                                          写 state.current = <v>
                                          state.pending_confirm = true
                                          （下次冷启动生效）
```

### 3.4 后端接口（Ktor）

| 方法   | 路径                                                                | 鉴权     | 说明                                                 |
| ------ | ------------------------------------------------------------------- | -------- | ---------------------------------------------------- |
| `GET`  | `/health`                                                           | 无       | 健康检查                                             |
| `GET`  | `/ota/{appKey}/{platform}/{binaryVersion}/{renderer}/manifest.json` | 无       | 客户端检查更新（**预生成静态文件，可整体交给 CDN**） |
| `GET`  | `/ota-files/{appKey}/{platform}/{renderer}/{versionCode}/{file}`    | 无       | 产物下载（生产环境交给对象存储 + CDN）               |
| `POST` | `/admin/releases`                                                   | 管理令牌 | 上传产物并发布（multipart）                          |
| `GET`  | `/admin/releases?appKey=`                                           | 管理令牌 | 发布历史                                             |
| `POST` | `/admin/releases/activate?appKey=&platform=&renderer=&versionCode=` | 管理令牌 | 切生效版本（发布验证 / 回滚）                        |
| `GET`  | `/api/releases/active?appKey=&platform=&renderer=`                  | 无       | 当前生效版本（兜底 / 排查）                          |

> **CDN-first**：manifest 是发布时**预生成的静态文件**，客户端拉取的是 CDN 上的静态资源，而非每次都打后端 API。Ktor 的职责是**生成并托管**这些文件，这决定了它能扛住百万级启动请求。

---

## 4. P1 任务拆解（按依赖顺序执行）

| #   | 任务                                      | 产出                            | 依赖 |
| --- | ----------------------------------------- | ------------------------------- | ---- |
| 1   | 搭建 Ktor 后端骨架                        | `backend/` 可启动服务           | —    |
| 2   | manifest 数据模型 + 生成器 + 静态托管     | `manifest.json` 可通过 URL 访问 | 1    |
| 3   | RN 构建打包脚本                           | 一条命令产出 Bundle + manifest  | —    |
| 4   | 新建 Android 宿主 App 并集成 RN           | 可运行 RN 页面（assets Bundle） | —    |
| 5   | 自定义 `JSBundleLoader`（从文件系统加载） | 可加载下载目录中的 Bundle       | 4    |
| 6   | OTA SDK：检查 / 下载 / 校验 / 切换        | 状态机 §3.3 前半段              | 2,5  |
| 7   | OTA SDK：崩溃回滚                         | 状态机 §3.3 回滚分支            | 6    |
| 8   | 端到端验证                                | 验收标准 §2.2 全绿              | 全部 |

**建议执行顺序**：`1 → 2`（后端能发 manifest）→ `3`（能产出产物）→ `4 → 5`（App 能加载外部 Bundle）→ `6 → 7`（OTA 逻辑）→ `8`（验证）。

---

## 5. 目标目录结构（P1 完成后）

> **实现位置**：本工作区 `d:\othe-project\cross-terminal-frontend`，从零新建；
> `D:\project\ktor-backend`、`D:\project\android-user` 仅作**只读参考**，不改动。

```
cross-terminal-frontend/
├── PLAN.md                    # 架构设计
├── COMPONENT.md               # 组件清单
├── ROADMAP.md                 # 本文件
├── android/                   # 宿主容器（Kotlin）
│   ├── app/                   # 宿主 App
│   └── ota/                   # OTA SDK（Kotlin Library）
├── packages/
│   ├── components/            # 跨端组件库
│   └── rn-app/                # RN 业务工程（产出 Bundle）
├── backend/                   # Ktor 发版后端
│   └── src/main/kotlin/...
├── scripts/                   # 构建/发布脚本
└── ci/                        # CI/CD 流水线定义
```

---

## 6. 后续阶段展望

| 阶段          | 目标                                  | 关键点                                                                                               |
| ------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **P2 多端**   | iOS、鸿蒙接入同一套 manifest 协议     | 鸿蒙 RNOH 需**重新对齐 RN 0.87.1**（原 `0.82.30` 与当前 RN 不匹配）；本机存储路径与加载 API 各端独立 |
| **P3 多引擎** | 卡片 DSL / H5 离线包 / 小程序容器     | 复用 CDN + manifest 机制，仅扩展 `renderer` 维度与产物类型                                           |
| **P4 平台化** | 发版后台 + 灰度引擎 + 监控 + 自动回滚 | 落地 `PLAN.md` §4.2 的兼容矩阵与 §5 的灰度策略                                                       |

---

## 7. 风险提示（P1 就可能踩到）

- **Bundle 加载路径错误 → 白屏**：`JSBundleLoader` 必须在 RN 引擎初始化**之前**决定加载哪个文件。
- **回滚判据过激 → 无限回滚**：`launch_attempts` 阈值要结合"首屏成功"回调，避免正常慢启动被误判。
- **状态文件并发写 → 损坏**：`state.json` 读写需加锁 / 原子写（写临时文件再 rename）。
- **原生依赖变化后 OTA 不兼容**：P2 必须引入 `fingerprint` 严格校验，否则"能下载但一加载就崩"。

---

## 8. 落地进度

| #   | 任务                                                  | 状态                                     | 位置                           |
| --- | ----------------------------------------------------- | ---------------------------------------- | ------------------------------ |
| 1   | Ktor 发版后端骨架                                     | ✅ 完成                                  | `backend/`                     |
| 2   | manifest 数据模型 + 预生成 + 静态托管 + 发布/回滚接口 | ✅ 完成（含端到端测试）                  | `backend/`                     |
| 3   | RN 工程 + 构建/发布脚本                               | ✅ 完成（产出 Hermes Bundle 并成功发布） | `packages/rn-app/`、`scripts/` |
| 4   | Android 宿主 App 并集成 RN                            | ⬜ 待做                                  | `android/`                     |
| 5   | 自定义 `JSBundleLoader`（从文件系统加载）             | ⬜ 待做                                  | `android/ota/`                 |
| 6   | OTA SDK：检查 / 下载 / 校验 / 切换                    | ⬜ 待做                                  | `android/ota/`                 |
| 7   | OTA SDK：崩溃回滚                                     | ⬜ 待做                                  | `android/ota/`                 |
| 8   | 端到端验证                                            | ⬜ 待做                                  | —                              |

**已验证**：

- `backend`：`./gradlew test` 全绿，覆盖「发布 → 生成静态 manifest → 产物可下载 → 切版本回滚 → 未授权/非法参数被拒 → 超过 1MB 的包可发布」。
- RN 链路：`node scripts/build-bundle.mjs` 产出 **Hermes 字节码**（magic `c6 1f bc 03`，1,486,235 字节）→ `node scripts/publish-bundle.mjs` 发布成功 → 客户端视角拉取 manifest、下载产物，**MD5 与体积三方一致**（本地构建 / manifest / 下载结果均为 `3f67b579db75a56878e6a2b0badf1a68`）。
- RN/Web 双端：`typecheck`、`typecheck:web`、`build:web`（产物 `dist/web/`）全部通过；`build:bundle` 在 RN 0.87.1 下产出 Hermes 字节码。
- ⚠️ RN 版本由 `0.82.1` 上调至 **`0.87.1`**：0.82 的 gradle 插件依赖 foojay 0.5.0，在 Gradle 9.x 上必然崩（详见 `packages/rn-app/README.md` 的「版本选择」）。
- **pnpm workspace**：根目录 `pnpm-workspace.yaml`（`packages/*`）+ 根 `.npmrc`（`node-linker=hoisted`）+ 单一 `pnpm-lock.yaml`；子包内不再各自 install。
- **组件库** `@cross-terminal/components`（`packages/components`）已建，首个组件 `Button` 落地；rn-app 以 `workspace:*` 引用。
  验证：`pnpm -r run typecheck`、`build:web`、`build:bundle`（Hermes）全部通过。
