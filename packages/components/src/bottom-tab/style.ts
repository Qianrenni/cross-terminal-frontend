import type { TextStyle, ViewStyle } from 'react-native';
import type { ThemeConfig } from '@/design/theme';

/** 静态样式表（**朴素对象**：写死数值，不参与大屏换算，见 token 文件里的说明）。 */
export interface BottomTabStyles {
  /** 整条栏 */
  container: ViewStyle;
  /** 单个 item 的点击区 */
  item: ViewStyle;
  /** icon 所在的绝对定位层（top = iconGap，撑满宽度并居中） */
  iconLayer: ViewStyle;
  /** 24×24 的图标盒（两个 icon 叠在这里） */
  iconBox: ViewStyle;
  /** 单个 icon 的动画容器（绝对定位铺满 iconBox） */
  iconFrame: ViewStyle;
  /** 文字：绝对定位贴底 */
  label: TextStyle;
}

/**
 * 与选中态无关的静态样式。
 *
 * ⚠️ 工厂而不是模块级常量：颜色来自当前主题，必须在渲染时才能确定。
 */
export function createBottomTabStyles(theme: ThemeConfig): BottomTabStyles {
  const tokens = theme.components.bottomTab;
  const labelFont = tokens.labelFont;

  return {
    container: {
      flexDirection: 'row',
      // 底部标签栏天然是整宽：`flex: 1` 的子项没有确定宽度就撑不开
      // （父级一旦 `align-items: center`，行容器会直接塌成 0 宽）
      width: '100%',
      height: tokens.height,
      backgroundColor: tokens.background,
    },
    item: {
      flex: 1,
      height: tokens.height,
      position: 'relative',
      paddingTop: tokens.iconGap,
      flexDirection: 'column',
      alignItems: 'center',
    },
    iconLayer: {
      width: tokens.iconSize,
      height: tokens.iconSize,
    },
    iconBox: {
      width: tokens.iconSize,
      height: tokens.iconSize,
      position: 'relative',
    },
    iconFrame: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: tokens.iconSize,
      height: tokens.iconSize,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: tokens.labelHeight,
      textAlign: 'center',
      // 只借排版（字号 10 / 行高 14 / 字重 regular / 字距），颜色按选中态覆盖
      fontSize: labelFont.fontSize,
      lineHeight: labelFont.lineHeight,
      fontWeight: labelFont.fontWeight,
      letterSpacing: labelFont.letterSpacing,
      ...(labelFont.fontFamily == null ? null : { fontFamily: labelFont.fontFamily }),
      // Android 默认给文字加字体 padding，会让 14 的高度被撑开、46 就不准了
      includeFontPadding: false,
    },
  };
}

/**
 * 静态样式按主题对象缓存：主题是**引用共享**的（`getTheme` 有缓存），
 * 所以同一主题下命中率 100%，只有切主题时才重建一次。
 */
const styleCache = new WeakMap<ThemeConfig, BottomTabStyles>();

export function bottomTabStylesOf(theme: ThemeConfig): BottomTabStyles {
  const cached = styleCache.get(theme);
  if (cached) return cached;

  const created = createBottomTabStyles(theme);
  styleCache.set(theme, created);
  return created;
}

/** 文字颜色按选中态取 token（文字没有动画，只有颜色切换）。 */
export function labelColorOf(theme: ThemeConfig, selected: boolean): string {
  return selected
    ? theme.components.bottomTab.colorActive
    : theme.components.bottomTab.colorInactive;
}
