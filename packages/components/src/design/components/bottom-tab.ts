import type { FontToken } from './font';

/**
 * # ③ 组件层 · 底部标签栏（`bottomTab`）
 *
 * 几何**直接写数值**（46 / 24 / 8 / 14 是这条栏的规格，不从全局 spacing 取）；
 * 颜色写点分字符串；文字排版引用语义层 `font.sys.caption.xs`（**正好是 10/14**）。
 *
 * 高度是算出来的，不是拍脑袋：
 *
 * ```text
 * 46 = 8（iconGap，顶部间距）+ 24（iconSize，正方形图标）+ 14（labelHeight，文字行高）
 * ```
 *
 * ⚠️ 这些数值**不参与大屏换算**：底部标签栏贴屏幕底边、高度与安全区相关，
 * 用固定 px 更可控；需要整体放大时由使用方在外面套缩放容器。
 */
export const bottomTabTokens = {
  /** 整条 tab 的高度（px） */
  height: 46,

  /** 图标区的边长（px）：icon 与 activeIcon 都渲染成 24×24 的正方形 */
  iconSize: 24,

  /** 图标距容器顶部的间距（px） */
  iconGap: 8,

  /** 文字行高（px），同时就是文字区的高度 */
  labelHeight: 14,

  /**
   * 文字排版：语义层 `font.sys.caption.xs` —— fontSize 10 / lineHeight 14 / regular。
   *
   * 这里只借用它的字号、行高、字重；**颜色由下面两条按选中态覆盖**
   * （caption 自带的是次要色，选中态需要品牌色）。
   */
  labelFont: 'semantic.font.sys.caption.xs',

  /** 选中态文字色（品牌色） */
  colorActive: 'semantic.color.brand.primary',

  /** 未选中态文字色（次要文字色） */
  colorInactive: 'semantic.color.text.secondary',

  /** 整条 tab 的背景色 */
  background: 'semantic.color.background.white',

  /**
   * 选中动画的**峰值缩放**。
   *
   * 选中 icon 的缩放分**两段串行**（`Animated.sequence`）：
   * 1. `0 → popScale`，时长 `durationIn`；
   * 2. `popScale → 1`（回弹），时长 `bounceDuration`。
   *
   * 拆成两段而不是一条 `0 → 1.2 → 1` 的关键帧：回弹要短促（50ms）才能「弹」得利落，
   * 关键帧里两段共用同一条时间轴，回弹段会被拉得很慢、像抽帧。
   */
  popScale: 1.2,

  /** 进（未选中 → 选中）动画的**膨大段**时长（ms）：`0 → popScale` */
  durationIn: 100,

  /**
   * **回弹段**时长（ms）：`popScale → 1`，紧跟在膨大段之后串行执行。
   *
   * 刻意很短（50ms）：这一段才负责「弹」的手感，拉长反而变粘。
   */
  bounceDuration: 50,

  /** 出（选中 → 未选中）动画时长（ms）：只做缩小 / 淡出，不需要弹 */
  durationOut: 100,
};

/**
 * 底部标签栏 token **解析后**的字典类型。
 *
 * 同 `button`：源码里 `labelFont` 是路径字符串，解析后是 `FontToken`。
 */
export type BottomTabTokenDict = {
  height: number;
  iconSize: number;
  iconGap: number;
  labelHeight: number;
  labelFont: FontToken;
  colorActive: string;
  colorInactive: string;
  background: string;
  popScale: number;
  durationIn: number;
  bounceDuration: number;
  durationOut: number;
};
