import type { FontToken } from '@/design/components/font';
import type { IconName } from '@/icon';
import type { CommonProps } from '@/types';

/**
 * 一个标准标签项。
 *
 * `icon` / `activeIcon` 都是**内置图标名**（`ICON_PATHS` 的 key），
 * 这样拼错会在编译期报错；两者都会被渲染成 `iconSize`（24）的正方形。
 */
export interface QBottomTabItem {
  /** 唯一标识，也是 `onChange` 回传的值 */
  key: string;
  /** 文字（icon 下方，10/14，绝对定位贴底） */
  label: string;
  /** 未选中态图标 */
  icon: IconName;
  /** 选中态图标 */
  activeIcon: IconName;
}

/**
 * 底部标签栏。
 *
 * 事件：`onChange`（切换选中项）
 *
 * ## 布局（高度 46 的来历）
 *
 * ```text
 * ┌──────────────────────────┐
 * │        8px 顶部间距       │
 * │      icon 24 × 24        │  ← icon / activeIcon 都渲染在这里，叠在一起
 * │      文字 10 / 14         │  ← 绝对定位 bottom:0 left:0 right:0
 * └──────────────────────────┘  46 = 8 + 24 + 14
 * ```
 *
 * ## 动画（只有 icon 动，文字不动）
 *
 * 选中态与未选中态**两个 icon 同时存在**，各自叠在同一个 24×24 区域里，
 * 靠 `opacity` + `scale` 交叉切换：
 *
 * | 状态变化 | 选中 icon | 未选中 icon |
 * | --- | --- | --- |
 * | 未选中 → 选中 | `scale 0 → 1.2`（`durationIn`）→ `1.2 → 1`（**串行** `bounceDuration` = 50ms），`opacity 0 → 1` | `scale 1 → 0`，`opacity 1 → 0` |
 * | 选中 → 未选中 | `scale 1 → 0`，`opacity 1 → 0` | `scale 0 → 1`，`opacity 0 → 1` |
 *
 * 文字只做颜色切换（`colorActive` / `colorInactive`），没有动画。
 */
export interface QBottomTabProps extends CommonProps {
  /** 标签项（至少 1 个） */
  items: QBottomTabItem[];
  /** 受控选中项 `key`；传了它就是受控组件 */
  value?: string;
  /** 非受控初始选中项；不传则选第一项 */
  defaultValue?: string;
  /** 选中项变化（受控 / 非受控都会触发） */
  onChange?: (key: string) => void;
}

/** 底部标签栏组件 token（可被主题覆盖）。 */
export interface QBottomTabTokens {
  /** 整条高度（px） */
  height: number;
  /** 图标区边长（px） */
  iconSize: number;
  /** 图标距顶部间距（px） */
  iconGap: number;
  /** 文字行高 / 文字区高度（px） */
  labelHeight: number;
  /** 文字排版（已解析：10/14 regular） */
  labelFont: FontToken;
  /** 选中态文字色 */
  colorActive: string;
  /** 未选中态文字色 */
  colorInactive: string;
  /** 背景色 */
  background: string;
  /** 选中动画峰值缩放 */
  popScale: number;
  /** 膨大段时长（ms）：`0 → popScale` */
  durationIn: number;
  /** 回弹段时长（ms）：`popScale → 1`，串行跟在膨大段后 */
  bounceDuration: number;
  /** 出场动画时长（ms） */
  durationOut: number;
}
