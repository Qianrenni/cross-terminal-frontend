/**
 * 快照用例的**通用类型与生成器**（与具体组件无关）。
 *
 * 用例数据本身放在各组件的 `__tests__/props/<Name>.cases.ts` 里；
 * 本文件只提供类型与批量生成工具，被各组件共用。
 */

/** 一个用例：用例名 + 某个组件的 props。`T` 可以是任意组件的 Props 类型。 */
export interface Case<T> {
  /** 用例名（会成为快照标题，同一文件内需唯一） */
  name: string;
  /** 直接透传给组件的 props */
  props: T;
}

/** 快捷构造单个用例。 */
export function testCase<T>(name: string, props: T): Case<T> {
  return { name, props };
}

/**
 * 笛卡尔积批量生成用例：`axes` 里每一项取一个片段，组合成完整 props。
 *
 * 用例名由各片段的 key 用 `/` 拼接，便于在快照里定位是哪一维出的问题。
 *
 * 由于 `T` 只能从 `base` 推断（推断结果通常过窄），批量生成时请**显式传泛型**：
 *
 * @example
 * matrix<QButtonProps>({ text: '提交' }, [
 *   { 实心: { type: 'primary' }, 描边: { type: 'secondary' } },
 *   { 默认: {}, 禁用: { disabled: true } },
 * ]);
 * // → 实心/默认、实心/禁用、描边/默认、描边/禁用
 */
export function matrix<T extends object>(
  base: T,
  axes: Array<Record<string, Partial<T>>>,
): Case<T>[] {
  return axes.reduce<Case<T>[]>(
    (cases, axis) =>
      cases.flatMap(({ name, props }) =>
        Object.entries(axis).map(([label, patch]) => ({
          name: name ? `${name}/${label}` : label,
          props: { ...props, ...patch } as T,
        })),
      ),
    [{ name: '', props: base }],
  );
}
