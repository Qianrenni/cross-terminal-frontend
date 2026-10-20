# 跨端组件库 · 组件规格

> 组件库的**组件清单与 API 规格**，以 **TypeScript 接口 + JSDoc** 定义，可直接落到 `packages/components/`。
> 组件同时跑在 RN（`react-native`）与 Web（`react-native-web`）上，因此 API 保持**平台无关**。

**当前进度**：共 43 个组件 —— 已确认 3 个（`QButton`、`QTextButton`、`QCheckbox`），其余 40 个为 💡 建议稿。

## 图例

| 标记 | 含义          |
| ---- | ------------- |
| ✅   | 已确认        |
| 💡   | 建议 / 待确认 |

## 命名约定

- **组件 / 导出名**：一律 `Q` 前缀（`QButton`），Props 类型为 `QButtonProps`（辅助类型如 `TabItem`、`FilterOption` **不加**前缀）；
- **文件 / 目录名**：**不带 `Q`**——`src/Button/Button.tsx` 内导出 `QButton`；
- **测试**：放组件目录下的 `__tests__/`，固定**三个文件**——`props/Button.cases.ts`（只存用例数据 `Case<QButtonProps>[]`）、`Button.snapshot.test.tsx`（结构快照）、`Button.interaction.test.tsx`（行为与语义）；通用类型 `Case<T>` 见 `src/testUtils/case.ts`。

## 命名已统一

原稿中同一概念写法不一，下列接口**已统一**（如需保留原写法请回退）：

- **布尔属性**：原 `button.disabled` / `checkbox.disable` → 统一 `disabled`。
- **尺寸档位**：原 `textbutton.level`（`small|medium||large|extrlarge`，含多余分隔符与拼写错误）→ 统一 `size: 'small' | 'medium' | 'large' | 'extraLarge'`。
- **`level` 语义**：原 `checkbox.level`（大/中/小）→ 改为 `size`；`level` 只保留「层级/优先级」语义（见 `button.level: 1~6`）。
- **`button.type` 的「辅助」**：原稿缺英文名 → 暂用 `tertiary`（💡 待定）。
- **事件命名**：统一用 `onXxx`，点击一律 `onPress`（RN 惯例；Web 端由 `react-native-web` 兼容 `onClick`）。

## 目录

| 分组           | 组件                                                                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 一、基础       | `QText` `QIcon` `QLine` `QImage` `QPrice` `QBadge` `QTag` `QIndicator` `QLoading`                                                                               |
| 二、表单       | `QInput` `QCheckbox` `QSwitch` `QStepper` `QRate` `QSearchBar` `QTimePicker` `QForm` `QFilter` `QFilterPanel`                                                   |
| 三、操作       | `QButton` `QTextButton` `QFloatButton` `QMediaUpload`                                                                                                           |
| 四、导航       | `QTabs` `QNavigation` `QBottomTab` `QBottomBar` `QRoundNavigation`                                                                                              |
| 五、反馈与浮层 | `QToast` `QSnackbar` `QDialog` `QModal` `QBottomSheet` `QActionSheet` `QPopover` `QTooltip` `QNoticeBar` `QNotificationBanner` `QEmptyState` `QFeedback` `QNps` |
| 六、展示与业务 | `QList` `QTitleModule`                                                                                                                                          |

## 公共类型

所有组件共有的属性与基础类型：

```ts
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** 所有组件共有的属性。 */
export interface CommonProps {
  /** 自定义样式；Web 端由 react-native-web 转换 */
  style?: StyleProp<ViewStyle>;
  /**
   * 只对这个组件生效的主题覆盖（一般不用传，跟随 `QThemeProvider`）。
   * 优先级：本 prop > `QThemeProvider` > 默认主题（黄）。
   */
  theme?: ThemeConfig;
  /** 测试与埋点标识 */
  testID?: string;
  /** 无障碍标签（读屏软件朗读） */
  accessibilityLabel?: string;
}

/** 图标名（对应图标库中的 key） */
export type IconName = string;
```

> **设计系统**（`packages/components/src/design/`）分三层，**全部是字典**：
> ① 原子层 `primitive`（一个巨大字典：色板 / 字号 / 行高 / 间距 / 圆角 / 描边）→
> ② 语义层 `semantic`（**颜色**写成**路径**，如 `'primitive.color.yellow.500'`；数字直接取原子层）→
> ③ 组件层 `components`（同上）。
> `theme.ts` 在**运行时**把路径解析成值，并叠加主题与覆盖：
> `ThemeConfig = { themeName, semantic, components }`（**不含原子层**：原子层是静态原始值，
> 需要时直接 `import { primitive }`；交互态透明度等也已放到语义层 `semantic.opacity`）；
> 内置 7 套主题（黄·默认 / 橙 / 粉 / 蓝 / 红 / 棕 / 绿），
> 可用 `QThemeProvider theme` + `setTheme()` 切换主题，
> 用 `overrides={{ 'color.brand.primary': '#EF4444' }}` / `setOverrides()` **按值覆盖语义层**，
> 带 `components.` 前缀的路径可以**覆盖组件 token**（`'components.button.height.6': 60`）；
> 组件内用 `useThemeConfig(theme?, componentName, overrides?)` 取「全局 token + 组件 token」。

---

## 一、基础

### `QText` · 文本

```ts
/**
 * 文本。统一排版的基础文本。
 *
 * 事件：`onPress`（点击）
 */
export interface QTextProps extends Omit<CommonProps, 'style'> {
  text: string;
  /** 排版 token 路径（语义层 `font.*`），如 'font.sys.body.m'、'font.number.5xl' */
  typography: TypographyPath;
  /** 文字颜色；省略用排版 token 自带的 color */
  color?: string;
  /** 超出行数后省略 */
  numberOfLines?: number;
  /** 点击 */
  onPress?: () => void;
  /** 文本样式（TextStyle，不是 ViewStyle） */
  style?: StyleProp<TextStyle>;
}
```

> `QText` **没有组件 token**：排版是语义层的资产，`typography` 直接引用
> `semantic.font.*` 路径（类型 `TypographyPath` 由字体树自动推导，拼错档位编译期报错）。

### `QIcon` · 图标

```ts
/**
 * 图标。矢量图标的统一出口。
 *
 * 事件：`onPress`（点击）
 */
export interface QIconProps extends CommonProps {
  /** 图标名 */
  name: IconName;
  /** 尺寸（px） */
  size?: number;
  /** 点击 */
  onPress?: () => void;
}
```

### `QLine` · 分割线

```ts
/**
 * 分割线。内容分组与视觉分隔。
 *
 * 事件：无
 */
export interface QLineProps extends CommonProps {
  /** 方向 */
  direction?: 'horizontal' | 'vertical';
  type: 'solid' | 'dashed' | 'dotted';
  level: 'level1' | 'level2';
  enhanced: boolean;
}
```

### `QImage` · 图片

```ts
/**
 * 图片。含占位、失败兜底与懒加载。
 *
 * 事件：`onLoad` / `onError` / `onPress`
 */
export interface QImageProps extends CommonProps {
  /** 图片地址 */
  src?: string;
  /** 占位图地址 */
  placeholder?: string;
  /** 加载失败兜底图 */
  fallback?: string;
  /** 填充模式 */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  /** 宽高比（宽 / 高） */
  aspectRatio?: number;
  /** 圆角（px） */
  borderRadius?: number;
  /** 加载完成 */
  onLoad?: () => void;
  /** 加载失败 */
  onError?: (error: unknown) => void;
  /** 点击 */
  onPress?: () => void;
}
```

### `QPrice` · 价格

```ts
/**
 * 价格。价格展示（符号 / 整数 / 小数 / 划线原价）。
 *
 * 事件：无
 */
export interface QPriceProps extends CommonProps {
  /** 现价（单位：元） */
  value: number;
  /** 原价；传入则显示划线价 */
  originalValue?: number;
  /** 货币符号 */
  symbol?: string;
  /** 金额字号档位 */
  size?: 'small' | 'medium' | 'large';
  /** 小数位数 */
  precision?: number;
}
```

### `QBadge` · 徽标

```ts
/**
 * 徽标。数值或小红点提示。
 *
 * 事件：无
 */
export interface QBadgeProps extends CommonProps {
  text: string;
  type: 'pill' | 'bubble';
}
```

### `QTag` · 标签

```ts
/**
 * 标签。状态或分类的轻量标记。
 *
 * 事件：`onPress` / `onClose`
 */
export interface QTagProps extends CommonProps {
  /** 文案 */
  text?: string;
  /** 类型（决定配色） */
  type?: 'common' | 'composite' | 'corner' | 'coupon';
  /** 尺寸档位 */
  size?: 'small' | 'medium' | 'large' | 'extralarge';
}
```

### `QIndicator` · 指示器

```ts
/**
 * 指示器。轮播 / 步骤的位置指示。
 *
 * 事件：`onChange`（可点击切换时）
 */
export interface QIndicatorProps extends CommonProps {
  type: 'dot' | 'scroll' | 'slide' | 'number' | 'text' | 'progress';
}
```

### `QLoading` · 加载

```ts
/**
 * 加载。加载中占位（转圈 / 骨架屏）。
 *
 * 事件：无
 */
export interface QLoadingProps extends CommonProps {
  /** 展示形态 */
  type?: 'spinner' | 'skeleton' | 'inline';
  /** 提示文案 */
  text?: string;
  /** 是否全屏遮罩 */
  fullscreen?: boolean;
}
```

---

## 二、表单

### `QInput` · 输入框

```ts
/**
 * 输入框。单行 / 多行文本录入。
 *
 * 事件：`onChange` / `onFocus` / `onBlur` / `onSubmit`
 */
export interface QInputProps extends CommonProps {
  /** 受控值 */
  value?: string;
  /** 非受控初始值 */
  defaultValue?: string;
  /** 占位文案 */
  placeholder?: string;
  /** 输入类型 */
  type?: 'text' | 'number' | 'password' | 'email';
  /** 最大长度 */
  maxLength?: number;
  /** 是否多行 */
  multiline?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否只读 */
  readOnly?: boolean;
  /** 前置图标 */
  prefixIcon?: IconName;
  /** 后置图标 */
  suffixIcon?: IconName;
  /** 值变化 */
  onChange?: (value: string) => void;
  /** 聚焦 */
  onFocus?: () => void;
  /** 失焦 */
  onBlur?: () => void;
  /** 键盘提交 */
  onSubmit?: (value: string) => void;
}
```

### `QCheckbox` · 复选框

```ts
/**
 * 复选框。多选与布尔勾选。
 *
 * 事件：`onChange`
 *
 * 原稿：`level`（大/中/小）/ `disable` / `checked` / `guide`。
 * 已按「命名已统一」改为 `size` / `disabled`。
 */
export interface QCheckboxProps extends CommonProps {
  /** 尺寸档位（原 `level`） */
  size?: 'small' | 'medium' | 'large';
  /** 是否禁用（原 `disable`） */
  disabled?: boolean;
  /** 是否选中（受控） */
  checked?: boolean;
  /** 非受控默认选中 */
  defaultChecked?: boolean;
  /** 引导文案 */
  guide?: string;
  /** 勾选变化 */
  onChange?: (checked: boolean) => void;
}
```

### `QSwitch` · 开关

```ts
/**
 * 开关。布尔状态切换。
 *
 * 事件：`onChange`
 */
export interface QSwitchProps extends CommonProps {
  /** 受控值 */
  value?: boolean;
  /** 非受控默认值 */
  defaultValue?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 加载中（切换请求未返回） */
  loading?: boolean;
  /** 尺寸档位 */
  size?: 'small' | 'medium' | 'large';
  /** 开启态背景色 */
  activeColor?: string;
  /** 值变化 */
  onChange?: (value: boolean) => void;
}
```

### `QStepper` · 步进器

```ts
/**
 * 步进器。数值增减。
 *
 * 事件：`onChange`
 */
export interface QStepperProps extends CommonProps {
  /** 当前值 */
  value?: number;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 步长 */
  step?: number;
  /** 小数位数 */
  precision?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 值变化 */
  onChange?: (value: number) => void;
}
```

### `QRate` · 评分

```ts
/**
 * 评分。星级评分。
 *
 * 事件：`onChange`
 */
export interface QRateProps extends CommonProps {
  /** 当前分值 */
  value?: number;
  /** 总分（星星总数） */
  count?: number;
  /** 是否允许半星 */
  allowHalf?: boolean;
  /** 是否只读 */
  readOnly?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 选中色 */
  color?: string;
  /** 分值变化 */
  onChange?: (value: number) => void;
}
```

### `QSearchBar` · 搜索栏

```ts
/**
 * 搜索栏。搜索关键词录入与提交。
 *
 * 事件：`onChange` / `onSearch` / `onClear` / `onCancel`
 */
export interface QSearchBarProps extends CommonProps {
  /** 受控值 */
  value?: string;
  /** 占位文案 */
  placeholder?: string;
  /** 是否显示取消按钮 */
  showCancel?: boolean;
  /** 取消按钮文案 */
  cancelText?: string;
  /** 输入变化 */
  onChange?: (value: string) => void;
  /** 提交搜索 */
  onSearch?: (value: string) => void;
  /** 清空 */
  onClear?: () => void;
  /** 取消 */
  onCancel?: () => void;
}
```

### `QTimePicker` · 时间选择

```ts
/**
 * 时间选择。日期 / 时间选择。
 *
 * 事件：`onChange` / `onConfirm` / `onClose`
 */
export interface QTimePickerProps extends CommonProps {
  /** 受控值（时间戳或 ISO 字符串） */
  value?: number | string;
  /** 选择模式 */
  mode?: 'date' | 'time' | 'datetime';
  /** 最小值 */
  min?: number | string;
  /** 最大值 */
  max?: number | string;
  /** 弹层是否可见（受控） */
  visible?: boolean;
  /** 值变化（滚动停止即回调） */
  onChange?: (value: string) => void;
  /** 确认 */
  onConfirm?: (value: string) => void;
  /** 关闭 */
  onClose?: () => void;
}
```

### `QForm` · 表单

```ts
/**
 * 表单。表单项布局、校验与提交的容器。
 *
 * 事件：`onSubmit` / `onValuesChange`
 */
export interface QFormProps<Values = Record<string, unknown>> extends CommonProps {
  /** 初始值 */
  initialValues?: Partial<Values>;
  /** 布局方向 */
  layout?: 'vertical' | 'horizontal';
  /** 校验规则：字段名 → 规则列表 */
  rules?: Record<string, FormRule[]>;
  /** 提交 */
  onSubmit?: (values: Values) => void;
  /** 任一字段变化 */
  onValuesChange?: (changed: Partial<Values>, values: Values) => void;
}

/** 单条校验规则 */
export interface FormRule {
  /** 是否必填 */
  required?: boolean;
  /** 校验失败提示 */
  message?: string;
  /** 正则校验 */
  pattern?: RegExp;
  /** 自定义校验；返回字符串表示失败原因，返回空表示通过 */
  validator?: (value: unknown) => Promise<string | undefined> | string | undefined;
}
```

### `QFilter` · 筛选

```ts
/**
 * 筛选。单维条件筛选。
 *
 * 事件：`onChange`
 */
export interface QFilterProps extends CommonProps {
  /** 可选项 */
  options: FilterOption[];
  /** 单选值 */
  value?: string;
  /** 多选值 */
  values?: string[];
  /** 是否多选 */
  multiple?: boolean;
  /** 选中变化 */
  onChange?: (value: string | string[]) => void;
}

/** 筛选项 */
export interface FilterOption {
  /** 值 */
  value: string;
  /** 展示文案 */
  label: string;
  /** 是否禁用 */
  disabled?: boolean;
}
```

### `QFilterPanel` · 筛选面板

```ts
/**
 * 筛选面板。多维条件筛选面板。
 *
 * 事件：`onChange` / `onConfirm` / `onReset` / `onClose`
 */
export interface QFilterPanelProps extends CommonProps {
  /** 分组维度 */
  groups: FilterGroup[];
  /** 已选条件：维度 key → 选中值 */
  value?: Record<string, string[]>;
  /** 弹层是否可见（受控） */
  visible?: boolean;
  /** 条件变化（即时生效） */
  onChange?: (value: Record<string, string[]>) => void;
  /** 确认 */
  onConfirm?: (value: Record<string, string[]>) => void;
  /** 重置 */
  onReset?: () => void;
  /** 关闭 */
  onClose?: () => void;
}

/** 筛选分组（一个维度） */
export interface FilterGroup {
  /** 维度 key */
  key: string;
  /** 维度名 */
  title: string;
  /** 该维度可选项 */
  options: FilterOption[];
  /** 该维度是否多选 */
  multiple?: boolean;
}
```

---

## 三、操作

### `QButton` · 按钮

```ts
/**
 * 按钮。触发操作的主控件。
 *
 * 事件：`onPress`（点击）
 */
export interface QButtonProps extends CommonProps {
  /** 层级 / 优先级，1 最低、6 最高；同时决定高度（28~48）与左右内边距（6~16） */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** 按钮类型（原「辅助」缺英文名，暂用 `tertiary` 💡） */
  type?: 'primary' | 'secondary' | 'tertiary';
  /** 主文案 */
  text?: string;
  /** 副文案（双行按钮，与 text 上下排布） */
  subText?: string;
  /** 后缀文案 */
  suffixText?: string;
  /** 副后缀文案 */
  subSuffixText?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 左侧图标 */
  leftIcon?: IconName;
  /** 右侧图标 */
  rightIcon?: IconName;
  /** 加载态（为 true 时自动禁用点击） */
  loading?: boolean;
  /** 点击 */
  onPress?: () => void;
}
```

### `QTextButton` · 文字按钮

```ts
/**
 * 文字按钮。弱化的纯文字操作入口。
 *
 * 事件：`onPress`（点击）
 *
 * 原稿：`level`（small|medium||large|extrlarge）/ `leftIcon` / `rightIcon` / `text`。
 * 已按「命名已统一」把 `level` 改为 `size` 并修正拼写。
 */
export interface QTextButtonProps extends CommonProps {
  /** 尺寸档位（原 `level`） */
  size?: 'small' | 'medium' | 'large' | 'extraLarge';
  /** 左侧图标 */
  leftIcon?: IconName;
  /** 右侧图标 */
  rightIcon?: IconName;
  /** 文案 */
  text?: string;
  /** 点击 */
  onPress?: () => void;
}
```

### `QFloatButton` · 悬浮按钮

```ts
/**
 * 悬浮按钮。页面级常驻的悬浮主操作。
 *
 * 事件：`onPress`（点击）
 */
export interface QFloatButtonProps extends CommonProps {
  /** 图标 */
  icon?: IconName;
  /** 文案（可选，与图标组合） */
  text?: string;
  /** 停靠位置 */
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  /** 距底部距离（px） */
  offsetBottom?: number;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 点击 */
  onPress?: () => void;
}
```

### `QMediaUpload` · 媒体上传

```ts
/**
 * 媒体上传。图片 / 视频的选择与上传。
 *
 * 事件：`onChange` / `onRemove` / `onError`
 */
export interface QMediaUploadProps extends CommonProps {
  /** 已选 / 已传文件 */
  value?: UploadFile[];
  /** 最大数量 */
  maxCount?: number;
  /** 可上传类型 */
  accept?: 'image' | 'video' | 'all';
  /** 单个文件大小上限（MB） */
  maxSizeMB?: number;
  /** 是否多选 */
  multiple?: boolean;
  /** 文件变化 */
  onChange?: (files: UploadFile[]) => void;
  /** 移除 */
  onRemove?: (file: UploadFile) => void;
  /** 上传失败 */
  onError?: (error: unknown) => void;
}

/** 已选 / 已上传文件 */
export interface UploadFile {
  /** 唯一标识 */
  uid: string;
  /** 本地路径或远端地址 */
  uri: string;
  /** 文件名 */
  name?: string;
  /** 字节大小 */
  size?: number;
  /** 上传状态 */
  status?: 'uploading' | 'done' | 'failed';
}
```

---

## 四、导航

### `QBottomTab` · 底部标签栏

```ts
/**
 * 底部标签栏。
 *
 * 事件：`onChange`（切换选中项）
 *
 * 高度 46 = 8（顶部间距）+ 24（icon 正方形）+ 14（文字行高）；
 * 选中态 / 未选中态图标**同时渲染**，用 `opacity` + `scale` 交叉切换。
 */
export interface QBottomTabProps extends CommonProps {
  /** 标签项（至少 1 个） */
  items: QBottomTabItem[];
  /** 受控选中项 key */
  value?: string;
  /** 非受控初始选中项；不传则选第一项 */
  defaultValue?: string;
  /** 选中项变化（受控 / 非受控都会触发） */
  onChange?: (key: string) => void;
}

/** 标准标签项 */
export interface QBottomTabItem {
  /** 唯一标识，也是 onChange 回传的值 */
  key: string;
  /** 文字：icon 下方，10 / 14 */
  label: string;
  /** 未选中态图标（内置图标名） */
  icon: IconName;
  /** 选中态图标（内置图标名） */
  activeIcon: IconName;
}
```

> 动画：未选中 → 选中时，选中 icon `scale 0 → 1.2`（`durationIn`）后**串行**回弹 `1.2 → 1`
> （`bounceDuration` = 50ms），`opacity 0 → 1`；未选中 icon `scale 1 → 0`、`opacity 1 → 0`。
> **文字不动画**，只切颜色（`colorActive` / `colorInactive` token）。

### `QTabs` · 标签页

```ts
/**
 * 标签页。同级内容的横向切换。
 *
 * 事件：`onChange`
 */
export interface QTabsProps extends CommonProps {
  /** 标签项 */
  items: TabItem[];
  /** 当前 key（受控） */
  value?: string;
  /** 非受控默认 key */
  defaultValue?: string;
  /** 是否可横向滚动 */
  scrollable?: boolean;
  /** 切换 */
  onChange?: (key: string) => void;
}

/** 标签项 */
export interface TabItem {
  /** 唯一 key */
  key: string;
  /** 标题 */
  title: string;
  /** 是否禁用 */
  disabled?: boolean;
}
```

### `QNavigation` · 导航栏

```ts
/**
 * 导航栏。页面顶部标题栏与返回操作。
 *
 * 事件：`onBack` / `onRightPress`
 */
export interface QNavigationProps extends CommonProps {
  /** 标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 是否显示返回按钮 */
  showBack?: boolean;
  /** 右侧操作项 */
  rightActions?: NavigationAction[];
  /** 是否透明背景（沉浸式） */
  transparent?: boolean;
  /** 返回 */
  onBack?: () => void;
  /** 右侧操作点击 */
  onRightPress?: (action: NavigationAction) => void;
}

/** 导航栏操作项 */
export interface NavigationAction {
  /** 唯一 key */
  key: string;
  /** 图标 */
  icon?: IconName;
  /** 文案 */
  text?: string;
}
```

### `QBottomTab` · 底部标签栏

```ts
/**
 * 底部标签栏。App 主框架的底部 Tab 切换。
 *
 * 事件：`onChange`
 */
export interface QBottomTabProps extends CommonProps {
  /** Tab 项 */
  items: BottomTabItem[];
  /** 当前 key */
  value?: string;
  /** 切换 */
  onChange?: (key: string) => void;
}

/** 底部 Tab 项 */
export interface BottomTabItem {
  /** 唯一 key */
  key: string;
  /** 文案 */
  text: string;
  /** 默认图标 */
  icon?: IconName;
  /** 选中态图标 */
  activeIcon?: IconName;
  /** 角标数字 */
  badge?: number;
}
```

### `QBottomBar` · 底部操作栏

```ts
/**
 * 底部操作栏。页面底部的操作区（按钮 / 工具栏）。
 *
 * 事件：`onPress`
 */
export interface QBottomBarProps extends CommonProps {
  /** 左侧自定义内容 */
  left?: ReactNode;
  /** 主操作按钮配置 */
  primaryAction?: QButtonProps;
  /** 次操作按钮配置 */
  secondaryAction?: QButtonProps;
  /** 是否吸底并留出安全区 */
  safeArea?: boolean;
  /** 按钮点击（未透传具体按钮回调时使用） */
  onPress?: (key: 'primary' | 'secondary') => void;
}
```

### `QRoundNavigation` · 圆形导航

```ts
/**
 * 圆形导航。沿圆周排布的导航控件。
 *
 * 事件：`onChange`
 */
export interface QRoundNavigationProps extends CommonProps {
  /** 导航项（沿圆周排布） */
  items: RoundNavigationItem[];
  /** 当前 key */
  value?: string;
  /** 半径（px） */
  radius?: number;
  /** 切换 */
  onChange?: (key: string) => void;
}

/** 圆形导航项 */
export interface RoundNavigationItem {
  /** 唯一 key */
  key: string;
  /** 图标 */
  icon?: IconName;
  /** 文案 */
  text?: string;
}
```

---

## 五、反馈与浮层

### `QToast` · 轻提示

```ts
/**
 * 轻提示。短时自动消失的轻量提示。
 *
 * 事件：`onClose`
 *
 * 另提供命令式调用：`Toast.show({ text: '已保存' })`
 */
export interface QToastProps extends CommonProps {
  /** 是否可见（组件式用法） */
  visible?: boolean;
  /** 文案 */
  text?: string;
  /** 图标类型 */
  icon?: 'success' | 'error' | 'info' | 'loading' | 'none';
  /** 自动关闭时长（ms）；0 表示不自动关闭 */
  duration?: number;
  /** 位置 */
  position?: 'top' | 'center' | 'bottom';
  /** 关闭 */
  onClose?: () => void;
}
```

### `QSnackbar` · 提示条

```ts
/**
 * 提示条。底部提示条，可带操作按钮。
 *
 * 事件：`onAction` / `onClose`
 */
export interface QSnackbarProps extends CommonProps {
  /** 是否可见 */
  visible?: boolean;
  /** 文案 */
  text?: string;
  /** 操作按钮文案 */
  actionText?: string;
  /** 自动关闭时长（ms）；0 表示不自动关闭 */
  duration?: number;
  /** 点击操作按钮 */
  onAction?: () => void;
  /** 关闭 */
  onClose?: () => void;
}
```

### `QDialog` · 对话框

```ts
/**
 * 对话框。需要用户确认的模态对话。
 *
 * 事件：`onConfirm` / `onCancel`
 */
export interface QDialogProps extends CommonProps {
  /** 是否可见 */
  visible?: boolean;
  /** 标题 */
  title?: string;
  /** 内容文案 */
  content?: string;
  /** 确认按钮文案 */
  confirmText?: string;
  /** 取消按钮文案 */
  cancelText?: string;
  /** 是否显示取消按钮 */
  showCancel?: boolean;
  /** 点击遮罩是否关闭 */
  maskClosable?: boolean;
  /** 确认 */
  onConfirm?: () => void;
  /** 取消 / 关闭 */
  onCancel?: () => void;
}
```

### `QModal` · 模态框

```ts
/**
 * 模态框。自定义内容的模态容器。
 *
 * 事件：`onClose`
 */
export interface QModalProps extends CommonProps {
  /** 是否可见 */
  visible?: boolean;
  /** 自定义内容 */
  children?: ReactNode;
  /** 弹出位置 */
  placement?: 'center' | 'bottom' | 'top';
  /** 点击遮罩是否关闭 */
  maskClosable?: boolean;
  /** 是否显示关闭按钮 */
  closable?: boolean;
  /** 关闭 */
  onClose?: () => void;
}
```

### `QBottomSheet` · 底部弹层

```ts
/**
 * 底部弹层。自底部升起的操作 / 内容弹层。
 *
 * 事件：`onClose`
 */
export interface QBottomSheetProps extends CommonProps {
  /** 是否可见 */
  visible?: boolean;
  /** 内容 */
  children?: ReactNode;
  /** 标题 */
  title?: string;
  /** 高度档位 */
  height?: 'auto' | 'half' | 'full';
  /** 点击遮罩是否关闭 */
  maskClosable?: boolean;
  /** 关闭 */
  onClose?: () => void;
}
```

### `QActionSheet` · 动作面板

```ts
/**
 * 动作面板。多项操作的动作列表弹层。
 *
 * 事件：`onSelect` / `onCancel`
 */
export interface QActionSheetProps extends CommonProps {
  /** 是否可见 */
  visible?: boolean;
  /** 标题 */
  title?: string;
  /** 动作项 */
  actions: ActionSheetItem[];
  /** 取消按钮文案 */
  cancelText?: string;
  /** 选中某项 */
  onSelect?: (item: ActionSheetItem, index: number) => void;
  /** 取消 / 关闭 */
  onCancel?: () => void;
}

/** 动作项 */
export interface ActionSheetItem {
  /** 唯一 key */
  key: string;
  /** 文案 */
  text: string;
  /** 是否危险操作（红色） */
  danger?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
}
```

### `QPopover` · 气泡浮层

```ts
/**
 * 气泡浮层。锚定元素的浮层内容。
 *
 * 事件：`onVisibleChange`
 */
export interface QPopoverProps extends CommonProps {
  /** 锤点内容 */
  children?: ReactNode;
  /** 浮层内容 */
  content?: ReactNode;
  /** 是否可见（受控） */
  visible?: boolean;
  /** 弹出方向 */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** 触发方式 */
  trigger?: 'press' | 'longPress';
  /** 显隐变化 */
  onVisibleChange?: (visible: boolean) => void;
}
```

### `QTooltip` · 文字提示

```ts
/**
 * 文字提示。悬停 / 长按的说明文字。
 *
 * 事件：`onVisibleChange`
 */
export interface QTooltipProps extends CommonProps {
  /** 提示文案 */
  content: string;
  /** 被提示的元素 */
  children?: ReactNode;
  /** 弹出方向 */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** 触发方式（Web 端通常为 hover） */
  trigger?: 'press' | 'longPress' | 'hover';
  /** 显隐变化 */
  onVisibleChange?: (visible: boolean) => void;
}
```

### `QNoticeBar` · 通知栏

```ts
/**
 * 通知栏。页内可关闭的横向通知条。
 *
 * 事件：`onPress` / `onClose`
 */
export interface QNoticeBarProps extends CommonProps {
  /** 单条文案 */
  text?: string;
  /** 多条文案（自动轮播） */
  list?: string[];
  /** 是否显示左侧图标 */
  showIcon?: boolean;
  /** 是否可关闭 */
  closable?: boolean;
  /** 是否滚动播放 */
  scrollable?: boolean;
  /** 点击 */
  onPress?: () => void;
  /** 关闭 */
  onClose?: () => void;
}
```

### `QNotificationBanner` · 通知横幅

```ts
/**
 * 通知横幅。顶部横幅通知（可含操作）。
 *
 * 事件：`onAction` / `onClose`
 */
export interface QNotificationBannerProps extends CommonProps {
  /** 是否可见 */
  visible?: boolean;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 类型（决定配色与默认图标） */
  type?: 'info' | 'success' | 'warning' | 'error';
  /** 操作按钮文案 */
  actionText?: string;
  /** 点击操作按钮 */
  onAction?: () => void;
  /** 关闭 */
  onClose?: () => void;
}
```

### `QEmptyState` · 空状态

```ts
/**
 * 空状态。无数据 / 无结果时的占位与引导。
 *
 * 事件：`onPress`
 */
export interface QEmptyStateProps extends CommonProps {
  /** 插图地址 */
  image?: string;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 操作按钮文案 */
  actionText?: string;
  /** 点击操作按钮 */
  onPress?: () => void;
}
```

### `QFeedback` · 反馈

```ts
/**
 * 反馈。用户意见 / 反馈提交。
 *
 * 事件：`onSubmit`
 */
export interface QFeedbackProps extends CommonProps {
  /** 反馈类型选项 */
  types?: string[];
  /** 当前选中的类型 */
  value?: string;
  /** 反馈内容 */
  content?: string;
  /** 最大字数 */
  maxLength?: number;
  /** 是否可上传截图 */
  uploadable?: boolean;
  /** 提交 */
  onSubmit?: (payload: {
    /** 反馈类型 */
    type?: string;
    /** 反馈内容 */
    content: string;
    /** 附件 */
    files?: UploadFile[];
  }) => void;
}
```

### `QNps` · 净推荐值

```ts
/**
 * 净推荐值（NPS）。打分 + 可选理由。
 *
 * 事件：`onSubmit`
 */
export interface QNpsProps extends CommonProps {
  /** 评分区间最小值（默认 0） */
  min?: number;
  /** 评分区间最大值（默认 10） */
  max?: number;
  /** 当前分值 */
  value?: number;
  /** 低分时的补充问题标题 */
  lowScoreTitle?: string;
  /** 低分时的原因选项 */
  lowScoreReasons?: string[];
  /** 提交 */
  onSubmit?: (payload: {
    /** 分值 */
    score: number;
    /** 低分原因 */
    reason?: string;
    /** 补充说明 */
    comment?: string;
  }) => void;
}
```

---

## 六、展示与业务

### `QList` · 列表

```ts
/**
 * 列表。通用列表容器（分组、加载更多、空态）。
 *
 * 事件：`onRefresh` / `onLoadMore` / `onItemPress`
 */
export interface QListProps<Item = unknown> extends CommonProps {
  /** 数据源 */
  data: Item[];
  /** 逐项渲染 */
  renderItem: (item: Item, index: number) => ReactNode;
  /** 列表 key 提取 */
  keyExtractor?: (item: Item, index: number) => string;
  /** 是否下拉刷新 */
  refreshable?: boolean;
  /** 是否加载更多 */
  loadMoreable?: boolean;
  /** 是否还有更多数据 */
  hasMore?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 分组数据（传则启用分组） */
  sections?: Array<{ title: string; data: Item[] }>;
  /** 空态文案 */
  emptyText?: string;
  /** 下拉刷新 */
  onRefresh?: () => void;
  /** 加载更多 */
  onLoadMore?: () => void;
  /** 点击某一项 */
  onItemPress?: (item: Item, index: number) => void;
}
```

### `QTitleModule` · 标题模块

```ts
/**
 * 标题模块。区块标题（主标题 + 副标题 + 右侧操作）。
 *
 * 事件：`onMorePress`
 */
export interface QTitleModuleProps extends CommonProps {
  /** 主标题 */
  title: string;
  /** 副标题 */
  subtitle?: string;
  /** 是否显示右侧更多 */
  showMore?: boolean;
  /** 右侧更多文案 */
  moreText?: string;
  /** 自定义右侧内容（传则覆盖 `moreText`） */
  extra?: ReactNode;
  /** 点击右侧更多 */
  onMorePress?: () => void;
}
```
