import type { ViewStyle } from 'react-native';
import type { HotzoneEdges, HotzoneInset } from './type';

/**
 * `QHotzone` 的样式层：**热区几何（纯函数）+ 组件最终样式**。
 *
 * 几何放在组件目录里而不是 `utils/`：只有这一个组件用它，放外面会让「组件 → 工具 → 组件」来回跳。
 * 这里的函数都不读 token、不碰 React，可以单独做单元测试（见 `__tests__/style.test.ts`）。
 *
 * ## 做法：内容照常布局 + 绝对定位的触控层向外扩
 *
 * ```tsx
 * const layer = hotzoneLayerStyle(12);
 *
 * <Pressable onPress={onPress}>
 *   <View style={layer} />            // ① 先渲染触控层（z 序更低）
 *   <QIcon name="close" size={20} />  // ② 内容在**正常的流式布局**里
 * </Pressable>
 * ```
 *
 * - 内容**不在**绝对定位区域里 ⇒ 布局完全不受影响，父容器多高就是多高；
 * - 触控层是绝对定位的**兄弟节点**，`top/right/bottom/left` 取负值向外扩，不占布局空间；
 * - 原生与 Web 走**同一套**节点结构和样式，没有平台分支 ⇒ 一套测试覆盖两端；
 * - Web 端之所以能生效，是因为 `react-native-web` 的 `View` **默认 `overflow: visible`**
 *   （实测其 View 实现里没有任何 overflow 默认值），所以越界的子元素仍然参与命中测试，
 *   事件再冒泡回外层的 `Pressable`。
 *
 * 注意：触控层要渲染在内容**之前**，这样它盖的是「内容之外那一圈」，
 * 内容本身若有自己的交互也不会被挡住。
 *
 * ## 被否掉的两种做法
 *
 * - **把内容放进绝对定位区域里**：绝对定位脱离文档流，那个盒子不再参与父容器尺寸计算
 *   ⇒ 父容器塌陷，必须由调用方显式给宽高或自行居中，等于把布局职责搬进了热区组件。
 * - **用 RN 的 `hitSlop`**：原生确实最省（零额外节点），但实测 **`react-native-web` 的
 *   `Pressable` 完全不支持它** —— 整个 RNW 里只有旧版 `Touchable` 实现了 `hitSlop`，
 *   `Pressable/index.js` 中 `hitSlop` 出现 0 次，未知 prop 透给 `View` 后被过滤丢掉，
 *   **静默失效**。所以 Web 端无论如何都得补一个绝对定位覆盖层，即本方案。
 *
 * ## ⚠️ 共同的天花板：不能超出**父视图**边界
 *
 * RN 文档明确写了 `hitSlop` 的触摸区域不会超出父视图边界；绝对定位的越界子元素在 Android 上
 * 也受同样限制（父 View 的触摸区域默认被裁剪到自身边界）。换句话说：
 * **热区只能长在父容器给的余地之内** —— 父容器本身要够大，或保证父级不裁剪。
 *
 * ## 用法提示
 *
 * - 返回值是**新对象**，别在 render 里每次现算：做成模块级常量或用 `useMemo`
 *   （`QHotzone` 内部就是 `useMemo`）；
 * - 调试时给触控层临时加 `backgroundColor: 'rgba(255, 0, 0, 0.2)'` 就能看见热区范围。
 */

/** 把非法值（负数 / NaN / Infinity）收敛成 0：外扩量只允许是非负有限数。 */
const toInset = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

/**
 * 取负，且避开 `-0`。
 *
 * `-0` 虽然 `=== 0`、不影响渲染，但会让样式对象和调用方的断言读起来莫名其妙
 * （`expect(style.left).toEqual(-0)` 看着就像写错了），所以统一产出 `0`。
 */
const negate = (value: number): number => (value === 0 ? 0 : -value);

/** 把 `HotzoneInset` 归一化成四边齐全的数字。 */
export function normalizeHotzoneInset(inset: HotzoneInset = 0): HotzoneEdges {
  if (typeof inset === 'number') {
    const value = toInset(inset);
    return { top: value, right: value, bottom: value, left: value };
  }
  return {
    top: toInset(inset.top),
    right: toInset(inset.right),
    bottom: toInset(inset.bottom),
    left: toInset(inset.left),
  };
}

/**
 * 触控层的样式：绝对定位 + 四边取**负值**向外扩。
 *
 * 直接铺在内容旁边即可（**放在内容之前**，见文件头示例）。
 * 不要给它加 `pointerEvents: 'none'` —— 那样它就收不到触摸了。
 */
export function hotzoneLayerStyle(inset: HotzoneInset = 0): ViewStyle {
  const edges = normalizeHotzoneInset(inset);
  return {
    position: 'absolute',
    top: negate(edges.top),
    right: negate(edges.right),
    bottom: negate(edges.bottom),
    left: negate(edges.left),
  };
}

/** 加上外扩后热区的实际尺寸。用于断言 / 生成文档，不做任何取整。 */
export function hotzoneSize(
  content: { width: number; height: number },
  inset: HotzoneInset = 0,
): { width: number; height: number } {
  const edges = normalizeHotzoneInset(inset);
  return {
    width: content.width + edges.left + edges.right,
    height: content.height + edges.top + edges.bottom,
  };
}

/**
 * 要让某条边从 `contentSize` 达到 `target`，每边需要外扩多少。
 *
 * `target` **必须由调用方给定** —— 这里不内置任何「最小点击尺寸」的默认值：
 * 那是产品 / 设计侧的决定，不该藏在工具函数里。
 *
 * 因为左右（上下）对称扩，所以除以 2；差值可能是奇数（21 → 11.5），
 * **故意不取整**，否则热区就不再相对内容居中了。
 */
export function insetToReachTarget(contentSize: number, target: number): number {
  if (!Number.isFinite(contentSize) || !Number.isFinite(target)) return 0;
  return Math.max(0, (target - contentSize) / 2);
}

/** 一个热区最终解析出来的样式。 */
export interface HotzoneStyle {
  /** 绝对定位的触控层：四边取负值向外扩，不占布局空间 */
  layer: ViewStyle;
}

/**
 * `QHotzone` 的最终样式。
 *
 * 本组件没有视觉 / 几何 token —— 外扩量完全由 `inset` 决定，所以这里只是几何函数的入口。
 */
export function hotzoneStyle(inset: HotzoneInset): HotzoneStyle {
  return { layer: hotzoneLayerStyle(inset) };
}
