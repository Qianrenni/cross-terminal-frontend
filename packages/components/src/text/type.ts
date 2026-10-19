import type { StyleProp, TextStyle } from 'react-native';
import type { FontToken } from '@/design/components/font';
import type { Semantic } from '@/design/theme';
import type { CommonProps } from '@/types';

/**
 * 把 `{ a: { b: FontToken } }` 摊成 `'a.b'` 这样的**路径联合**。
 *
 * 终止条件写死 `T[K] extends FontToken`：字体树只有三层（族 / 分组 / 档位），
 * 档位值就是 `FontToken`，这里必须显式停下，否则会一路摊到
 * `'font.sys.body.m.fontSize'` 这种毫无意义的路径上。
 */
type DottedPath<T> = {
  [K in keyof T & string]: T[K] extends FontToken
    ? K
    : T[K] extends Record<string, unknown>
      ? `${K}.${DottedPath<T[K]>}`
      : K;
}[keyof T & string];

/**
 * 合法的排版 token 路径，取值来自**语义层字体树**（`semantic.font.*`）：
 *
 * ```ts
 * 'font.sys.display.xxl' | … | 'font.sys.label.m' | … | 'font.number.5xl' | 'font.brand.body.s' | …
 * ```
 *
 * 前缀固定是 `font.`（就是 `semantic.font` 去掉 `semantic.`），所以拼错档位
 * （`'font.sys.label.huge'`）会在**编译期**报错，编辑器也能自动补全 ——
 * 和 `IconName = keyof ICON_PATHS` 是同一个思路。
 */
export type TypographyPath = `font.${DottedPath<Semantic['font']>}`;

/**
 * 文本。统一排版的基础文本。
 *
 * 事件：`onPress`（点击，此时外层是 `Pressable`）
 *
 * 排版：**只由 `typography` 决定**（语义层字体路径，如 `'font.sys.body.m'`）。
 * `QText` **没有自己的组件 token** —— 排版是全局语义层的资产，没必要在组件层再抄一份；
 * 想换排版就传另一个路径。
 *
 * ⚠️ 与 `COMPONENT.md` 的偏差（同 `QIcon` 的 `color`）：
 * 1. 多了 `typography` / `color`：排版与颜色的显式入口，避免只能靠 `style` 拼；
 * 2. `style` 是 `TextStyle` 而不是 `CommonProps` 的 `ViewStyle` —— 文本的样式
 *    （颜色、字重、对齐）都长在 `TextStyle` 上，用 `ViewStyle` 反而传不进去。
 */
export interface QTextProps extends Omit<CommonProps, 'style'> {
  /** 文本内容（纯字符串；富文本请自己拼 `Text` 嵌套） */
  text: string;
  /** 排版 token 路径，如 `'font.sys.body.m'`、`'font.number.5xl'` */
  typography: TypographyPath;
  /** 文字颜色；省略则用排版 token 自带的 `color`（caption 系是次要色） */
  color?: string;
  /** 超出行数后省略 */
  numberOfLines?: number;
  /** 点击 */
  onPress?: () => void;
  /** 自定义文本样式（会覆盖排版 token 的同名属性） */
  style?: StyleProp<TextStyle>;
}
