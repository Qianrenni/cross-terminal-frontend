import type { ComponentType } from 'react';
import type { ThemeConfig } from '@cross-terminal/components';

/**
 * 配置式 Demo 的类型。
 *
 * 思路：不对组件做运行时反射（TS 的类型在运行时已被擦除，拿不到 prop 名与取值），
 * 而是**手写一份 schema** 描述「这个组件有哪些 prop 可以调」，
 * 页面据此自动生成控件面板 + 实时预览 + 示例代码。
 *
 * 新增一个组件 = 写一份 `ComponentDemo` + 在 `registry.ts` 里登记一行。
 */

/** 控件值（都是标量，便于做受控输入） */
export type DemoValue = string | boolean | number;

/** 控件值集合，key 为 prop 名 */
export type DemoValues = Record<string, DemoValue>;

/** 下拉选项 */
export interface DemoOption {
  /** 展示文案 */
  label: string;
  /** 控件值 */
  value: string;
  /**
   * 生成示例代码时这条选项对应的**属性写法**。
   *
   * - 省略：按默认规则生成（如 `type="primary"`）；
   * - 空字符串 `''`：该选项**不出现在代码里**（用于「无」这类选项）；
   * - 其他：**原样使用**，用于不能直接写成标量的 prop，如
   *   `'leftIcon={<Text>◀</Text>}'`。
   */
  code?: string;
}

interface DemoControlBase {
  /** prop 名（与组件 props 一致） */
  name: string;
  /** 控件标签 */
  label: string;
  /** 补充说明 */
  hint?: string;
  /**
   * **当取值等于它时，示例代码里不写这个 prop**。
   *
   * ⚠️ 别和 `defaultValue` 搞混：两者含义不同。
   * `defaultValue` 是**控件初始值**（给 UI 用）；`omitWhen` 是**"等于组件自己的默认值"**
   * （只有这种情况省略才不影响代码语义）。
   *
   * 例如 `QButton` 的 `type` 两者都是 `'primary'`，所以可以省；
   * 而 `QIcon` 的 `name` 必填，**不能省**，于是它只给 `defaultValue`、不给 `omitWhen`。
   *
   * 默认**不写**该字段 —— 即**默认不省略**。宁可代码冗一点，也不能把必填 prop 吃掉。
   */
  omitWhen?: string | boolean | number;
}

/** 单行文本 */
export interface TextControl extends DemoControlBase {
  kind: 'text';
  defaultValue: string;
}

/** 开关 */
export interface BooleanControl extends DemoControlBase {
  kind: 'boolean';
  defaultValue: boolean;
}

/** 数字（可限定范围与步长） */
export interface NumberControl extends DemoControlBase {
  kind: 'number';
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
}

/** 下拉单选 */
export interface SelectControl extends DemoControlBase {
  kind: 'select';
  defaultValue: string;
  options: DemoOption[];
}

/** 一个可配置的 prop */
export type DemoControl = TextControl | BooleanControl | NumberControl | SelectControl;

/**
 * 一个组件的配置式 Demo。
 *
 * 泛型 `P` 是该组件的 props：这样 demo 文件里 `toProps` 的返回值与 `Component`
 * 都按真实 props 校验（遗漏 / 拼错 prop 会直接报错），而不用退化成 `Record<string, unknown>`
 * —— `interface` 没有索引签名，泛型是唯一既精确又能过类型检查的写法。
 */
export interface ComponentDemo<P extends object = object> {
  /** 路由 key（小写，与组件目录名一致），如 `button` → `#/button` */
  key: string;
  /** 展示名（= 导出名），如 `QButton` */
  name: string;
  /** 一句话说明 */
  description: string;
  /** 可配置的 prop 列表 */
  controls: DemoControl[];
  /** 被演示的组件；预览区会渲染 `<Component {...props} />` */
  Component: ComponentType<P>;
  /**
   * 控件值 → 组件 props。
   *
   * 标量 prop 直接透传即可；`ReactNode` 这类没法用输入框表达的，
   * 在这里由下拉选项映射成节点。
   *
   * **颜色 / 字体这类主题派生值必须用第二个参数 `theme` 现算**，
   * 不能在模块顶层 `getTheme(DEFAULT_THEME_NAME)` 冻一份 —— 那样切主题时预览不会变色。
   */
  toProps: (values: DemoValues, theme: ThemeConfig) => P;
  /**
   * 自定义示例代码（可选）。
   *
   * 默认由 `controls` 自动生成；**带 `children` 的组件**没法用标量控件拼出来
   * （如 `QHotzone`），在各自的 demo 文件里手写一份。
   */
  renderCode?: (values: DemoValues) => string;
}

/**
 * 注册表用的「异构」demo 类型。
 *
 * 注册表要同时装不同 props 的组件，这里无法表达存在类型，只能 `any`。
 * 这是本包**唯一**允许 `any` 的地方，且各 demo 文件内部仍是精确类型的。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponentDemo = ComponentDemo<any>;

/** 由控件定义生成初始值。 */
export function initialValues(controls: DemoControl[]): DemoValues {
  return Object.fromEntries(controls.map((control) => [control.name, control.defaultValue]));
}
