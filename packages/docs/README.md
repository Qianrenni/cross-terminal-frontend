# @cross-terminal/docs

组件库文档站。浏览器端运行，**用 `react-native-web` 渲染组件库源码**，所以看到的不是截图，是真组件。

## 跑起来

```bash
# 仓库根目录
pnpm install
pnpm docs:dev      # → http://localhost:5174
pnpm docs:build    # 产出 packages/docs/dist
```

> 端口 5174：`rn-app` 的 web 占用了 5173。

## 两个页面

1. **首页 `#/`** —— 组件列表 + 按组件名搜索（匹配 `name` / `key` / 描述，不区分大小写）。
2. **组件页 `#/button`** —— 配置式 Demo：
   - 左侧：**实时预览**（改任何 prop 立刻生效）+ 自动生成的**示例代码**（可复制）；
   - 右侧：由 schema 生成的**控件面板**。

路由是极简 hash 路由（`src/useHashRoute.ts`），没引路由库：只有两个页面，且静态部署不需要服务端 rewrite。
要换 react-router，只需改 `useHashRoute.ts` 与 `App.tsx` 两处。

## 配置式 Demo 怎么工作

不做运行时反射 —— TS 的类型在运行时已被擦除，拿不到 prop 名与取值。
取而代之是**手写一份 schema**，页面据此自动长出控件面板与代码：

```ts
// src/demo/button.tsx
export const buttonDemo: ComponentDemo = {
  key: 'button',                      // 路由：#/button
  name: 'QButton',                    // 展示名
  description: '……',
  Component: QButton,                 // 被演示的组件
  controls: [                         // 每个可调 prop 一条
    { kind: 'text',    name: 'text',  label: 'text',  defaultValue: '提交', alwaysInclude: true },
    { kind: 'select',  name: 'type',  label: 'type',  defaultValue: 'primary', options: [...] },
    { kind: 'number',  name: 'level', label: 'level', defaultValue: 6, min: 1, max: 6 },
    { kind: 'boolean', name: 'disabled', label: 'disabled', defaultValue: false },
    // …
  ],
  toProps: (values) => ({ /* 控件值 → 组件 props */ }),
};
```

- **控件类型**：`text` / `number`（滑块）/ `boolean`（开关）/ `select`（下拉）。
- **`toProps`** 负责把控件值变成真正的 props —— `ReactNode` 这类没法用输入框表达的
  （如 `leftIcon`）在这里由下拉选项映射成节点。
- **示例代码是自动生成的**（`src/demo/toCode.ts`）：值等于默认值就不写，布尔为 `false` 不写，
  所以初始状态只有 `<QButton text="提交" />`，改一个多一行。
  不能直接写成标量的 prop 用 `DemoOption.code` 兜底，如
  `{ label: '仅左', value: 'left', code: 'leftIcon={<Text>◀</Text>}' }`。

**新增一个组件 = 写一份 `ComponentDemo` + 在 `src/demo/registry.ts` 加一行。**
`DemoPage` / `ControlPanel` 都不认识具体组件，不用改。

## 目录

```
packages/docs/
├── index.html                # Vite 入口（站点外壳是纯 DOM）
├── vite.config.ts            # react-native → react-native-web 别名等
├── tsconfig.json
└── src/
    ├── main.tsx              # 挂载
    ├── App.tsx               # 外壳 + 路由分发
    ├── useHashRoute.ts       # 极简 hash 路由
    ├── styles.css            # 外壳样式
    ├── HomePage.tsx          # 列表 + 搜索
    ├── DemoPage.tsx          # 预览 + 代码 + 控件面板
    ├── demo/
    │   ├── types.ts          # DemoControl / ComponentDemo 定义
    │   ├── toCode.ts         # 由控件值生成示例代码
    │   ├── button.tsx        # QButton 的配置
    │   └── registry.ts       # 注册表（列表/搜索/路由的数据源）
    └── ui/
        ├── ComponentList.tsx
        └── ControlPanel.tsx
```

## 两个刻意的取舍

1. **外壳用纯 DOM + CSS，不用组件库**。只有 `.stage__area` 里是被演示的组件。
   文档站不该长得像它演示的东西 —— 否则用 RNW 写一遍外壳，出了问题也分不清是谁的锅。

2. **本包不用 `@/` 别名**。`tsconfig.json` 里 `@/*` 指向的是**组件库源码**
   （`../components/src/*`），因为 tsc 会顺着 `@cross-terminal/components` 进到组件源码，
   而那边用了 `@/`。所以本包内部一律用相对路径。

## 部署到 GitHub Pages

仓库里已经带好 `.github/workflows/deploy-docs.yml`：推送到 `main`（或手动触发 `workflow_dispatch`）
就会构建 `packages/docs/dist` 并部署。

**首次使用（只需做一次）**：GitHub 仓库 → `Settings` → `Pages` → `Build and deployment` →
`Source` 选 **GitHub Actions**。

- 项目页地址：`https://<owner>.github.io/<repo>/`
- Vite 的 `base` 由环境变量 `DOCS_BASE` 控制（默认 `/`）；workflow 里设成 `/<repo>/`，
  否则 JS/CSS 会 404；
- 用自定义域名或 `<owner>.github.io` 仓库时，把 workflow 里的 `DOCS_BASE` 改成 `/`；
- 路由是 hash（`#/button`），静态托管不需要 404 回退文件。

本地模拟线上路径：

```bash
DOCS_BASE=/<repo>/ pnpm docs:build
pnpm docs:preview
```
