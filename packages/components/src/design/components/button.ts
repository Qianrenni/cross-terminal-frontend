import type { TextStyle } from 'react-native';

/**
 * # ③ 组件层 · 按钮（`button`）
 *
 * **几何直接写数值**：这是按钮自己的尺寸，不从全局 token 取（改按钮尺寸就改这里）。
 * **颜色写点分字符串**：由 `theme.ts` 在运行时索引全局 token，组件层不 import 原始值。
 * **排版写语义层 `font.*` 路径**：如 `'semantic.font.sys.label.m'`，运行时解析成
 * `{ fontSize, lineHeight, fontWeight, letterSpacing, color }`。
 *
 * 高度、左右内边距、字号与行高都**按 `level` 分档**：`level` 越高，按钮越高、左右越宽、字越大。
 * 颜色不按 `level` 分档（同一 `type` 在任意档位都是同一个品牌原色）。
 */
export const buttonTokens = {
  /**
   * 高度（px），按 `level` 分档。
   *
   * 胶囊圆角就是**高度的一半**（见 `button/style.ts`）——只有正好一半，两端才是**半圆**。
   */
  height: { 1: 28, 2: 32, 3: 36, 4: 40, 5: 44, 6: 48 },

  /** 左右内边距（px），按 `level` 分档：等级越高越宽 */
  paddingHorizontal: { 1: 10, 2: 12, 3: 15, 4: 18, 5: 20, 6: 24 },

  /**
   * 主文案排版：**引用语义层 `font.sys.label` 的档位**（等级越高字号越大）。
   *
   * 这里是字符串路径，`theme.ts` 解析后 `theme.components.button.font[level]`
   * 就是一整份文字样式（字号 / 行高 / 字重 / 字距 / 颜色）。
   */
  font: {
    1: 'semantic.font.sys.label.2xs',
    2: 'semantic.font.sys.label.xs',
    3: 'semantic.font.sys.label.s',
    4: 'semantic.font.sys.label.m',
    5: 'semantic.font.sys.label.l',
    6: 'semantic.font.sys.label.xl',
  },

  /**
   * 副文案排版：引用语义层 `font.sys.caption`（辅助说明）。
   *
   * caption 只有 4 档，所以相邻 level 会复用同一档 —— 副文案本来就只做弱化，
   * 不必跟主文案一样级级不同。
   */
  subFont: {
    1: 'semantic.font.sys.caption.xs',
    2: 'semantic.font.sys.caption.s',
    3: 'semantic.font.sys.caption.m',
    4: 'semantic.font.sys.caption.m',
    5: 'semantic.font.sys.caption.l',
    6: 'semantic.font.sys.caption.l',
  },

  /** 双行时第二行的上边距（px）：负值 = 向上收，让两行排得更紧 */
  lineGap: -2,

  /** 线框宽度（px）：几何直接写数值（颜色在语义层） */
  borderWidth: 1,
  /** 图标与文字之间的间距（px） */
  iconGap: 2,
  /** 文案之间的横向间距（px）；以左右外边距实现（相邻时两侧相加） */
  textGap: 2,
};

/** 语义层字体 token（`semantic.font.*`）解析后的形状。 */
export interface FontToken {
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing: number;
  color: string;
  fontFamily?: string;
}

/**
 * 按钮 token **解析后**的字典类型。
 *
 * ⚠️ 不能用 `typeof buttonTokens`：源码里 `font` / `subFont` 是路径字符串，
 * 解析后是字体对象 —— 这是组件层唯一的「源码类型 ≠ 解析后类型」。
 */
export type ButtonTokenDict = {
  height: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
  paddingHorizontal: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
  font: Record<1 | 2 | 3 | 4 | 5 | 6, FontToken>;
  subFont: Record<1 | 2 | 3 | 4 | 5 | 6, FontToken>;
  lineGap: number;
  borderWidth: number;
  iconGap: number;
  textGap: number;
};
