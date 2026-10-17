import React, { memo, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { hotzoneStyle } from './style';
import type { QHotzoneProps } from './type';

function QHotzoneImpl({
  onPress,
  inset,
  disabled,
  children,
  style,
  testID,
  accessibilityLabel,
}: QHotzoneProps) {
  /**
   * 纯函数、**无状态**：不测量 = 没有 `onLayout` / `useState` / `useCallback`，
   * 也就没有「首帧还没有热区」的问题。
   */
  const { layer } = useMemo(() => hotzoneStyle(inset), [inset]);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={style}
    >
      {/* ① 触控层**先**渲染：它只盖「内容之外那一圈」，内容若有自己的交互不会被挡住 */}
      <View style={layer} />
      {/* ② 内容留在正常流里 —— 这是本方案相对「内容放进绝对盒子」的关键差别 */}
      {children}
    </Pressable>
  );
}

/**
 * 通用热区。把小点击目标包大，且不影响布局。
 *
 * 事件：`onPress`（必填）
 *
 * 用 `memo` 包裹，理由同 `QButton` / `QIcon`。
 */
export const QHotzone = memo(QHotzoneImpl);

// memo 包裹后 DevTools / 报错信息里显示的是内部函数名，改回对外名。
QHotzone.displayName = 'QHotzone';
