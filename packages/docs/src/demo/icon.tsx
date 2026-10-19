import { ICON_PATHS, QIcon } from '@cross-terminal/components';
import type { IconName, QIconProps, ThemeConfig } from '@cross-terminal/components';
import type { ComponentDemo, DemoValues } from './types';

/**
 * `QIcon` 的配置式 Demo。
 *
 * 图标名下拉是**从图标表推导**的：往 `packages/components/src/icon/icons/` 里加一个图标
 * （并在 `icons/index.ts` 的注册表里加一行），这里自动多一个选项，不用改本文件。
 */

/**
 * 颜色预设：`default` = 不传，走组件 token 默认值。
 *
 * **按当前主题现算**（`toProps` 的第二个参数），不能在模块顶层冻一份，
 * 否则顶栏切主题时图标的品牌色 / 成功色不会跟着变。
 */
function colorOf(name: string, theme: ThemeConfig): string | undefined {
  switch (name) {
    case 'brand':
      return theme.semantic.color.brand.primary;
    case 'success':
      return theme.semantic.color.status.success.default;
    case 'error':
      return theme.semantic.color.status.error.default;
    case 'inverse':
      return theme.semantic.color.text.inverse;
    default:
      return undefined;
  }
}

/**
 * 线宽预设：`default` = 不传，走「图标自带 → `regular`」的兜底。
 *
 * `chevron-left` / `chevron-right` 自带 `thin`，选它们再覆盖成 `bold` 就能看到优先级。
 */
const WEIGHTS: Record<string, QIconProps['weight']> = {
  default: undefined,
  thin: 'thin',
  regular: 'regular',
  bold: 'bold',
};

export const iconDemo: ComponentDemo<QIconProps> = {
  key: 'icon',
  name: 'QIcon',
  description:
    '图标。矢量图标的统一出口；用 react-native-svg 渲染，每个图标的路径见 src/icon/icons/。',
  Component: QIcon,

  controls: [
    {
      kind: 'select',
      name: 'name',
      label: 'name',
      defaultValue: 'caret-right',
      // 必填 prop → **不给 omitWhen**，否则示例代码会生成出非法的 `<QIcon />`
      options: (Object.keys(ICON_PATHS) as IconName[]).map((key) => ({ label: key, value: key })),
    },
    {
      kind: 'number',
      name: 'size',
      label: 'size',
      defaultValue: 20,
      omitWhen: 20,
      min: 12,
      max: 96,
      step: 2,
      hint: '省略则用 theme.components.icon.size（20）',
    },
    {
      kind: 'select',
      name: 'color',
      label: 'color',
      defaultValue: 'default',
      options: [
        { label: '默认（text.primary）', value: 'default', code: '' },
        {
          label: '品牌色',
          value: 'brand',
          code: 'color={theme.semantic.color.brand.primary}',
        },
        {
          label: '成功色',
          value: 'success',
          code: 'color={theme.semantic.color.status.success.default}',
        },
        {
          label: '错误色',
          value: 'error',
          code: 'color={theme.semantic.color.status.error.default}',
        },
        {
          label: '白色',
          value: 'inverse',
          code: 'color={theme.semantic.color.text.inverse}',
        },
      ],
    },
    {
      kind: 'select',
      name: 'weight',
      label: 'weight',
      defaultValue: 'default',
      options: [
        { label: '默认（图标自带）', value: 'default', code: '' },
        { label: '细线 thin', value: 'thin', code: 'weight="thin"' },
        { label: '常规 regular', value: 'regular', code: 'weight="regular"' },
        { label: '粗 bold', value: 'bold', code: 'weight="bold"' },
      ],
      hint: '只影响描边路径；chevron 系列自带 thin',
    },
    {
      kind: 'text',
      name: 'accessibilityLabel',
      label: 'accessibilityLabel',
      defaultValue: '',
      hint: '留空则回退到 name',
    },
  ],

  toProps: (values: DemoValues, theme: ThemeConfig) => {
    const props: QIconProps = {
      name: values.name as IconName,
      size: Number(values.size),
    };

    const color = colorOf(String(values.color), theme);
    if (color) props.color = color;

    const weight = WEIGHTS[String(values.weight)];
    if (weight) props.weight = weight;

    const label = String(values.accessibilityLabel ?? '');
    if (label) props.accessibilityLabel = label;

    return props;
  },
};
