import React, { memo, useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useThemeConfig } from '@/design/context';
import { buttonStylesOf, buttonVariantStyle } from './style';
import type { QButtonProps } from './type';

function QButtonImpl({
  level = 6,
  type = 'primary',
  text,
  subText,
  suffixText,
  subSuffixText,
  disabled = false,
  leftIcon,
  rightIcon,
  loading = false,
  onPress,
  theme: themeOverride,
  style,
  testID,
  accessibilityLabel,
}: QButtonProps) {
  const inactive = disabled || loading;

  /**
   * 全局语义 token + 按钮 token。
   * 优先用组件自己的 `theme` prop（局部覆盖），否则跟随 `QThemeProvider`。
   */
  const { theme } = useThemeConfig(themeOverride, 'button');
  const styles = buttonStylesOf(theme);

  /**
   * 变体样式：每次调用都会新建一个数组 + 一个对象，而结果只由这几个值决定，所以缓存。
   * ⚠️ `style` 若是调用方每次重渲染新建的数组，本缓存会一直失效 —— 那是调用方的责任。
   */
  const { container, frame, foreground, subtle } = useMemo(
    () => buttonVariantStyle(theme, { level, type, inactive, style }),
    [theme, level, type, inactive, style],
  );

  // 这里刻意**没有**用 useCallback 包 `Pressable` 的 style 回调：
  // Pressable 自身没有 memo，回调引用变不变都不会省下渲染，包了只是给依赖数组添维护成本。

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? text}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [container, pressed && !inactive && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={foreground} style={styles.leading} />
      ) : (
        leftIcon != null && <View style={styles.leading}>{leftIcon}</View>
      )}

      <View style={styles.content}>
        <View style={styles.row}>
          {text != null && (
            <Text style={[styles.text, { color: foreground }]} numberOfLines={1}>
              {text}
            </Text>
          )}
          {suffixText != null && (
            <Text style={[styles.text, { color: foreground }]}>{suffixText}</Text>
          )}
        </View>

        {(subText != null || subSuffixText != null) && (
          <View style={styles.row}>
            {subText != null && (
              <Text style={[styles.subText, { color: subtle }]} numberOfLines={1}>
                {subText}
              </Text>
            )}
            {subSuffixText != null && (
              <Text style={[styles.subText, { color: subtle }]}>{subSuffixText}</Text>
            )}
          </View>
        )}
      </View>

      {rightIcon != null && <View style={styles.trailing}>{rightIcon}</View>}

      {/* 线框最后渲染，盖在背景与内容之上；`pointerEvents="none"` 让它不抢触摸 */}
      {frame != null && <View pointerEvents="none" style={frame} />}
    </Pressable>
  );
}

/**
 * 按钮。触发操作的主控件。Props 见 `./type.ts` 的 {@link QButtonProps}。
 *
 * 事件：`onPress`（点击）
 *
 * 本文件只管**结构与交互**；样式计算与 token 读取全在 `./style.ts`。
 *
 * 主题：颜色与字体来自 `useTheme()`（第 ② / ③ 层），所以切换主题会**即时**生效。
 *
 * 用 `memo` 包裹：父组件重渲染时 props 浅比较相等，整棵子树直接跳过。
 *
 * ⚠️ **浅比较的代价**：引用类 props 每次新建就会让 memo 失效，调用方应把
 * `onPress` 包 `useCallback`、`style` 用常量或 `useMemo`，
 * `leftIcon` / `rightIcon` 也别在 render 里 `createElement`
 * （它们目前是 `ReactNode`；等图标系统就绪、收敛为 `IconName` 后就自然稳定了）。
 *
 * ⚠️ 也**没有**自定义 `propsAreEqual`：那要把 14 个 prop 全列一遍，漏一个就会
 * 「prop 改了但不更新」—— 比多渲染几次严重得多。默认浅比较就够了。
 * （副作用：`<QButton />` 与 `<QButton level={6} />` 会因 `undefined !== 6` 多渲染一次，无害。）
 */
export const QButton = memo(QButtonImpl);

// memo 包裹后 DevTools / 报错信息里显示的是内部函数名，改回对外名。
QButton.displayName = 'QButton';
