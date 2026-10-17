import React, { memo, useMemo } from 'react';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useThemeConfig } from '@/design/context';
import { DEFAULT_VIEW_BOX } from './icons/type';
import { iconStyle } from './style';
import type { QIconProps } from './type';

function QIconImpl({
  name,
  size,
  color,
  weight,
  onPress,
  theme: themeOverride,
  style,
  testID,
  accessibilityLabel,
}: QIconProps) {
  /** 优先用组件自己的 `theme` prop（局部覆盖），否则跟随 `QThemeProvider`。 */
  const { theme } = useThemeConfig(themeOverride, 'icon');

  const {
    shape,
    size: resolvedSize,
    color: resolvedColor,
    strokeWidth,
  } = useMemo(
    () => iconStyle(theme, { name, size, color, weight }),
    [theme, name, size, color, weight],
  );

  /** 画布：默认 100×100，可被图标自己的 `viewBox` 覆盖（约定见 `./icons/type.ts`）。 */
  const viewBox = shape.viewBox ?? DEFAULT_VIEW_BOX;

  /** 图标对读屏软件应当有含义；没给标签就退化成图标名。 */
  const label = accessibilityLabel ?? name;

  /**
   * 矢量图形：`Svg` 是画布（`viewBox` 默认 100×100，`width`/`height` 由 `size` 决定），
   * 里面按**固定顺序**放最多三条 `Path`：
   *
   * 1. `fill`        —— 实心图形
   * 2. `stroke`      —— 描边；有 `dash` 就是虚线
   * 3. `solidStroke` —— 描边，**始终实线**
   *
   * 三条的颜色都由同一个 `color` 驱动、描边粗细都由同一个 `strokeWidth`，所以图标天生
   * 可换色、可换档位。拆出第三条是为了让「一部分虚线、一部分实线」成为可能
   * （样板：`placeholder-line` 的四条虚线直边 + 四个整段实线圆角）。
   */
  const glyphPaths = (
    <>
      {shape.fill != null && <Path d={shape.fill} fill={resolvedColor} />}
      {shape.stroke != null && (
        <Path
          d={shape.stroke}
          fill="none"
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          strokeDasharray={shape.dash}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {shape.solidStroke != null && (
        <Path
          d={shape.solidStroke}
          fill="none"
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </>
  );

  /**
   * 可点时包一层 `Pressable`，而不是把 `onPress` 交给 `Svg`。
   *
   * 理由：统一交互语义（后续要加按压态 / `hitSlop`，而 `hitSlop` 在可点图标上
   * 几乎是必需的 —— 字形本身往往小于可接受的点击热区），并与 `QButton` 一致。
   */
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
      >
        <Svg width={resolvedSize} height={resolvedSize} viewBox={viewBox} style={style}>
          {glyphPaths}
        </Svg>
      </Pressable>
    );
  }

  return (
    <Svg
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={label}
      width={resolvedSize}
      height={resolvedSize}
      viewBox={viewBox}
      style={style}
    >
      {glyphPaths}
    </Svg>
  );
}

/**
 * 图标。矢量图标的统一出口。
 *
 * 事件：`onPress`（点击，此时外层是 `Pressable`）
 *
 * 主题：默认颜色与默认尺寸来自 `useTheme()`（第 ② / ③ 层），切主题即时生效。
 *
 * ⚠️ 图形是**占位图形**（一个图标一个文件，见 `./icons/`），但**已经是真矢量**：任意尺寸都清晰、颜色由 `color` 决定。
 *
 * 用 `memo` 包裹，理由同 `QButton`。
 */
export const QIcon = memo(QIconImpl);

// memo 包裹后 DevTools / 报错信息里显示的是内部函数名，改回对外名。
QIcon.displayName = 'QIcon';
