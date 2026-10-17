/**
 * # ③ 组件层 · 图标（`icon`）
 *
 * **数值直接写**；**颜色用点分字符串索引全局 token**（`'semantic.color.text.primary'`），
 * 由 `theme.ts` 在运行时解析 —— 所以换主题 / 覆盖时，图标颜色自动跟着变，
 * 组件层不需要 import `primitive`。
 */
export const iconTokens = {
  /** 默认尺寸（px） */
  size: 20,

  /** 默认颜色：主文字色（全局语义 token，点分字符串） */
  color: 'semantic.color.text.primary',

  /** 描边粗细：**100×100 画布上的单位**（不是 px），三档约等于 1.2 / 2 / 3 个视觉 px */
  strokeWidth: { thin: 5, regular: 8, bold: 12 },
};

/** 图标 token 的字典类型。 */
export type IconTokenDict = typeof iconTokens;
