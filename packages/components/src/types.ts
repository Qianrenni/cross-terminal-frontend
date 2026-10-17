import type { StyleProp, ViewStyle } from 'react-native';
import type { ThemeConfig } from '@/design/theme';

/**
 * 所有组件共有的属性。
 *
 * 跨端组件只使用 `react-native` 导出的 API，Web 端由 `react-native-web` 转换，
 * 因此这里不出现任何 DOM/平台特有类型。
 */
export interface CommonProps {
  /** 自定义样式；Web 端由 react-native-web 转换 */
  style?: StyleProp<ViewStyle>;
  /**
   * 只对这个组件生效的主题覆盖（一般不用传，跟随 `QThemeProvider`）。
   *
   * 典型场景：同一页面里嵌一块「另一个品牌色」的区域。
   * 优先级：本 prop > `QThemeProvider` > 默认主题（黄）。
   */
  theme?: ThemeConfig;
  /** 测试与埋点标识 */
  testID?: string;
  /** 无障碍标签（读屏软件朗读） */
  accessibilityLabel?: string;
}
