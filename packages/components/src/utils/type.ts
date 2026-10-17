/**
 * 将对象类型的属性递归设为可选，数组元素同样递归处理。
 *
 * @template T - 要转换的原始对象类型。
 */
export type DeepPartial<T> = T extends (infer Item)[]
  ? DeepPartial<Item>[]
  : T extends object
    ? { [Key in keyof T]?: DeepPartial<T[Key]> }
    : T;

/**
 * 将对象类型的属性递归设为只读。
 *
 * @template T - 要转换的原始对象类型。
 */
export type DeepReadonly<T> = {
  readonly [Key in keyof T]: DeepReadonly<T[Key]>;
};

/**
 * 将对象类型的属性递归设为非空且必填。
 *
 * @template T - 要转换的原始对象类型。
 */
export type DeepNonNullable<T> = {
  [Key in keyof T]-?: DeepNonNullable<T[Key]>;
};

/**
 * 将对象类型的属性递归设为必填。
 *
 * @template T - 要转换的原始对象类型。
 */
export type DeepRequired<T> = {
  [Key in keyof T]-?: DeepRequired<T[Key]>;
};

/**
 * 将对象类型的属性递归移除只读修饰。
 *
 * @template T - 要转换的原始对象类型。
 */
export type DeepMutable<T> = {
  -readonly [Key in keyof T]: DeepMutable<T[Key]>;
};

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

// 3. 深度合并函数
export function deepMerge<T extends Record<string, unknown>>(base: T, override: DeepPartial<T>): T {
  // 克隆 base，避免修改原对象
  const result: Record<string, unknown> = { ...base };
  const baseRecord = base as Record<string, unknown>;
  const overrideRecord = override as Record<string, unknown>;

  for (const key of Object.keys(overrideRecord)) {
    const overrideVal = overrideRecord[key];
    const baseVal = baseRecord[key];

    // 如果 overrideVal 是 undefined，跳过（保留 base 的值）
    if (overrideVal === undefined) continue;

    // 如果 base 和 override 对应位置都是纯对象，则递归合并
    if (isPlainObject(overrideVal) && isPlainObject(baseVal)) {
      result[key] = deepMerge(baseVal, overrideVal);
    } else {
      // 否则（叶子节点、数组、null 等），直接用 override 覆盖
      result[key] = overrideVal;
    }
  }

  return result as T;
}
