import { Text } from 'react-native';
import { QButton } from '@cross-terminal/components';
import type { QButtonProps } from '@cross-terminal/components';
import type { ComponentDemo, DemoValues } from './types';

/**
 * `QButton` 的配置式 Demo。
 *
 * 覆盖了 `QButtonProps` 的**全部** prop：
 * `level` / `type` / `text` / `subText` / `suffixText` / `subSuffixText` /
 * `disabled` / `leftIcon` / `rightIcon` / `loading` / `onPress` / `CommonProps` 三项。
 *
 * `onPress` 没有做成控件（要打日志），改在预览区下方实时显示点击次数。
 */

/**
 * 图标系统尚未实现（见组件库 README「与 COMPONENT.md 的偏差」），
 * `leftIcon` / `rightIcon` 目前接 `ReactNode`，所以这里用文本节点占位。
 */
const ICON_OPTIONS = [
  { label: '无', value: 'none', code: '' },
  { label: '仅左 ◀', value: 'left', code: 'leftIcon={<Text>◀</Text>}' },
  { label: '仅右 ▶', value: 'right', code: 'rightIcon={<Text>▶</Text>}' },
  {
    label: '左右 ◀ ▶',
    value: 'both',
    code: 'leftIcon={<Text>◀</Text>} rightIcon={<Text>▶</Text>}',
  },
];

export const buttonDemo: ComponentDemo<QButtonProps> = {
  key: 'button',
  name: 'QButton',
  description: '按钮。触发操作的主控件；level 决定强调强度、高度与左右内边距，type 决定填充方式。',
  Component: QButton,

  controls: [
    {
      kind: 'text',
      name: 'text',
      label: 'text',
      defaultValue: '提交',
      hint: '主文案（必填性质，示例代码里总是写上）',
    },
    { kind: 'text', name: 'subText', label: 'subText', defaultValue: '', hint: '副文案（双行）' },
    { kind: 'text', name: 'suffixText', label: 'suffixText', defaultValue: '', hint: '后缀文案' },
    {
      kind: 'text',
      name: 'subSuffixText',
      label: 'subSuffixText',
      defaultValue: '',
      hint: '副后缀文案',
    },
    {
      kind: 'select',
      name: 'type',
      label: 'type',
      defaultValue: 'primary',
      omitWhen: 'primary',
      options: [
        { label: 'primary · 实心', value: 'primary' },
        { label: 'secondary · 描边', value: 'secondary' },
        { label: 'tertiary · 纯文字', value: 'tertiary' },
      ],
    },
    {
      kind: 'number',
      name: 'level',
      label: 'level',
      defaultValue: 6,
      omitWhen: 6,
      min: 1,
      max: 6,
      step: 1,
      hint: '1~6，越高越强调、越高、左右内边距越大',
    },
    { kind: 'boolean', name: 'disabled', label: 'disabled', defaultValue: false },
    { kind: 'boolean', name: 'loading', label: 'loading', defaultValue: false },
    {
      kind: 'select',
      name: 'icons',
      label: 'leftIcon / rightIcon',
      defaultValue: 'none',
      options: ICON_OPTIONS,
      hint: '图标系统未就绪，先用文本节点占位',
    },
    {
      kind: 'text',
      name: 'accessibilityLabel',
      label: 'accessibilityLabel',
      defaultValue: '',
      hint: '留空则回退到 text',
    },
  ],

  toProps: (values: DemoValues) => {
    const props: QButtonProps = {
      text: String(values.text ?? '') || undefined,
      type: values.type as QButtonProps['type'],
      level: Number(values.level) as QButtonProps['level'],
      disabled: Boolean(values.disabled),
      loading: Boolean(values.loading),
    };

    const subText = String(values.subText ?? '');
    if (subText) props.subText = subText;

    const suffixText = String(values.suffixText ?? '');
    if (suffixText) props.suffixText = suffixText;

    const subSuffixText = String(values.subSuffixText ?? '');
    if (subSuffixText) props.subSuffixText = subSuffixText;

    const accessibilityLabel = String(values.accessibilityLabel ?? '');
    if (accessibilityLabel) props.accessibilityLabel = accessibilityLabel;

    const icons = String(values.icons);
    if (icons === 'left' || icons === 'both') props.leftIcon = <Text>◀</Text>;
    if (icons === 'right' || icons === 'both') props.rightIcon = <Text>▶</Text>;

    return props;
  },
};
