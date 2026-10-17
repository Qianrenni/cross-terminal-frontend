import { QHotzone, QIcon } from '@cross-terminal/components';
import type { QHotzoneProps } from '@cross-terminal/components';
import type { ComponentDemo, DemoValues } from './types';

/**
 * `QHotzone` 的配置式 Demo。
 *
 * 这个 demo 的价值在**顶栏的「热区」开关**：打开后能看到
 * 「图标本身多大」和「实际可点范围多大」——`inset` 调大，橙色框就跟着变大，
 * 但页面布局纹丝不动（热区不占位）。
 */
export const hotzoneDemo: ComponentDemo<QHotzoneProps> = {
  key: 'hotzone',
  name: 'QHotzone',
  description:
    '热区。把小的点击目标外包一层更大的可点区域，且不影响布局；打开顶栏「热区」开关可以看到实际范围。',
  Component: QHotzone,

  controls: [
    {
      kind: 'number',
      name: 'inset',
      label: 'inset',
      defaultValue: 12,
      min: 0,
      max: 32,
      step: 2,
      hint: '向外扩多少 px（四个方向相同）',
    },
    { kind: 'boolean', name: 'disabled', label: 'disabled', defaultValue: false },
  ],

  toProps: (values: DemoValues) => {
    const props: QHotzoneProps = {
      inset: Number(values.inset ?? 0),
      // `onPress` 是必填，真实回调由 `DemoPage` 覆盖（用来计数），这里只是占位
      onPress: () => {},
      // 演示「小图标 + 大热区」：图标 20×20，热区按 inset 向外扩
      children: <QIcon name="caret-right" size={20} />,
    };
    if (values.disabled) props.disabled = true;
    return props;
  },

  /** 带 `children` 的组件没法用标量控件拼代码，这里手写一份示例。 */
  renderCode: (values: DemoValues) =>
    [
      `<QHotzone inset={${Number(values.inset ?? 0)}}${values.disabled ? ' disabled' : ''} onPress={handlePress}>`,
      '  <QIcon name="caret-right" />',
      '</QHotzone>',
    ].join('\n'),
};
