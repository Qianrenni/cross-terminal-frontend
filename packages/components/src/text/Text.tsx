import React, { memo, useMemo } from 'react';
import { Pressable, Text, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '@/design/context';
import { useLargeScreenStyle } from '@/utils/large-screen';
import { textStyleOf } from './style';
import type { QTextProps } from './type';

function QTextImpl({
  text,
  typography,
  color,
  numberOfLines,
  onPress,
  theme: themeOverride,
  style,
  testID,
  accessibilityLabel,
}: QTextProps) {
  /**
   * 排版全部来自语义层，没有组件 token，所以直接取当前主题；
   * `theme` prop（完整 `ThemeConfig`）仍然优先生效，与其它组件一致。
   *
   * ⚠️ `useTheme()` 必须无条件调用（hooks 规则），不能写成 `themeOverride ?? useTheme()`。
   */
  const contextTheme = useTheme();
  const theme = themeOverride ?? contextTheme;

  const rawStyle = useMemo(
    () => textStyleOf(theme, { typography, color }),
    [theme, typography, color],
  );
  /** 大屏换算：`fontSize` / `lineHeight` / `letterSpacing` 等比缩放，颜色不受影响 */
  const resolvedStyle = useLargeScreenStyle(rawStyle);

  /** 调用方的 `style` 放在后面，所以能覆盖排版 token 的同名属性 */
  const textStyle: StyleProp<TextStyle> = [resolvedStyle, style];
  /** 文本本身就是内容，没给标签时读屏直接念文字 */
  const label = accessibilityLabel ?? text;

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
      >
        <Text style={textStyle} numberOfLines={numberOfLines}>
          {text}
        </Text>
      </Pressable>
    );
  }

  return (
    <Text
      testID={testID}
      accessibilityLabel={label}
      style={textStyle}
      numberOfLines={numberOfLines}
    >
      {text}
    </Text>
  );
}

/**
 * 文本。统一排版的基础文本。
 *
 * 排版只由 `typography`（语义层字体路径，如 `'font.sys.body.m'`）决定；
 * 颜色默认取该排版 token 自带的色（`caption` 系是次要色、`label` 系是主文字色）。
 *
 * 用 `memo` 包裹，理由同 `QButton` / `QIcon`。
 */
export const QText = memo(QTextImpl);

// memo 包裹后 DevTools / 报错信息里显示的是内部函数名，改回对外名。
QText.displayName = 'QText';
