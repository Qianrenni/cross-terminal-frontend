# AGENTS.md

> 给 AI 编码代理（Copilot / Claude / Cursor…）的项目须知。
> **开工前请先读完本文件**，里面的约束都是踩过坑总结出来的。

## 这是什么项目

pnpm monorepo，四块：

| 包 / 目录                                      | 职责                                                       |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `packages/components`                          | 跨端组件库 + 设计系统（**本项目的主战场**）                |
| `packages/rn-app`                              | RN 业务包（Android 容器加载它，也能跑 Web）                |
| `packages/docs`                                | 组件文档站（Vite + react-native-web，实时预览 + 属性面板） |
| `packages/eslint`                              | 共享 ESLint flat config（`@qyani/eslint-config`）          |
| `android/`、`ios/`、`harmony/`、`miniprogram/` | 各端壳工程（**不是 JS 项目**）                             |
| `backend/`                                     | 发布服务（OTA manifest / 产物）                            |

## 三条硬约束（违反会直接出问题）

1. **只改本仓库。** `D:\project` 是只读参考，不要写。
2. **不要跑 Android Gradle 构建**（`./gradlew`、`assembleDebug` 等）——由用户自己在 Android Studio 跑；你跑会很慢且污染环境。
3. **源码改动只用编辑工具**，不要用 PowerShell `Get-Content | Set-Content` 批量替换（PS 5.1 默认 ANSI，会把 UTF-8 中文写成乱码）。批量替换用 `multi_replace_string_in_file`。

## 命令速查

```powershell
pnpm install                 # 安装（prepare 会自动装 husky 钩子）
pnpm docs:dev                # 文档站 http://localhost:5174
pnpm start:rn / start:web    # RN 原生 Metro / RN Web
pnpm typecheck               # 全工作区 tsc --noEmit
pnpm lint / lint:fix         # ESLint（flat config，React Compiler 规则全开）
pnpm format / format:check   # Prettier
pnpm check                   # typecheck + lint + format:check —— 提交前必跑
pnpm --filter @cross-terminal/components run test   # 组件库单测
pnpm --filter @cross-terminal/components run test -- -u  # 更新快照（改完必须审计）
```

## 设计系统：三层字典 + 运行时解析

`packages/components/src/design/`，**只有 6 个文件**：

```text
primitive.ts         ① 原子层：一个巨大字典（纯值，无含义）
semantic.ts          ② 语义层：颜色写点分字符串，字体数字直接取原子层
components/<组件>.ts ③ 组件层：几何直接写数值，颜色写点分字符串
theme.ts             解析器 + 7 套主题（yellow 默认 / orange / pink / blue / red / brown / green）+ overrides
context.tsx          QThemeProvider / useTheme / useQTheme / useThemeConfig
color.ts             withAlpha
```

规则：

- **组件实现不 import `primitive` / `semantic`**，一律 `useThemeConfig(props.theme, 'button', overrides)`
  拿 `{ theme, global, tokens }`；
- 组件目录的 `style.ts` 是**唯一读主题处**，并用 `WeakMap<ThemeConfig, Styles>` 缓存 `StyleSheet.create`；
- **数值不参与换肤**：几何直接写数字；**颜色**才写 `'semantic.color.xxx'` / `'primitive.color.xxx'` 字符串；
- 运行时覆盖路径：语义层不带前缀（`'color.brand.primary'`），组件层带 `components.` 前缀
  （`'components.button.height.6'`）；
- 不要写 `num()` 之类的类型标注函数，也不要引入 `Resolved<T>` 映射类型（用户明确否掉过）。

## 组件开发规范

```text
src/<组件目录，小写>/
├── index.ts       出口（纯 re-export）
├── type.ts        QXxxProps / QXxxTokens；简单联合类型内联（level?: 1|2|3|4|5|6）
├── style.ts       唯一读主题处：createXxxStyles(theme) + xxxStylesOf(theme) + variant 函数
├── Xxx.tsx        实现，导出 QXxx（memo + displayName）
└── __tests__/
    ├── props/Xxx.cases.ts       纯数据用例
    ├── Xxx.snapshot.test.tsx    结构快照
    └── Xxx.interaction.test.tsx 行为与语义
```

- 导出名带 `Q`，文件名 / 目录名不带；
- `QButton` 的 **高度与左右 padding 都按 `level` 分档**，胶囊圆角 = `height[level] / 2`；
- `secondary` / `tertiary` 的线框是**绝对定位子节点**（`pointerEvents="none"`），不要用容器 `borderWidth`；
- 改快照后**必须人工审计**：`borderRadius` / 颜色 / 结构是否符合预期，不能盲 `-u`。

## 代码规范与门禁

- ESLint 10 flat config：`js/recommended` + `typescript-eslint` + `react-hooks` 全量（含 React Compiler）
  - `@eslint-react` recommended（JSX）+ JSON/JSONC + CSS；
- **提交时**（`.husky/pre-commit`）自动跑：ESLint（暂存文件，`--max-warnings=0`）→ Prettier（暂存文件）→ 单测；
- **提交信息**（`.husky/commit-msg`）必须是
  `[type][change] 改了什么 [effect] 影响哪些`，type 白名单：
  `feat | fix | test | docs | refactor | style | perf | build | ci | chore | revert`

  ```text
  [feat][change] 新增 QHotzone 热区开关 [effect] 文档站、全部示例
  [refactor][change] 设计系统改为三层字典 [effect] 全部组件、主题 API
  ```

- 改完代码的验收顺序：`pnpm check` → `pnpm --filter @cross-terminal/components run test` →
  必要时 `pnpm docs:build` / `pnpm --filter @cross-terminal/rn-app run build:web`。

## 已知坑（都踩过）

| 坑                              | 说明                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `StyleSheet.absoluteFillObject` | **RN 0.87 已删除**（运行时 `undefined`，展开会静默失效）；显式写四条边                                                  |
| Vite 预构建                     | `optimizeDeps` 的 rolldown 实例不认 `.web.*` 扩展名，必须显式配 `resolve.extensions`（见 `packages/*/vite.config.mts`） |
| react-native-svg 预构建         | `NativeSvgSoundModule` 依赖相对路径，插件 `resolveId` 抓不到，要 `load` 钩子 stub                                       |
| Jest 快照                       | `.snap` 不能被 Prettier 格式化（`.prettierignore` 已排除），否则测试全红                                                |
| 测试里取节点                    | `UNSAFE_getAllByType(View)` 会混入复合组件层；结构断言走 `toJSON()`                                                     |
| React 19                        | 用 `<Context value>` / `use(Context)`，不要 `Context.Provider` / `useContext`                                           |
| 换行符                          | 仓库统一 **LF**（Prettier `endOfLine: lf` + `.gitattributes`）                                                          |

## 不要做的事

- ❌ 给 `packages/rn-app/package.json` 加 `"type": "module"`（Metro 是 CJS）；
- ❌ 在 Vite 插件里用 `\0` 前缀的虚拟模块 id（本项目工具链不兼容）；
- ❌ 在组件代码里写最小高度 / 最小宽度等「防御性尺寸」；
- ❌ 用 `tokens.radius.full`（999）假装胶囊（超过高度一半会被裁成椭圆）；
- ❌ 手改 `.snap` 或 `pnpm-lock.yaml`；
- ❌ 在 `backend/data`、`android/build` 等生成物目录里改东西。
