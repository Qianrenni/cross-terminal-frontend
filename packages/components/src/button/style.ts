import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { withAlpha } from '@/design/color';
import type { ThemeConfig } from '@/design/theme';
import type { QButtonProps } from './type';

/**
 * `level` → 强调强度（0~1）：值越大越强调。
 *
 * ⚠️ 这是**行为常量**，不是设计 token：它描述的是「6 个优先级怎么排」这个产品规则，
 * 主题不该改它（否则同一个应用在不同主题下主次关系会变）。
 */
const EMPHASIS_BY_LEVEL: Record<NonNullable<QButtonProps['level']>, number> = {
  1: 0.55,
  2: 0.64,
  3: 0.73,
  4: 0.82,
  5: 0.91,
  6: 1,
};

/**
 * 与变体无关的静态样式。
 *
 * ⚠️ 这里是**工厂**而不是模块级常量：颜色与字体都来自当前主题，
 * 必须在渲染时（`useTheme()` 之后）才能确定，否则切主题不生效。
 *
 * 每次调用都 `StyleSheet.create` 一次比较贵，所以外面有 `buttonStylesOf()` 按主题对象缓存。
 */
export function createButtonStyles(theme: ThemeConfig) {
  const { semantic, components, primitive } = theme;
  const button = components.button;

  return StyleSheet.create({
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
      // 整份排版 token 展开（fontSize / lineHeight / fontWeight / letterSpacing / color）。
      // 其中的 color 会被渲染时的变体色覆盖（见 buttonVariantStyle 的 foreground）。
      ...semantic.font.sys.label.m,
      marginLeft: button.textGap,
      marginRight: button.textGap,
    },
    subText: {
      // 同上；color 由 subtle 覆盖。
      ...semantic.font.sys.caption.m,
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
  });
}

/** 静态样式的类型（`buttonStylesOf` 的返回值）。 */
export type ButtonStyles = ReturnType<typeof createButtonStyles>;

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
  /** 主文案与图标的颜色 */
  foreground: string;
  /** 副文案的颜色 */
  subtle: string;
}

/**
 * **本组件唯一的「读主题处」**：从当前主题的语义层 + 组件 token，
 * 算出某个变体（`level` × `type` × 状态）的样式。
 *
 * 视觉映射（💡 占位，待设计系统确认）：
 * - `type` 决定填充方式：`primary` 实心 / `secondary` 描边 / `tertiary` 纯文字；
 * - `level` 决定强调强度（数值越大越强调）与**左右内边距**（见 `QButtonTokens.paddingHorizontal`）。
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
  const emphasis = EMPHASIS_BY_LEVEL[level];

  /** 高度与左右内边距都按 level 分档；胶囊圆角取**高度的一半**，两端才是半圆 */
  const height = button.height[level];
  const radius = height / 2;

  const background =
    type === 'primary'
      ? withAlpha(brand.primary, emphasis)
      : type === 'secondary'
        ? theme.semantic.color.background.white
        : theme.semantic.color.background.transparent;

  /**
   * 线框颜色：`secondary` 用品牌色（随 `level` 变强调强度），`tertiary` 用默认描边色。
   * `primary` 是实心块，不需要线框。
   */
  const frameColor =
    type === 'secondary'
      ? withAlpha(brand.primary, emphasis)
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
    foreground: type === 'primary' ? brand.onPrimary : brand.primary,
    // 主按钮上的副文案用「品牌色块内的组合前景色」（onPrimary 的弱化版）
    subtle: type === 'primary' ? brand.onCombo : brand.primary,
  };
}
