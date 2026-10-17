import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { ThemeConfig } from '@/design/theme';
import type { QButtonProps } from './type';

/** 静态样式表（**朴素对象**，保留数值以便大屏换算）。 */
export interface ButtonStyles {
  container: ViewStyle;
  pressed: ViewStyle;
  leading: ViewStyle;
  trailing: ViewStyle;
  content: ViewStyle;
  row: ViewStyle;
  text: TextStyle;
  subText: TextStyle;
  frame: ViewStyle;
}

/**
 * 与变体无关的静态样式。
 *
 * ⚠️ 这里是**工厂**而不是模块级常量：颜色与字体都来自当前主题，
 * 必须在渲染时（`useTheme()` 之后）才能确定，否则切主题不生效。
 *
 * ⚠️ 返回**朴素对象**（不是 `StyleSheet.create` 的结果）：大屏换算必须在 `create` 之前完成
 * （原生端 `create` 返回不透明 id，拿不到数值），换算交给
 * `useLargeScreenStyles(buttonStylesOf(theme))`。
 *
 * 每次调用都比较贵，所以外面有 `buttonStylesOf()` 按主题对象缓存。
 */
export function createButtonStyles(theme: ThemeConfig): ButtonStyles {
  const { components, primitive } = theme;
  const button = components.button;

  return {
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: primitive.opacity.pressed,
    },
    leading: {
      marginRight: button.iconGap,
    },
    trailing: {
      marginLeft: button.iconGap,
    },
    content: {
      flexShrink: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      // 排版（字号 / 行高 / 字重 / 字距）由 `buttonVariantStyle` 按 `level`
      // 从 `components.button.font[level]` 展开（那里引用的是语义层 font token）。
      marginLeft: button.textGap,
      marginRight: button.textGap,
    },
    subText: {
      // 同上；副文案用 `subFont[level]`，color 由 subtle 覆盖。
      // lineGap 为负 → 第二行整体上移，抵消两个 lineHeight 之间的视觉空隙。
      marginTop: button.lineGap,
      marginLeft: button.textGap,
      marginRight: button.textGap,
    },
    /**
     * `secondary` / `tertiary` 的**线框**：绝对定位铺满容器。
     *
     * 为什么不用容器的 `borderWidth`：边框会吃掉内容盒（内边距实际变小、按钮总高也跟着变），
     * 而线框纯粹是视觉装饰，不该参与布局。绝对定位 + `pointerEvents="none"`（在 `Button.tsx` 上给）
     * 就完全不占位、也不抢触摸。
     *
     * ⚠️ 这里显式写四条边，**不要**用 `StyleSheet.absoluteFill` / `absoluteFillObject`：
     * RN 0.87 已删掉 `absoluteFillObject`（运行时是 `undefined`，`...undefined` 会静默失效、
     * 线框变成普通流式子节点）；而 `absoluteFill` 在部分版本里是注册后的 style id，spread 同样失效。
     */
    frame: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      borderWidth: primitive.stroke.thin,
    },
  };
}

/**
 * 按主题缓存静态样式。
 *
 * 主题对象来自 `getTheme(name)`，同一个主题名永远返回同一个引用，
 * 所以这里的 `WeakMap` 命中率是 100%，切主题时才需要重建一次。
 */
const styleCache = new WeakMap<ThemeConfig, ButtonStyles>();

/** 取当前主题下的静态样式。 */
export function buttonStylesOf(theme: ThemeConfig): ButtonStyles {
  const cached = styleCache.get(theme);
  if (cached != null) return cached;

  const styles = createButtonStyles(theme);
  styleCache.set(theme, styles);
  return styles;
}

/** 变体计算的入参。 */
export interface ButtonVariantInput {
  /** 层级 / 优先级 */
  level: NonNullable<QButtonProps['level']>;
  /** 视觉风格 */
  type: NonNullable<QButtonProps['type']>;
  /** 禁用或加载中（两者视觉一致） */
  inactive: boolean;
  /** 调用方传入的自定义样式；排在最后 → 优先级最高 */
  style?: StyleProp<ViewStyle>;
}

/** 变体计算的结果。 */
export interface ButtonVariantStyle {
  /** 容器样式：静态容器 + 变体 + 自定义样式 */
  container: StyleProp<ViewStyle>;
  /**
   * `secondary` / `tertiary` 的线框样式；`primary` 是 `undefined`（不渲染这个节点）。
   */
  frame: StyleProp<ViewStyle> | undefined;
  /** 主文案样式：按 `level` 展开语义层字体 token + 间距（颜色由渲染时用 `foreground` 覆盖） */
  textStyle: StyleProp<TextStyle>;
  /** 副文案样式：同上，字形取自 `subFont[level]` */
  subTextStyle: StyleProp<TextStyle>;
  /** 主文案与图标的颜色 */
  foreground: string;
  /** 副文案的颜色 */
  subtle: string;
}

/**
 * **本组件唯一的「读主题处」**：从当前主题的语义层 + 组件 token，
 * 算出某个变体（`level` × `type` × 状态）的样式。
 *
 * 视觉映射：
 * - `type` 决定填充方式：`primary` 实心 / `secondary` 描边 / `tertiary` 纯文字；
 * - `level` **只决定几何**：高度、左右内边距（见 `QButtonTokens`）、胶囊圆角与**字号 / 行高**；
 *   颜色一律取语义层的品牌原色，**不按 level 混合**（同一 type 在任何 level 下颜色相同）。
 *
 * ⚠️ `styles.text` / `styles.subText` 自带的排版 `color` 会被这里返回的
 * `foreground` / `subtle` 覆盖，务必把返回值用在渲染的内联样式里（有测试锁着）。
 */
export function buttonVariantStyle(
  theme: ThemeConfig,
  { level, type, inactive, style }: ButtonVariantInput,
): ButtonVariantStyle {
  const styles = buttonStylesOf(theme);
  const brand = theme.semantic.color.brand;
  const button = theme.components.button;

  /** 高度与左右内边距都按 level 分档；胶囊圆角取**高度的一半**，两端才是半圆 */
  const height = button.height[level];
  const radius = height / 2;

  const background =
    type === 'primary'
      ? brand.primary
      : type === 'secondary'
        ? theme.semantic.color.background.white
        : theme.semantic.color.background.transparent;

  /**
   * 线框颜色：`secondary` 用品牌色，`tertiary` 用默认描边色。
   * `primary` 是实心块，不需要线框。
   */
  const frameColor =
    type === 'secondary'
      ? brand.primary
      : type === 'tertiary'
        ? theme.semantic.color.stroke.default
        : undefined;

  return {
    container: [
      styles.container,
      {
        height,
        backgroundColor: background,
        // 边框不在容器上画（会吃掉内容盒），改由绝对定位的 frame 负责
        borderRadius: radius,
        paddingHorizontal: button.paddingHorizontal[level],
        opacity: inactive ? theme.primitive.opacity.disabled : 1,
      },
      style,
    ],
    frame:
      frameColor == null
        ? undefined
        : [styles.frame, { borderColor: frameColor, borderRadius: radius }],
    // 整份排版都来自语义层字号 token（level 越高字号 / 行高越大）
    textStyle: [styles.text, button.font[level]],
    subTextStyle: [styles.subText, button.subFont[level]],
    foreground: type === 'primary' ? brand.onPrimary : brand.primary,
    // 主按钮上的副文案用「品牌色块内的组合前景色」（onPrimary 的弱化版）
    subtle: type === 'primary' ? brand.onCombo : brand.primary,
  };
}
