import { DEFAULT_THEME_NAME, QText, getTheme } from '@cross-terminal/components';
import type { QTextProps, ThemeConfig, TypographyPath } from '@cross-terminal/components';
import type { ComponentDemo, DemoValues } from './types';

/**
 * `QText` 的配置式 Demo。
 *
 * 两条关键约定：
 * 1. **颜色预设必须现算**（`toProps` 的第二个参数 `theme`），不能在模块顶层
 *    `getTheme(DEFAULT_THEME_NAME)` 冻一份 —— 否则顶栏切主题时预览不会变色；
 * 2. 排版下拉是**从语义层字体树推导**的：往 `semantic.font` 里加档位
 *    （`design/semantic.ts`），这里自动多一个选项。
 */

/**
 * 把字体树摊平成 `font.sys.body.m` 这样的路径（叶子 = 带 `fontSize` 的对象）。
 *
 * 只用于**枚举路径**：字体树的**结构**不随主题变（换主题变的只是每个档位的数值），
 * 所以这里用默认主题走一遍即可，不涉及任何颜色。
 */
function typographyPaths(): TypographyPath[] {
  const paths: string[] = [];

  const walk = (node: unknown, prefix: string) => {
    if (typeof node !== 'object' || node == null) return;
    const record = node as Record<string, unknown>;
    if (typeof record.fontSize === 'number') {
      paths.push(prefix);
      return;
    }
    for (const [key, value] of Object.entries(record)) {
      walk(value, prefix ? `${prefix}.${key}` : key);
    }
  };

  walk(getTheme(DEFAULT_THEME_NAME).semantic.font, 'font');
  return paths as TypographyPath[];
}

/** 颜色预设：`default` = 不传，用排版 token 自带的色（**按当前主题现算**）。 */
function colorOf(name: string, theme: ThemeConfig): string | undefined {
  switch (name) {
    case 'brand':
      return theme.semantic.color.brand.primary;
    case 'secondary':
      return theme.semantic.color.text.secondary;
    case 'error':
      return theme.semantic.color.status.error.default;
    default:
      return undefined;
  }
}

export const textDemo: ComponentDemo<QTextProps> = {
  key: 'text',
  name: 'QText',
  description:
    '文本。排版只由 typography 决定（语义层字体路径，如 font.sys.body.m），组件本身没有 token。',
  Component: QText,

  controls: [
    {
      kind: 'text',
      name: 'text',
      label: 'text',
      defaultValue: '跨端容器 · 文本排版',
      // 必填 prop → 不给 omitWhen，否则会生成非法的 `<QText />`
    },
    {
      kind: 'select',
      name: 'typography',
      label: 'typography',
      defaultValue: 'font.sys.body.m',
      // 必填 prop，同样不给 omitWhen
      options: typographyPaths().map((path) => ({ label: path, value: path })),
      hint: '取值来自 semantic.font 的档位',
    },
    {
      kind: 'select',
      name: 'color',
      label: 'color',
      defaultValue: 'default',
      options: [
        { label: '默认（跟随排版 token）', value: 'default', code: '' },
        { label: '品牌色', value: 'brand', code: 'color={theme.semantic.color.brand.primary}' },
        {
          label: '次要色',
          value: 'secondary',
          code: 'color={theme.semantic.color.text.secondary}',
        },
        {
          label: '错误色',
          value: 'error',
          code: 'color={theme.semantic.color.status.error.default}',
        },
      ],
    },
    {
      kind: 'number',
      name: 'numberOfLines',
      label: 'numberOfLines',
      defaultValue: 0,
      omitWhen: 0,
      min: 0,
      max: 3,
      step: 1,
      hint: '0 = 不限制；大于 0 时超出省略',
    },
  ],

  toProps: (values: DemoValues, theme: ThemeConfig) => {
    const props: QTextProps = {
      text: String(values.text ?? ''),
      typography: values.typography as TypographyPath,
    };

    const color = colorOf(String(values.color), theme);
    if (color) props.color = color;

    const lines = Number(values.numberOfLines);
    if (lines > 0) props.numberOfLines = lines;

    return props;
  },
};
