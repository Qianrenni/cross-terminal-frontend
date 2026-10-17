import type { CommonProps } from '@/types';
import type { ICON_PATHS } from './icons';
import type { IconWeight } from './icons/type';

/**
 * 图标名。
 *
 * **就是内置图标表的 key**（而不是自由字符串），所以 `name="clsoe"` 这种拼错
 * 会在**编译期**报错，编辑器也能自动补全 —— 和 token 树「显式声明每一层」是同一个思路。
 */
export type IconName = keyof typeof ICON_PATHS;

/**
 * 图标。矢量图标的统一出口。
 *
 * 事件：`onPress`（点击）
 *
 * 渲染用 `react-native-svg`：**同一份 `<Svg><Path/></Svg>` 两端都能跑**
 * （原生走它的原生视图，Web 走它的 web 实现 —— Vite 侧需把包名别名到
 * `react-native-svg/lib/module/ReactNativeSVG.web.js`）。
 *
 * ⚠️ **与 `COMPONENT.md` 的两处偏差**（都记在 `packages/components/README.md`）：
 * 1. 多了 `color`：`QButton` 必须把前景色传给图标（主按钮上是白图标、描边按钮上是品牌色），
 *    光靠 `style` 传不进去 —— 它的类型是 `ViewStyle`，没有 `color` 字段；
 * 2. `size` 按 COMPONENT.md 是裸 `number`（不是 `Size` 档位），保持原样不动。
 */
export interface QIconProps extends CommonProps {
  /** 图标名，取值见 `./icons/index.ts` 的 `ICON_PATHS` */
  name: IconName;
  /** 尺寸（px，宽高相等）；省略则用组件 token 的默认值 */
  size?: number;
  /** 颜色；同时作用于填充与描边；省略则用组件 token 的默认值 */
  color?: string;
  /**
   * 描边粗细档位；省略则用**该图标自己声明的** `weight`（`IconShape.weight`），
   * 再省略就按 `regular`。实际数值来自组件 token `strokeWidth`。
   *
   * 只影响**描边**路径，纯填充图标（如 `star`）不受影响。
   */
  weight?: IconWeight;
  /** 点击 */
  onPress?: () => void;
}

/** 图标组件 token（可被主题覆盖）。 */
export interface QIconTokens {
  /** 默认尺寸（px） */
  size: number;
  /** 默认颜色 */
  color: string;
  /**
   * 描边宽度，细 / 常规 / 粗三档（**viewBox 单位**，不是 px）。
   *
   * ⚠️ 这三个数值是按内置图标的 **100×100 画布**定标的。因为 `Svg` 会按
   * `width`/`height` 缩放整个坐标系，所以 100 网格上的 8 在 20px 显示时约为 1.6px、
   * 在 48px 显示时约为 3.84px —— 线宽随尺寸等比缩放，这才是矢量图标该有的行为。
   */
  strokeWidth: Record<IconWeight, number>;
}
