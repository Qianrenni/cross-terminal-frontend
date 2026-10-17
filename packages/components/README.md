# @cross-terminal/components

跨端组件库：**RN 与 Web 共用一份实现**（Web 端由 `react-native-web` 转换）。

组件的接口定义与 JSDoc 以仓库根目录的 **`COMPONENT.md`** 为准，本包是其落地实现。

## 目录结构

```
src/
├── index.ts              # 出口
├── types.ts              # 全局公共类型（CommonProps）
├── design/               # 设计系统：三层字典 + 主题解析 + 运行时切换
│   ├── index.ts              # 出口
│   ├── primitive.ts          # ① 原子层：一个巨大字典（色板 / 字体 / 间距 / 圆角 / 描边 / 尺寸 / 阴影 / 透明度）
│   ├── semantic.ts           # ② 语义层：颜色写点分字符串（'primitive.color.yellow.500'），数字直接取原子层
│   ├── components/           # ③ 组件层：**一个组件一个文件**（button.ts / icon.ts / index.ts）
│   ├── theme.ts              # 把路径解析成值 + 7 套主题（黄·默认 / 橙 / 粉 / 蓝 / 红 / 棕 / 绿）
│   ├── context.tsx           # QThemeProvider / useTheme / useQTheme / useThemeConfig
│   └── color.ts              # withAlpha
├── utils/                # 与具体组件无关的通用工具
│   ├── index.ts              # 出口
│   ├── type.ts               # DeepPartial / DeepReadonly / … 类型工具
│   └── large-screen.tsx     # 大屏适配：按屏幕宽度缩放 style 里的长度类数值（含开关 Provider）
├── testUtils/case.ts     # 快照用例通用类型 Case<T> 与生成器（testCase / matrix）
├── icon/                 # 图标（图标数据 + 取 token + 实现）
│   ├── index.ts              # 出口
│   ├── icons/                # **一个图标一个文件**（文件名 = 图标名，kebab-case）
│   │   ├── index.ts              # 唯一注册表：图标名 → 矢量描述（ICON_PATHS）
│   │   ├── type.ts               # 数据模型：IconShape / IconWeight / DEFAULT_VIEW_BOX
│   │   ├── _shared.ts            # 公用几何辅助（circle / RING）
│   │   ├── caret-left.ts         # ← 每个图标一个文件，默认导出 IconShape
│   │   └── …                     # （共 25 个，详见下文「QIcon 的图形从哪来」）
│   ├── type.ts               # IconName / QIconProps / QIconTokens
│   ├── style.ts              # **唯一读 token 处**
│   └── Icon.tsx              # 实现，导出 QIcon
├── hotzone/              # 热区：把小的点击目标包大，且不影响布局
│   ├── index.ts              # 出口
│   ├── type.ts               # QHotzoneProps / HotzoneInset / HotzoneEdges
│   ├── style.ts              # 热区几何（纯函数）+ 组件最终样式
│   ├── Hotzone.tsx           # 实现，导出 QHotzone
│   └── __tests__/            # style.test.ts + 快照 / 交互测试三件套
└── button/               # ← 每个组件一个目录（**目录名小写**，不带 Q）
    ├── index.ts              # 出口（纯 re-export）
    ├── type.ts               # QButtonProps / QButtonTokens（level·type 联合类型内联在 Props 里）
    ├── style.ts              # **唯一读 token 处**：读全局 + 组件 token，产出样式
    ├── Button.tsx            # 实现，导出 QButton（只管结构与交互）
    ├── components/           # 其他文件（子组件等，按需创建）
    └── __tests__/
        ├── props/Button.cases.ts         # 快照用例（纯数据）
        ├── Button.snapshot.test.tsx      # 快照测试
        └── Button.interaction.test.tsx   # 交互测试
```

## 设计约定

- **命名**：**只有导出带 `Q`**——组件 `QButton`、Props `QButtonProps`；**文件名 / 目录名不带 `Q`**；
  其中**目录名一律小写**（`src/button/`），与导出名解耦；
- **目录结构**：每个组件独占一个目录，至少包含：
  - `index.ts` —— 出口（纯 re-export）
  - `type.ts` —— 该组件的类型（Props / 联合类型，含 `QxxxTokens` 形状）；
    **简单的联合类型直接内联**（如 `level?: 1|2|3|4|5|6`），不再单独起名；
    内部需要复用时用 `NonNullable<QButtonProps['level']>` **从 Props 推导**
  - `style.ts` —— **唯一读主题处**：从 `theme.semantic`（语义层）+ `theme.components.xxx`（组件 token）
    产出样式；导出**按主题缓存**的 `xxxStylesOf(theme)` 与按变体计算的函数（如 `buttonVariantStyle`）；
    **实现文件不得直接 `import '@/design/primitive'` 或 `semantic`**，否则 token 读取会发散得到处都是
  - 实现文件（如 `Button.tsx`，导出 `QButton`）—— 只管结构与交互
  - **其他文件（子组件等）放该目录下的 `components/`**（按需创建）
  - 测试放 `__tests__/`
- **设计系统（`src/design/`）分三层，全部是字典**，组件只读第 ②③ 层：

  ```
  ① primitive.ts           一个巨大的字典，纯值      primitive.color.yellow['500'] → '#FFD100'
          ↓
  ② semantic.ts           颜色写点分字符串            semantic.color.brand.primary → 'primitive.color.yellow.500'
  ③ components/<组件>.ts  几何直接写数值、颜色 / 排版写路径  components/button.ts → height { 1: 28 … 6: 48 }
          ↓                （theme.ts 运行时把字符串变值 + 叠加主题 / 覆盖）
  getTheme('blue')        解析后的值                  theme.semantic.color.brand.primary → '#3B82F6'
  ```

  | 层             | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 会不会被主题改变          |
  | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
  | ① `primitive`  | `color`：`white/black/transparent`、`gray`(25~900)、`slate`(25~900)、11 条色相（`yellow/orange/brown/red/pink/purple/blue/cyan/teal/green/lime`，各 50~600）、`alpha.white`(15~60%)、`alpha.black`(2~93%)；`font`：`family{sans,brand,brandNumber}`（分平台）、`size`(9~42，键即 px)、`lineHeight`(14~60)、`weight`(4 档)；`spacing`(2px 网格)、`radius`、`stroke`、`size`、`shadow`、`opacity`                                                                                                                           | ❌ 静态共享               |
  | ② `semantic`   | `color.brand{primary,onPrimary,subtitle,onSubtitle,tertiary,onTertiary,onCombo,text{highlight,price}}`、`color.text{primary…inverse}`、`color.status{success,warning,error,info}`（各 `{default,onDefault,weak}`）、`color.promo{red,orange}`、`color.background{white,primary,secondary,tertiary,subtitleFill,disabled,cancel,mask,transparent}`、`color.stroke{white,default,secondary,primary}`、`font.sys{display,heading,title,body,caption,label}`、`font.number{5xl…xs}`、`font.brand{heading,title,body,caption}` | ✅ 品牌那几条路径按主题换 |
  | ③ `components` | **一个组件一个文件**：`button.ts`（`height` 按 level 1~6 / `paddingHorizontal` 按 level 1~6 / `lineGap` / `iconGap` / `textGap`）、`icon.ts`（`size` / `color` / `strokeWidth`）；`index.ts` 汇总                                                                                                                                                                                                                                                                                                                         | ✅（颜色跟着语义层走）    |
  - **组件层几何直接写数值**：`height: { 1: 28, … 6: 48 }`、`paddingHorizontal: { 1: 10, … 6: 24 }`
    —— 不去 `import` 全局 token，改按钮就改这一个文件；
  - **组件层排版写语义层路径**：`font: { 1: 'semantic.font.sys.label.2xs', … 6: '…label.xl' }`，
    解析后 `theme.components.button.font[level]` 是整份文字样式（字号 / 行高 / 字重 / 字距 / 颜色）；
  - **全局 token 用点分字符串索引**：如 `icon.color: 'semantic.color.text.primary'`、
    语义层 `primary: 'primitive.color.yellow.500'`。**不要在字典里直接 import `primitive` 取值**，
    否则值在模块加载时就被钉死，换主题 / 覆盖都不会生效；
  - **语义层可以引用语义层**：字体颜色写 `'semantic.color.text.primary'`，所以覆盖文字色时字体跟着变
    （解析器会多跑几轮处理「语义 → 语义 → 原子」的链）；
  - **主题**：`theme.ts` 里 `brandOverrides(name)` 只覆盖 `color.brand.*` 那几条路径；
    `onPrimary` 由「浅色品牌 → 深色字 / 深色品牌 → 白字」决定（`LIGHT_BRANDS`）；
    `getTheme(name)` 同名返回**同一个对象引用**，所以组件用它当 `WeakMap` key 缓存 `StyleSheet` 才能命中；
  - **运行时切换与覆盖**（**语义层与组件层都能覆盖**）：
    ```tsx
    <QThemeProvider
      theme="yellow"
      overrides={{
        'color.brand.primary': '#EF4444', // 语义层
        'components.button.height.6': 60, // 组件层
      }}
    />;
    const { setTheme, setOverrides } = useQTheme();
    setTheme('blue'); // 换主题
    setOverrides({
      'color.brand.primary': '#EF4444', // 语义层
      'components.button.height.6': 60, // 组件层
    });
    ```
    覆盖的**路径**两种：默认是语义层（`'color.brand.primary'`），带 `components.` 前缀是组件层
    （`'components.button.height.6'`、`'components.icon.color'`）；
    覆盖的**值**可以是具体值（`'#EF4444'` / `14`），也可以是路径（`'primitive.color.teal.500'` /
    `'semantic.color.brand.primary'`）；
  - `useThemeConfig(theme?, componentName, overrides?)` → `{ theme, global, tokens }`，
    组件的 `style.ts` 就用它；`CommonProps.theme` 可给单个组件覆盖主题
    （优先级：`theme` prop > `useThemeConfig` 的 `overrides` > `QThemeProvider` > 默认黄）；
  - 组件的行为常量（如 level → 几何档位的对应关系）**不属于**主题，留在组件实现里；

- **大屏适配（`utils/large-screen.tsx`）**：按窗口宽度把长度类数值整体缩放
  （基准 375，>880 为 1.4 倍；结果**向下取整**、负值先取绝对值再取整；
  `Dimensions` 只订阅一次，**系数**走全局缓存）。`QButton` / `QIcon` 已接入：

  ```tsx
  // 组件里拿不到系数，也不传系数：缩放全在 hook 内部完成
  const styles = useLargeScreenStyles(RAW_STYLES); // 一组命名样式（静态表）
  const scaled = useLargeScreenStyle(rawStyle); // 单个 style / 样式数组 / 计算结果对象
  const gap = useLargeScreenValue(8); // 非 style 的单个数值
  ```

  不想缩放时用 `<QLargeScreenProvider enabled={false}>` 包一层即可（默认开启）；
  docs 顶栏的「大屏转换」开关就是这个 Provider 的现场演示。
  ⚠️ 所以 `style.ts` 返回的是**朴素对象**（不是 `StyleSheet.create` 的 id），否则原生端拿不到数值。

- **路径别名**：组件库内 `@/xxx` 即 `src/xxx`（如 `@/design`、`@/button/type`）。
  tsconfig 的 `paths` **只影响类型检查**，运行时必须各工具链单独配：

  | 工具                 | 配置位置                                                                                           |
  | -------------------- | -------------------------------------------------------------------------------------------------- |
  | tsc（本包 + 消费方） | `tsconfig.json` 的 `paths`（`rn-app` 也要配，因为它会进到组件源码做类型检查）                      |
  | Jest                 | `jest.config.js` 的 `moduleNameMapper`                                                             |
  | Metro（rn-app）      | `metro.config.js` 的 `resolver.resolveRequest`（只在「组件库发起的导入」上生效）                   |
  | Vite（rn-app web）   | `vite.config.mts` 的 `resolve.alias`，键必须是 `'@/'` 而非 `'@'`（否则会误伤 `@cross-terminal/*`） |

  > ⚠️ **不要给 `paths` 配 `baseUrl`**。`baseUrl` 已废弃（TS 7.0 移除），TS 5.0+ 支持 `paths` 独立使用：
  > 此时每条映射按**声明它的 `tsconfig.json` 所在目录**解析。所以 `components` 写 `"@/*": ["./src/*"]`，
  > `rn-app` 写 `"@/*": ["../components/src/*"]`，语义与原来 `baseUrl: "."` 完全一致。

- **测试**：每个组件固定三个文件——`__tests__/props/<Name>.cases.ts`（**纯数据**，`Case<Props>[]`）、`__tests__/<Name>.snapshot.test.tsx`（快照）、`__tests__/<Name>.interaction.test.tsx`（行为/语义）；
- 组件只使用 `react-native` 导出的 API，**不引用任何 DOM/平台特有类型**，保证跨端；
- 视觉取自 `theme.semantic`（语义层）+ `theme.components.<组件>`（组件层），**组件实现不直接引原子层**；
  替换设计系统时只改 `design/`，组件代码一行不用动；
- 事件统一 `onXxx`，点击一律 `onPress`；
- 每个组件接口的 JSDoc 里写明「用途 + 事件」；
- **每个组件都必须有单测**（Jest + React Native Testing Library）。

## QIcon 的图形从哪来

`QIcon` 本身很好写（`name` + `size` + `color` + `weight` + `onPress`），**难点是图形数据**。
而本项目的三条硬约束把常见做法砍掉了一大半：

- **跨端**：RN + Web（react-native-web）共用一份实现，且只用 `react-native` 导出的 API；
- **OTA 动态发版**：新图标必须能随 JS Bundle 下发，**不能触发原生重编**；
- **组件库零原生依赖**：本包目前只有 react / react-native / react-native-svg 三个 peer，
  任何原生模块都会传导给每个消费方（包括未来的 4 个 renderer / 3 个平台）。

| 方案                               | 跨端                     | OTA 新增图标                                                                    | 代价                                                                                     | 结论            |
| ---------------------------------- | ------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------- |
| 图标字体（TTF）                    | ✅                       | ❌ 字体必须在原生侧注册（`Info.plist` / `assets/fonts`），新图标 = 原生重编     | 中                                                                                       | ❌ 违背 OTA     |
| `require('./x.png')`               | ✅                       | ❌ 图片是**原生资源**，构建期进 `drawable-*` / asset catalog，新图标 = 原生重编 | 低                                                                                       | ❌ 违背 OTA     |
| PNG base64 data URI                | ✅                       | ✅ 数据在 JS 里                                                                 | 位图（放大糊）、体积大、**无法 tint 换色**                                               | ⚠️ 备选         |
| 系统字体字形（Unicode）            | ✅                       | ✅                                                                              | 形状受系统字体控制；大量常见图标没有非 emoji 字形（`🔍` 是 emoji，各端会渲染成彩色位图） | ❌ 覆盖不住     |
| **`react-native-svg`（路径数据）** | ✅（Web 需配别名，见下） | ✅ 路径是纯 JS 数据                                                             | 多一个 peer 依赖；Harmony(RNOH) 支持待验证                                               | ✅ **当前方案** |

### 数据结构：一个图标一个文件

```
src/icon/icons/
├── index.ts        # 唯一注册表 ICON_PATHS：图标名 → 矢量描述
├── type.ts         # 数据模型 IconShape / IconWeight / DEFAULT_VIEW_BOX
├── _shared.ts      # 公用几何辅助（circle() / RING）
├── caret-left.ts   # 一个图标一个文件，文件名 = 图标名（kebab-case），默认导出 IconShape
└── …
```

**新增一个图标 = 改两处**：加一个文件 + 在 `icons/index.ts` 的注册表里加一行。

为什么必须有这张显式注册表：`IconName` 是从它的 **key** 推导的（`keyof typeof ICON_PATHS`），
所以 `name="clsoe"` 会在**编译期**报错、编辑器能补全 —— 和 token 树「显式声明每一层」同一个思路。
而 JS 标识符不能带连字符，没法「文件名 = 图标名 = 导出名」自动推导，只能显式列一遍；
第 2 步写错 key（漏加、把 `caret-left` 敲成 `caret-lfet`）的风险由
`__tests__/Icon.interaction.test.tsx` 里的**冻结清单测试**兜住。

### 画布与描边粗细

- **画布默认 100×100**（`DEFAULT_VIEW_BOX`），路径按 100 网格画 —— 设计稿以 100 为网格，
  小数位少、对着稿子抄坐标不容易出错。图标可以自己写 `viewBox` 覆盖，但**只应该改「窗口」**
  （留白 / 裁切），不要改坐标系比例，否则下面的描边宽度就对不上了；
- **描边粗细三档** `thin` / `regular` / `bold`，数值在组件 token `theme.components.icon.strokeWidth`
  （`{ thin: 5, regular: 8, bold: 12 }`，**viewBox 单位**，随尺寸等比缩放）。
  优先级：`<QIcon weight>` → 图标自己的 `IconShape.weight` → `regular`；
- 一个图标最多三类路径，按固定顺序渲染：`fill`（实心）→ `stroke`（描边）→
  `solidStroke`（描边，**永远实线**），**可以同时存在**
  （`info` = 描边的圈 + 实心的点）；一条 `d` 里可以用多段子路径画多个图形
  （`more` 的三个点就是一条 `d`）；
- **虚线**：`stroke` 可以再声明 `dash: [8, 14]`（→ `strokeDasharray`），如 `placeholder-line`。
  ⚠️ 描边固定是 `strokeLinecap="round"`，圆头会让每段虚线两端各「长」出 `strokeWidth / 2`、
  同时吃掉同样多的空隙 —— 所以 **gap 必须明显大于 dash**，否则空隙被糊死、看起来像实线；
- **为什么要有 `solidStroke`**：虚线是沿**整条路径**连续铺下去的，把「直边 + 圆角」写进同一条 `d`，
  虚线段会跨过圆角把它切成两半。`placeholder-line` 要求「四角各是一整段不间断的圆弧、
  虚线只落在四条直边上」，就只能让直边与圆角分属两条路径；
- **不支持** `fillRule` / `<Defs>` / 渐变 / `clipPath` / 多色 —— 遇到再加，别偷偷塞进来。

### Web 端的两处打包兜底（Vite）

`react-native-svg` 15.16.0 的 web 打包有几个缺陷，`packages/docs` 与 `packages/rn-app` 的
vite 配置里都写了详细注释与补丁，要点：

1. **别名**：该包没有 `browser` / `exports` 字段，默认入口是**原生实现**，必须别名到
   `react-native-svg/lib/module/ReactNativeSVG.web.js`；
2. **依赖预打包（dev）的扩展名**：预打包内部**硬编码**了 `resolve.extensions` 且不含 `.web.*`，
   会命中该包里的**原生** `elements.js`（进而拉进整条 fabric 链）。必须用
   `optimizeDeps.rolldownOptions.resolve.extensions` 覆盖成 `.web.*` 优先 ——
   dev 与 build 走的是**两套解析器**，只修一处不管用；
3. 预打包里**相对路径不经过用户插件的 `resolveId`**，所以 fabric 桩要用 **`load` 钩子**改文件内容；
4. 三条试过但行不通的路（给 fabric 打桩消错、`optimizeDeps.exclude`、顶层插件 `resolveId`）
   都记在 vite 配置的注释里。升级该包后先跑一次 build + dev 确认这些补丁是否还需要。

## 已实现

| 组件       | 状态 | 备注                                                                                                                                               |
| ---------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QIcon`    | ✅   | `name` / `size` / `color`① / `weight` / `onPress`                                                                                                  |
| `QHotzone` | ✅   | `onPress` / `inset` / `disabled`；**不做测量**，外扩量由调用方给定（几何见 `src/hotzone/style.ts`）                                                |
| `QButton`  | ✅   | `level` / `type` / `text` / `subText` / `suffixText` / `subSuffixText` / `disabled` / `leftIcon` / `rightIcon` / `loading` / `insets`② / `onPress` |

> ① `color` 是 `QIcon` 相对 `COMPONENT.md` 的**增加项**：`QButton` 必须把前景色传给图标
> （主按钮上是白图标、描边按钮上是品牌色），而 `CommonProps.style` 的类型是 `ViewStyle`，没有 `color` 字段，传不进去。
> ② `insets` 是 `QButton` 的**增加项**：复用 `QHotzone` 的几何，在按钮视觉区域外扩出可点击范围（不影响布局）。

### 与 `COMPONENT.md` 的偏差（💡 待收敛）

1. **`QButton` 的图标**：`leftIcon` / `rightIcon` 仍接受任意可渲染节点（`ReactNode`），
   **尚未收敛为 `IconName`**。`QIcon` 已就绪，但收敛会改变 `QButton` 的公开 API 并重写 18 个快照，
   所以先单独拉出来确认（不做的话，这个偏差会一直在）。
2. **`QIcon.color`**：见上。
3. **`IconName` 的归属**：`COMPONENT.md` 把它列在「公共类型」里，实现上它定义在 `src/icon/type.ts`
   （因为它就是字形表的 key），并从包根导出，仍可按
   `import { IconName } from '@cross-terminal/components'` 使用。
4. **视觉映射**：`type` 决定填充方式；`level`（1~6 优先级）只映射几何（高度 / 左右内边距），
   颜色固定取语义层品牌原色，不做档位混色。

### `QButton` 的形状（三条硬规则）

1. **`level` 决定高度、左右内边距与字号**：`theme.components.button.height = { 1: 28, …, 6: 48 }`、
   `paddingHorizontal = { 1: 10, …, 6: 24 }`、`fontSize = { 1: 12, …, 6: 17 }` ——
   等级越高，按钮越高、左右越宽、字越大。
   **颜色不随 `level` 变**：同一 `type` 在任意档位都是同一个品牌原色。
2. **圆角 = 高度的一半（半圆端）**：`borderRadius: height[level] / 2`，所以每一档都是**标准胶囊**。
   ⚠️ 别用 `primitive.radius.full`（999）来「假装胶囊」——圆角超过高度一半时会被按宽高分别裁剪，
   渲染成**椭圆**（Android 上尤其明显）。
3. **`secondary` / `tertiary` 的线框是绝对定位节点，不是容器的 `borderWidth`**：
   边框会吃掉内容盒（内边距实际变小），而线框只是视觉装饰，不该参与布局。
   所以 `buttonStyles.frame` 绝对定位铺满容器 + `pointerEvents="none"`（不占位、不抢触摸），
   两种形态**只在颜色上不同**：`secondary` 用品牌原色，
   `tertiary` 用 `color.stroke.default`；`primary` 是实心块，不渲染线框节点。

## 使用

```tsx
import { QButton, QThemeProvider } from '@cross-terminal/components';

// ① 包一层主题（不包也能用，兜底默认主题「黄」）
<QThemeProvider theme="yellow">
  <QButton type="primary" level={6} text="提交" onPress={onSubmit} />
</QThemeProvider>;

// ② 运行时切换（内置 7 套：yellow / orange / pink / blue / red / brown / green）
const { setTheme } = useQTheme();
setTheme('blue');

// ③ 单个组件局部覆盖主题（优先级：prop > Provider > 默认）
<QButton text="局部红色" theme={getTheme('red')} />;

// ④ 组件内部取 token
const { global, tokens } = useThemeConfig(props.theme, 'button');
global.color.brand.primary; // 语义层：当前主题的品牌主色
tokens.radius; // 组件层：按钮的胶囊圆角
```

## 开发

```powershell
# 在仓库根目录
pnpm install
pnpm --filter @cross-terminal/components run test        # 跑单测
pnpm --filter @cross-terminal/components run typecheck   # 类型检查

pnpm lint          # ESLint（React Compiler 规则集 + JSX 规则全开）
pnpm format        # Prettier 写入
pnpm check         # typecheck + lint + format:check（提交前跑这个）
```

## 测试

- 框架：**Jest 29** + **React Native Testing Library 13**
- 配置：`jest.config.js` 复用 `@react-native/jest-preset`
  （RN 0.87 起该 preset 从 `react-native/jest-preset` 独立成包）
- 单测放在组件目录下的 `__tests__/`，固定三个文件：

  | 文件                          | 职责                                                                            |
  | ----------------------------- | ------------------------------------------------------------------------------- |
  | `props/Button.cases.ts`       | **只存用例数据**（`Case<QButtonProps>[]`；名字不含 `.test.`，不会被 Jest 收集） |
  | `Button.snapshot.test.tsx`    | 遍历用例，直接 `<QButton {...props} />` 渲染并快照                              |
  | `Button.interaction.test.tsx` | 行为与语义（props / 事件 / 无障碍）                                             |

**新增快照用例**只需改用例文件；批量组合用通用生成器 `matrix<T>()`：

```ts
// __tests__/props/Button.cases.ts —— 纯数据，不含渲染逻辑
export const buttonCases: Case<QButtonProps>[] = [
  testCase('默认', { text: '提交' }),
  // type × 状态 = 9 组
  ...matrix<QButtonProps>({ text: '提交' }, [
    {
      primary: { type: 'primary' },
      secondary: { type: 'secondary' },
      tertiary: { type: 'tertiary' },
    },
    { 默认: {}, 禁用: { disabled: true }, 加载中: { loading: true } },
  ]),
];
```

> 通用类型 `Case<T>` 与生成器 `testCase` / `matrix` 定义在 `src/testUtils/case.ts`，`T` 可以是**任意组件的 Props**。
> 批量生成需**显式传泛型**（`matrix<QButtonProps>(...)`），否则 `T` 会从 `base` 推断得过窄。

交互断言示例：

```tsx
const { getByTestId } = render(<QButton testID="btn" text="提交" onPress={onPress} />);
fireEvent.press(getByTestId('btn'));
expect(onPress).toHaveBeenCalledTimes(1);
```
