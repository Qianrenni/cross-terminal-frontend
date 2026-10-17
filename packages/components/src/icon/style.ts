import type { ThemeConfig } from '@/design/theme';
import { ICON_PATHS } from './icons';
import type { IconShape } from './icons/type';
import type { QIconProps } from './type';

/** 取图标名对应的矢量路径。 */
export function shapeOf(name: QIconProps['name']): IconShape {
  return ICON_PATHS[name];
}

/** 一个图标最终解析出来的渲染参数。 */
export interface IconStyle {
  /** 矢量路径（描边 / 填充） */
  shape: IconShape;
  /** 尺寸（px，宽高相等） */
  size: number;
  /** 颜色 */
  color: string;
  /** 描边宽度（**viewBox 单位**） */
  strokeWidth: number;
}

/**
 * **本组件唯一的「读主题处」**：把 props 与当前主题的组件 token（`components.icon`）
 * 合成最终渲染参数。
 *
 * `undefined` 与「显式传 undefined」在这里被统一处理成「用 token 默认值」，
 * 所以组件实现里不用再写 `??`。
 *
 * 默认颜色是**语义层的主文字色**，所以换主题时图标跟着文字一起变。
 */
export function iconStyle(
  theme: ThemeConfig,
  { name, size, color, weight }: QIconProps,
): IconStyle {
  const shape = shapeOf(name);
  const icon = theme.components.icon;
  // 描边粗细的优先级：QIcon 的 weight prop → 图标自己声明的 weight → regular
  const resolvedWeight = weight ?? shape.weight ?? 'regular';
  return {
    shape,
    size: size ?? icon.size,
    color: color ?? icon.color,
    strokeWidth: icon.strokeWidth[resolvedWeight],
  };
}
