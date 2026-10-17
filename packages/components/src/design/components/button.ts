/**
 * # ③ 组件层 · 按钮（`button`）
 *
 * **数值直接写**：这是按钮自己的几何，不从全局 token 取（改按钮间距就改这里）。
 * **颜色写点分字符串**：由 `theme.ts` 在运行时索引全局 token，组件层不 import 原始值。
 *
 * 高度与左右内边距都**按 `level` 分档**：`level` 越高，按钮越高、左右越宽。
 */
export const buttonTokens = {
  /**
   * 高度（px），按 `level` 分档。
   *
   * 胶囊圆角就是**高度的一半**（见 `button/style.ts`）——只有正好一半，两端才是**半圆**。
   */
  height: { 1: 28, 2: 32, 3: 36, 4: 40, 5: 44, 6: 48 },

  /** 左右内边距（px），按 `level` 分档：等级越高越宽 */
  paddingHorizontal: { 1: 6, 2: 8, 3: 10, 4: 12, 5: 14, 6: 16 },

  /** 双行时两行之间的间距（px） */
  lineGap: 2,
  /** 图标与文字之间的间距（px） */
  iconGap: 6,
  /** 文案之间的横向间距（px）；以左右外边距实现（相邻时两侧相加） */
  textGap: 4,
};

/** 按钮 token 的字典类型。 */
export type ButtonTokenDict = typeof buttonTokens;
