import type { ReactNode } from 'react';
import type { HotzoneInset } from '@/hotzone/type';
import type { CommonProps } from '@/types';

/**
 * 按钮。触发操作的主控件。
 *
 * - 组件（导出）名：**`QButton`**；文件名：`Button.tsx`（文件名不带 `Q`）
 * - 事件：`onPress`（点击）
 *
 * 视觉映射：
 * - `type` 决定填充方式：`primary` 实心 / `secondary` 描边 / `tertiary` 纯文字；
 * - `level` **只决定几何**：高度、左右内边距与胶囊圆角；颜色一律用品牌原色，不按 level 混合。
 *
 * @example
 * ```tsx
 * <QButton type="primary" level={6} text="提交" onPress={handleSubmit} />
 * <QButton type="secondary" text="取消" />
 * <QButton type="primary" text="订单" subText="¥128.00" suffixText="去支付" loading />
 * ```
 */
export interface QButtonProps extends CommonProps {
  /** 层级 / 优先级，1 最低、6 最高 */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** 按钮类型（视觉风格）：实心 / 描边 / 纯文字 */
  type?: 'primary' | 'secondary' | 'tertiary';
  /** 主文案 */
  text?: string;
  /** 副文案（双行按钮，与 `text` 上下排布） */
  subText?: string;
  /** 后缀文案（与 `text` 同行，靠右） */
  suffixText?: string;
  /** 副后缀文案（与 `subText` 同行，靠右） */
  subSuffixText?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 左侧图标（图标系统就绪前可直接传节点，之后收敛为 `IconName`） */
  leftIcon?: ReactNode;
  /** 右侧图标 */
  rightIcon?: ReactNode;
  /** 加载态（为 true 时展示 loading 并禁用点击） */
  loading?: boolean;
  /**
   * 热区：在按钮**视觉区域之外**再扩出的可点击范围（px）。
   *
   * - `number` —— 四边相同（`12` 等价 `{ top: 12, right: 12, bottom: 12, left: 12 }`）；
   * - 对象 —— 分别指定，缺省边为 0；
   * - 不传 / 全 0 —— 不渲染热区节点。
   *
   * 几何复用 `QHotzone`（绝对定位触控层，不影响布局）。
   * ⚠️ 与 RN `hitSlop` 同一天花板：热区**不能超出父容器边界**。
   */
  insets?: HotzoneInset;
  /** 点击 */
  onPress?: () => void;
}
