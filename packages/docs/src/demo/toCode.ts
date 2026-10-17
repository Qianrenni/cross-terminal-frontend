import type { DemoControl, DemoValue, DemoValues } from './types';

/**
 * 由控件值生成 `<Component ... />` 示例代码。
 *
 * 通用规则（无需每个组件自己写）：
 * - 布尔 → 为 `true` 时写成裸属性名（`disabled`），为 `false` 时不写；
 * - 文本 → `name="值"`；数字 → `name={值}`；
 * - 下拉 → 优先用 `DemoOption.code`，否则 `name="值"`；
 * - **只有控件显式声明了 `omitWhen`、且当前值正好等于它时才省略**。
 *   默认（不写 `omitWhen`）**永不省略** —— 宁可代码冗一点，也不能把 `QIcon` 的 `name`
 *   这类必填 prop 吃掉，生成出非法的 `<QIcon />`。
 */
function renderAttribute(control: DemoControl, value: DemoValue | undefined): string | undefined {
  const omittable = control.omitWhen !== undefined && control.omitWhen === value;

  switch (control.kind) {
    case 'text': {
      const text = String(value ?? '');
      if (!text || omittable) return undefined;
      return `${control.name}="${text}"`;
    }

    case 'boolean':
      return value === true ? control.name : undefined;

    case 'number': {
      const num = Number(value);
      if (Number.isNaN(num) || omittable) return undefined;
      return `${control.name}={${num}}`;
    }

    case 'select': {
      const option = control.options.find((item) => item.value === value);
      if (!option) return undefined;
      // code 显式给了（含空串）就以它为准：'leftIcon={<Text>◀</Text>}'
      if (option.code !== undefined) return option.code || undefined;
      if (omittable) return undefined;
      return `${control.name}="${option.value}"`;
    }
  }
}

/** 生成示例代码字符串。 */
export function renderCode(
  componentName: string,
  controls: DemoControl[],
  values: DemoValues,
): string {
  const attributes = controls
    .map((control) => renderAttribute(control, values[control.name]))
    .filter((attribute): attribute is string => Boolean(attribute));

  if (attributes.length === 0) return `<${componentName} />`;
  if (attributes.length === 1) return `<${componentName} ${attributes[0]} />`;

  return [`<${componentName}`, ...attributes.map((attribute) => `  ${attribute}`), '/>'].join('\n');
}
