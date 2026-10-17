import React, { createContext, use, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { Dimensions, type ScaledSize } from 'react-native';

/**
 * 大屏适配：把 style 里的**长度类数值**按屏幕宽度整体缩放。
 *
 * ## 换算规则（以屏幕 `width` 为基准）
 *
 * | 宽度区间 | 缩放系数 |
 * | --- | --- |
 * | `w < 375` | `w / 375` |
 * | `375 ≤ w < 413` | `1`（不缩放） |
 * | `413 ≤ w < 440` | `w / 375 × 0.96` |
 * | `440 ≤ w < 800` | `1.03` |
 * | `800 ≤ w ≤ 880` | `1.2` |
 * | `w > 880` | `1.4` |
 *
 * 区间**左闭右开**，也就是每个分界点归属**后一档**（例如 375 归「不缩放」、800 归 1.2）。
 * 880 是唯一例外：它仍属 1.2 那档，> 880 才跳到 1.4。
 *
 * **取整**：换算结果一律向下取整（像素不保留小数）；负值先取绝对值取整，再还原符号
 * （`-2.8 → -2`，而不是 `floor(-2.8) = -3`）。
 * 如果取整后是 `0`（例如 `0.5 × 1.4 = 0.7 → 0`），则**保留原值**（`0.5`），
 * 否则细线 / 字距这类小于 1 的值会被抹成 0。
 *
 * ⚠️ 这是**分段常量**，所以分界点上有**跳变**（413 处从 1 跳到约 1.057、440 处回落到 1.03）。
 * 那是规则本身如此，不是实现取整造成的 —— 别「顺手修正」成连续函数。
 *
 * ## 换算哪些数值
 *
 * 只换算**长度类**属性（白名单见 `SCALABLE_NUMERIC_KEYS`）：尺寸 / 内外边距 / 间距 /
 * 字号行高字距 / 圆角 / 边框宽度 / 阴影半径与偏移 / `elevation`。
 *
 * **不换算**（无量纲或比例，缩放会改变语义）：
 * `opacity`、`flex` / `flexGrow` / `flexShrink`、`zIndex`、`aspectRatio`、`fontWeight`、
 * 以及所有字符串值（`'auto'`、`'50%'`、颜色…）。
 *
 * `transform` 按算子区分：`translateX` / `translateY` / `perspective` 是**长度** → 缩放；
 * `scale` / `rotate` / `skewX` / `skewY` / `matrix` 不是长度 → 原样保留。
 *
 * ## 用法
 *
 * 缩放必须发生在 `StyleSheet.create` **之前**：`create` 返回不透明 id（数字），
 * 拿不到里面的数值。所以约定是「**留朴素对象，用 hook 换算**」：
 *
 * ```tsx
 * const RAW_STYLES = { card: { padding: 16, borderRadius: 12 } }; // 模块级常量
 *
 * function Card() {
 *   const styles = useLargeScreenStyles(RAW_STYLES);
 *   return <View style={styles.card} />;
 * }
 * ```
 *
 * 不依赖 React 的地方直接用纯函数：`scaleStyles(RAW_STYLES, largeScreenScale(1024))`。
 *
 * ## 全局缓存
 *
 * `Dimensions` **只订阅一次**（模块级），**系数**存在全局快照里，组件通过
 * `useSyncExternalStore` 共享；宽度只在回调里用一下算系数，不保留。
 */

/** 换算基准宽度。 */
export const LARGE_SCREEN_BASE_WIDTH = 375;

/**
 * 大屏换算开关（默认 `true`）。
 *
 * 组件默认按窗口宽度换算；需要「固定 1 倍」时（如文档站 / 预览环境）
 * 用 `QLargeScreenProvider enabled={false}` 包一层即可，不用改任何组件。
 */
const LargeScreenEnabledContext = createContext(true);

/** `QLargeScreenProvider` 的属性。 */
export interface QLargeScreenProviderProps {
  /** `false` 时 `useLargeScreenScale()` 恒为 1（完全关闭换算） */
  enabled?: boolean;
  children?: ReactNode;
}

/**
 * 大屏换算开关的 Provider。
 *
 * React 19 写法：Context 本身作为 Provider（`<Context value>`）。
 */
export function QLargeScreenProvider({ enabled = true, children }: QLargeScreenProviderProps) {
  return <LargeScreenEnabledContext value={enabled}>{children}</LargeScreenEnabledContext>;
}

/** 当前是否启用大屏换算（不包 Provider 时默认 `true`）。 */
export function useLargeScreenEnabled(): boolean {
  return use(LargeScreenEnabledContext);
}

/**
 * 需要换算的数值属性（白名单）。
 *
 * 用**白名单**而不是黑名单：将来 RN 新增属性时，宁可不缩放也不要误缩放
 * （误缩 `opacity` 这类无量纲值的后果比漏缩放一个尺寸尴尬得多）。
 */
const SCALABLE_NUMERIC_KEYS: ReadonlySet<string> = new Set([
  // —— 尺寸 ——
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'flexBasis',
  // 图标 token 用 `size` 表示边长（不是 RN style 键，但也是长度；`strokeWidth` 是 viewBox 单位，不在此列）
  'size',
  // —— 定位 ——
  'top',
  'right',
  'bottom',
  'left',
  'start',
  'end',
  // —— 外边距 / 内边距 / 间距 ——
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'marginHorizontal',
  'marginVertical',
  'marginStart',
  'marginEnd',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'paddingHorizontal',
  'paddingVertical',
  'paddingStart',
  'paddingEnd',
  'gap',
  'rowGap',
  'columnGap',
  // —— 文字 ——
  'fontSize',
  'lineHeight',
  'letterSpacing',
  // —— 边框 / 圆角 ——
  'borderWidth',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStartWidth',
  'borderEndWidth',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderTopStartRadius',
  'borderTopEndRadius',
  'borderBottomStartRadius',
  'borderBottomEndRadius',
  // —— 阴影 ——
  'shadowRadius',
  'textShadowRadius',
  'elevation',
  // —— transform 里的**长度**算子（scale / rotate / skew / matrix 不是长度，不在白名单） ——
  'translateX',
  'translateY',
  'perspective',
]);

/**
 * 按屏幕宽度算缩放系数。
 *
 * 非法输入（`NaN` / `Infinity` / `<= 0`，比如首帧拿不到宽度）一律退回 `1`，
 * 宁可不错缩放。
 */
function computeScale(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 1;
  if (width < 375) return width / LARGE_SCREEN_BASE_WIDTH;
  if (width < 413) return 1;
  if (width < 440) return (width / LARGE_SCREEN_BASE_WIDTH) * 0.96;
  if (width < 800) return 1.03;
  if (width <= 880) return 1.2;
  return 1.4;
}

/**
 * 按屏幕宽度算缩放系数（纯函数，不做缓存）。
 *
 * 组件不要直接调它 —— 用 `useLargeScreenScale()`，那里走的是**全局缓存好的系数**。
 */
export function largeScreenScale(width: number): number {
  return computeScale(width);
}

/**
 * 全局缓存的**系数**（不是宽度）。
 *
 * - `Dimensions` 只订阅一次，宽度只在回调里用一下，算出系数就丢掉；
 * - 系数没变就不通知任何组件（同一档位内改窗口宽度不会引发重渲染）。
 */
let currentScale = computeScale(Dimensions.get('window').width);
const scaleListeners = new Set<() => void>();

Dimensions.addEventListener('change', ({ window }: { window: ScaledSize }) => {
  const nextScale = computeScale(window.width);
  if (nextScale === currentScale) return;

  currentScale = nextScale;
  scaleListeners.forEach((listener) => listener());
});

/** 订阅全局系数（`useSyncExternalStore` 需要）。 */
function subscribeScale(listener: () => void): () => void {
  scaleListeners.add(listener);

  return () => {
    scaleListeners.delete(listener);
  };
}

/** 读取全局系数快照（服务端 / 首次渲染同值）。 */
function getScaleSnapshot(): number {
  return currentScale;
}

/**
 * 换算单个数值。
 *
 * 换算结果一律**向下取整**（像素不保留小数）；负数先取绝对值取整再还原符号：
 * `-2.8 → -2`（而不是 `floor(-2.8) = -3`，否则负 margin / 负偏移会比预期多跑一像素）。
 * 取整后为 `0` 时（`0.5 × 1.4 = 0.7`）**保留原值**，避免把字距 / 细线抹掉。
 * `0` 直接返回，同时避开 `-0`。
 */
export function scaleValue(value: number, scale: number): number {
  if (value === 0) return 0;
  const scaled = Math.floor(Math.abs(value) * scale);
  // 0.几 乘完取整成 0 → 保留原值（不能把 0.5 变成 0）
  if (scaled === 0) return value;
  return value < 0 ? -scaled : scaled;
}

/** 递归换算一层样式对象；不认识的键原样保留。 */
function scaleRecord(record: Record<string, unknown>, scale: number): Record<string, unknown> {
  const next: Record<string, unknown> = {};

  for (const key of Object.keys(record)) {
    const value = record[key];

    if (typeof value === 'number') {
      next[key] = SCALABLE_NUMERIC_KEYS.has(key) ? scaleValue(value, scale) : value;
      continue;
    }

    // 嵌套对象（如 `shadowOffset: { width, height }`）和数组（如 `transform: [{ translateX }]`）
    // 都递归下去，仍然只按白名单决定谁被换算：
    // `transform` 里 `translateX/Y` / `perspective` 会缩放，
    // 而 `scale` / `rotate` / `skewX` / `matrix` 不是长度，原样保留。
    if (Array.isArray(value)) {
      next[key] = value.map((item) => scaleStyle(item, scale));
      continue;
    }

    if (value !== null && typeof value === 'object') {
      next[key] = scaleRecord(value as Record<string, unknown>, scale);
      continue;
    }

    next[key] = value;
  }

  return next;
}

/**
 * 换算一个 style。
 *
 * 支持单个样式对象、样式数组（`[a, b]`）、以及数组里的假值（`false` / `undefined`），
 * 与 RN 的 `StyleProp` 用法对齐。`StyleSheet.create` 产出的**数字 id 会被原样返回**
 * （拿不到内部数值），所以务必在 `create` 之前换算。
 */
export function scaleStyle<T>(style: T, scale: number): T {
  if (Array.isArray(style)) {
    return style.map((item) => scaleStyle(item, scale)) as unknown as T;
  }

  if (style === null || typeof style !== 'object') return style;

  return scaleRecord(style as Record<string, unknown>, scale) as unknown as T;
}

/** 批量换算一组命名样式：`{ container: {...}, title: {...} }`。 */
export function scaleStyles<T extends object>(styles: T, scale: number): T {
  const next: Record<string, unknown> = {};

  for (const name of Object.keys(styles)) {
    next[name] = scaleStyle((styles as Record<string, unknown>)[name], scale);
  }

  return next as T;
}

/**
 * 当前缩放系数。
 *
 * 直接读**全局缓存的系数**（见上方 `currentScale`）：全部组件共享同一个 Dimensions 监听，
 * 同一档位内宽度变化不会引发重渲染。
 * 被 `QLargeScreenProvider enabled={false}` 包住时恒为 1。
 */
export function useLargeScreenScale(): number {
  const scale = useSyncExternalStore(subscribeScale, getScaleSnapshot, getScaleSnapshot);
  const enabled = useLargeScreenEnabled();

  return enabled ? scale : 1;
}

/**
 * 把一组朴素样式按当前屏幕宽度换算，并**按系数缓存**。
 *
 * 入参请用**模块级常量**（引用稳定），否则每次渲染都会重新算一遍。
 */
export function useLargeScreenStyles<T extends object>(styles: T): T {
  const scale = useLargeScreenScale();

  return useMemo(() => scaleStyles(styles, scale), [styles, scale]);
}

/**
 * 换算**单个** style（对象 / 样式数组都行），开关与系数全在 hook 内部处理。
 *
 * 组件不需要自己拿系数：
 *
 * ```tsx
 * const variant = useMemo(() => buttonVariantStyle(theme, props), [theme, props]);
 * const { container } = useLargeScreenStyle(variant);
 * ```
 */
export function useLargeScreenStyle<T>(style: T): T {
  const scale = useLargeScreenScale();

  return useMemo(() => scaleStyle(style, scale), [style, scale]);
}

/**
 * 把**单个数值**按当前大屏系数换算（开关与外扩规则同 `scaleValue`）。
 *
 * 适合组件里的非 style 数值（热区外扩量、自定义几何参数等）：
 *
 * ```tsx
 * const gap = useLargeScreenValue(8); // 大屏下按当前系数取整，关闭时原样返回
 * ```
 */
export function useLargeScreenValue(value: number): number {
  const scale = useLargeScreenScale();

  return useMemo(() => scaleValue(value, scale), [value, scale]);
}
