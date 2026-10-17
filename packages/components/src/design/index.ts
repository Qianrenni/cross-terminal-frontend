/**
 * # 设计系统
 *
 * 三层，层层递进，**全部是字典**（没有工厂、没有手写类型）：
 *
 * ```ts
 * // ① 原子层：一个巨大的字典（纯值）
 * primitive.color.yellow['500']        // '#FFD100'（美团黄）
 * primitive.spacing.m                  // 10
 *
 * // ② 语义层：一堆「路径」（动态读取原子层）
 * semantic.color.brand.primary         // 'primitive.color.yellow.500'
 * semantic.font.sys.body.m.fontSize    // 'primitive.font.size.15'
 *
 * // ③ 组件层：同样是路径
 * components.button.paddingVertical    // 'primitive.spacing.m'
 *
 * // 主题：把路径解析成值（运行时解析 + 覆盖）
 * const theme = getTheme('blue');
 * theme.semantic.color.brand.primary   // '#3B82F6'（已解析）
 * theme.components.button.radius       // 21
 * ```
 *
 * 组件里**不要**直接用 `primitive` / `semantic` 取色，用 `useTheme()` 或
 * `useThemeConfig(theme?, 组件名, overrides?)` 拿到**当前主题**的值。
 */

/* ① 原子层 */
export { primitive } from './primitive';
export type { Primitive } from './primitive';

/* ② 语义层 */
export { semantic } from './semantic';
export type { SemanticDict } from './semantic';

/* ③ 组件层 */
export { components } from './components';
export type { ComponentDict } from './components';

/* 主题：解析 / 缓存 / 覆盖 */
export {
  DEFAULT_THEME_NAME,
  THEME_NAMES,
  defaultTheme,
  getTheme,
  resolveTheme,
  withOverrides,
} from './theme';
export type { Components, Semantic, ThemeConfig, ThemeName, ThemeOverrides } from './theme';

/* 运行时 */
export { QThemeProvider, useQTheme, useTheme, useThemeConfig } from './context';
export type { QThemeContextValue, QThemeProviderProps, ThemeConfigResult } from './context';

/* 工具 */
export { withAlpha } from './color';
