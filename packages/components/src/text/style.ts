import type { TextStyle } from 'react-native';
import type { FontToken } from '@/design/components/font';
import type { ThemeConfig } from '@/design/theme';
import type { QTextProps, TypographyPath } from './type';

/** 判定一个解析结果是不是字体 token（语义层里字体档位与色值混在一起，必须收窄）。 */
function isFontToken(value: unknown): value is FontToken {
  return (
    typeof value === 'object' &&
    value != null &&
    typeof (value as FontToken).fontSize === 'number' &&
    typeof (value as FontToken).lineHeight === 'number'
  );
}

/**
 * 沿 `font.sys.body.m` 这样的路径在**已解析的语义层**里取字体 token。
 *
 * 为什么运行时解析而不是编译期展开：`typography` 是调用方传进来的字符串，
 * 只能拿当前主题的 `theme.semantic` 现查。
 */
export function fontTokenOf(theme: ThemeConfig, path: TypographyPath): FontToken | undefined {
  const value = path
    .split('.')
    .reduce<unknown>(
      (node, key) => (node == null ? undefined : (node as Record<string, unknown>)[key]),
      theme.semantic,
    );

  return isFontToken(value) ? value : undefined;
}

/**
 * **本组件唯一的「读主题处」**：把 `typography` 路径解析成最终文字样式。
 *
 * 颜色优先级：`props.color` → 排版 token 自带的 `color`
 * （`caption` 系是次要色，`label` 系是主文字色）。
 *
 * 路径查不到时（历史数据 / 绕过类型的 JS 调用）回落到语义层的正文档位，
 * 而不是渲染成「没有字号」的空文本。
 *
 * 返回**朴素对象**（不是 `StyleSheet.create` 的结果）：大屏换算要在 `create` 之前拿到数值，
 * 由组件里的 `useLargeScreenStyle` 统一缩放 `fontSize` / `lineHeight` / `letterSpacing`。
 */
export function textStyleOf(
  theme: ThemeConfig,
  { typography, color }: Pick<QTextProps, 'typography' | 'color'>,
): TextStyle {
  const { font } = theme.semantic;
  const token = fontTokenOf(theme, typography) ?? font.sys.body.m;
  const { color: tokenColor, fontFamily, ...rest } = token;

  return {
    ...rest,
    ...(fontFamily == null ? null : { fontFamily }),
    color: color ?? tokenColor,
  };
}
