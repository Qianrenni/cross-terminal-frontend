import type { ReactNode } from 'react';
import type { CommonProps } from '@/types';

/** 归一化后的四边外扩量（px）。 */
export interface HotzoneEdges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * 热区向外扩展的量（px）。
 *
 * - `number` —— 四边相同，`12` 等价 `{ top: 12, right: 12, bottom: 12, left: 12 }`；
 * - 对象 —— 分别指定，缺省边按 0（语义与 RN 的 `hitSlop` 一致）。
 */
export type HotzoneInset = number | Partial<HotzoneEdges>;

/**
 * 通用热区。
 *
 * 把视觉上很小的内容包出更大的点击区，**且不影响布局**：内容照常参与流式布局，
 * 另有一个绝对定位的触控层向外扩（做法与取舍见 `./style.ts` 文件头）。
 *
 * ```tsx
 * // 20px 的内容 → 44px 点击区
 * <QHotzone inset={12} onPress={close}>
 *   <QIcon name="close" />
 * </QHotzone>
 * ```
 *
 * ## 为什么没有「自动补到 44」
 *
 * 自动补 44 必须先知道内容尺寸，而内容尺寸只能靠 `onLayout` 测量 —— 那会引入 state、
 * 首次渲染没有热区、以及尺寸变化时的抖动。这里**不做任何测量**：外扩量由调用方给定
 * （内容尺寸本来就是调用方自己写的，它知道）。需要「20 补到 44」时直接用
 * `insetToReachTarget(20, 44)` 算一次即可，不需要组件去量。
 *
 * 事件：`onPress`（**必填** —— 没有点击的热区没有意义）
 */
export interface QHotzoneProps extends CommonProps {
  /** 点击 */
  onPress: () => void;
  /**
   * 热区相对内容向外扩多少（px），**必填**。
   *
   * 语义与 RN 的 `hitSlop` 一致：`number` 四边相同，对象可分别指定（缺省边为 0）。
   * `0` 表示不外扩。
   */
  inset: HotzoneInset;
  /** 禁用：不触发 `onPress`，并向读屏软件声明 disabled */
  disabled?: boolean;
  /** 内容（**留在正常布局里**，不在绝对定位的触控层内部） */
  children?: ReactNode;
}
