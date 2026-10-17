/**
 * 图标数据模型 —— `icons/` 下**一个图标一个文件**，每个文件都实现这个形状。
 *
 * ## 画布约定：默认 100×100
 *
 * 所有内置图标都按 **100 网格**画坐标（`DEFAULT_VIEW_BOX`）。
 *
 * ⚠️ 想改 `viewBox` 只应该改「**窗口**」（留白、裁切，例如 `'-6 -6 112 112'`），
 * **不要改坐标系比例**（别写 `'0 0 24 24'`）：描边粗细来自 `theme.components.icon.strokeWidth`，
 * 那三个数值是按 100 网格定标的（`thin 5 / regular 8 / bold 12`），
 * 换一套坐标比例，同一个 token 值画出来的粗细就完全对不上了。
 *
 * ## 渲染约定
 *
 * 一个图标最多三类路径，由渲染层（`../Icon.tsx`）按**固定顺序**翻译成 `<Path>`：
 *
 * 1. `fill`        → `fill={color}`，实心图形
 * 2. `stroke`      → `fill="none"` + `stroke={color}` + `strokeWidth`；写了 `dash` 就是虚线
 * 3. `solidStroke` → 同 2，但**永远实线**（忽略 `dash`）
 *
 * 三类都可以同时存在（如 `info` = 描边的圈 + 实心的点；`placeholder-line` = 虚线直边 + 实线圆角）；
 * 一条 `d` 里也可以用多段子路径（`M…Z M…Z`）画多个图形。
 *
 * 为什么要拆出两条描边：虚线是沿**整条路径**连续铺下去的，把「直边 + 圆角」写在同一条 `d` 里，
 * 虚线段会跨过圆角把它切成两半。要让「四角各是一整段不间断的圆弧、虚线只落在直边上」，
 * 就只能把它们分属两条路径。
 *
 * 除此之外的结构（`<Defs>` / 渐变 / `clipPath` / 每图形独立样式）当前**不支持**
 * —— 遇到再说，别偷偷塞进来。
 */

/** 描边粗细档位。实际数值来自 `theme.components.icon.strokeWidth`（可被主题覆盖）。 */
export type IconWeight = 'thin' | 'regular' | 'bold';

/** 默认画布。所有内置图标都按 100×100 画。 */
export const DEFAULT_VIEW_BOX = '0 0 100 100';

/** 单个图标的矢量描述。 */
export interface IconShape {
  /** 描边路径（渲染成 `fill="none"` + `stroke=color`），适合线性图标 */
  stroke?: string;
  /** 填充路径（渲染成 `fill=color`），适合实心图标 */
  fill?: string;
  /** 该图标自己的画布；省略则用 `DEFAULT_VIEW_BOX`（见文件头的约定） */
  viewBox?: string;
  /**
   * 该图标**固有**的描边粗细档位；省略按 `regular`。
   *
   * 这是「这个图标天生该多粗」，`QIcon` 的 `weight` prop 可以逐次覆盖它。
   */
  weight?: IconWeight;
  /**
   * 虚线：`strokeDasharray` 的数值（**viewBox 单位**），如 `[8, 6]`。
   *
   * 只对 `stroke` 路径有意义（`solidStroke` 永远实线）。数值按 **100 网格**给，
   * 与 `strokeWidth` token 同一套尺度，所以缩放时虚线的节奏也等比缩放。
   *
   * ⚠️ SVG 规则：长度为**奇数**时会被自动补成两遍（`[8]` 等价 `[8, 8]`），一般写偶数个值。
   */
  dash?: number[];
  /**
   * 第二条描边路径，**始终实线**（忽略 `dash`）。
   *
   * 用于「一部分要虚线、一部分要实线」的组合，样板见 `placeholder-line`
   * （四条虚线直边 + 四个整段实线圆角）。
   *
   * 颜色与粗细和 `stroke` 完全一致（都走 `strokeWidth`），渲染顺序在 `stroke` 之后。
   */
  solidStroke?: string;
}
