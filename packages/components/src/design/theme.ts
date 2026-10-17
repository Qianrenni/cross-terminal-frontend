import { components } from './components';
import type { ComponentDict } from './components';
import { primitive } from './primitive';
import { semantic } from './semantic';
import type { SemanticDict } from './semantic';

/**
 * **运行时覆盖**：扁平路径 → 值。
 *
 * 路径分两种：
 * - **语义层**（默认）：直接写路径，如 `'color.brand.primary'`；
 * - **组件层**：带 `components.` 前缀，如 `'components.button.height.6'`。
 *
 * 值可以是：
 * - 原子层路径：`'primitive.color.red.500'`（换色，但仍跟着原子层走）；
 * - 语义层路径：`'semantic.color.text.inverse'`（引用另一个语义值）；
 * - **具体值**：`'#EF4444'` / `14`（直接写死，优先级最高）。
 *
 * @example
 * ```ts
 * {
 *   'color.brand.primary': '#EF4444',      // 语义层：改品牌色
 *   'components.button.height.6': 60,        // 组件层：改按钮第 6 档高度
 *   'components.icon.color': 'semantic.color.brand.primary', // 组件层引用语义值
 * }
 * ```
 */
export type ThemeOverrides = Record<string, string | number>;

/**
 * # 主题：把「路径」解析成「值」
 *
 * 语义层与组件层里的**颜色**写的是路径（`'primitive.color.yellow.500'`），
 * 这个文件负责在**运行时**把它们换成真正的值，并叠加主题 / 覆盖：
 *
 * ```
 * semantic（默认：路径）+ 主题的品牌路径 + 调用方的运行时覆盖
 *        ↓ resolve()
 * ThemeConfig.semantic（值）、ThemeConfig.components（值）
 * ```
 *
 * 内置 7 套主题：黄（默认）/ 橙 / 粉 / 蓝 / 红 / 棕 / 绿 —— 换主题只换 `color.brand.*` 这几条路径。
 */

/** 内置主题名。加一套：这里加字面量 + `brandOverrides` 里能取到色相即可。 */
export const THEME_NAMES = ['yellow', 'orange', 'pink', 'blue', 'red', 'brown', 'green'] as const;

/** 主题名。 */
export type ThemeName = (typeof THEME_NAMES)[number];

/** 默认主题：黄。 */
export const DEFAULT_THEME_NAME: ThemeName = 'yellow';

/**
 * 浅色品牌色：这些色相的 500 档很亮，主色上必须放**深色字**；其余色相统一白字。
 */
const LIGHT_BRANDS: readonly ThemeName[] = ['yellow', 'orange', 'green'];

/**
 * 主题 = 只覆盖 `color.brand.*` 这几条语义路径。
 *
 * 其余语义色（文字 / 背景 / 描边 / 状态 / 促销）与字体**不随主题变**。
 */
function brandOverrides(name: ThemeName): ThemeOverrides {
  const hue = `primitive.color.${name}`;
  const light = LIGHT_BRANDS.includes(name);

  return {
    'color.brand.primary': `${hue}.500`,
    // 浅色底配深字、深色底配白字 —— 不写死白色，否则黄色按钮上是白字
    'color.brand.onPrimary': light ? 'primitive.color.gray.900' : 'primitive.color.white',
    'color.brand.subtitle': `${hue}.100`,
    'color.brand.onSubtitle': `${hue}.600`,
    'color.brand.tertiary': `${hue}.50`,
    'color.brand.onTertiary': `${hue}.600`,
    'color.brand.onCombo': light
      ? 'primitive.color.alpha.black.60'
      : 'primitive.color.alpha.white.60',
    'color.brand.text.highlight': `${hue}.600`,
    'color.brand.text.price': `${hue}.600`,
  };
}

/* ============================== 解析 ============================== */

/**
 * 已解析的语义层。
 *
 * ⚠️ 不需要「路径 → 值」的类型映射：**颜色**写路径（解析后仍是 `string`），
 * **数字**直接取原子层的值（`primitive.spacing.m`），所以字典类型 = 解析后的类型。
 */
export type Semantic = SemanticDict;
/** 已解析的组件层（同上）。 */
export type Components = ComponentDict;

/** 沿 `a.b.c` 取值。 */
function readPath(source: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, key) => (node == null ? undefined : (node as Record<string, unknown>)[key]),
      source,
    );
}

/** 沿 `a.b.c` 写值（中间层不存在就建）。 */
function writePath(target: Record<string, unknown>, path: string, value: string | number): void {
  const keys = path.split('.');
  let node = target;
  for (const key of keys.slice(0, -1)) {
    const next = node[key];
    if (typeof next !== 'object' || next == null) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]] = value;
}

/** 深拷贝（只处理普通对象与数组，够 token 用）。 */
function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => clone(item)) as unknown as T;
  if (typeof value === 'object' && value != null) {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, inner]) => {
      out[key] = clone(inner);
    });
    return out as T;
  }
  return value;
}

/** 递归处理每个叶子（保留结构）。 */
function mapLeaves(value: unknown, map: (leaf: unknown) => unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => mapLeaves(item, map));
  if (typeof value === 'object' && value != null) {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, inner]) => {
      out[key] = mapLeaves(inner, map);
    });
    return out;
  }
  return map(value);
}

/**
 * 把字典里的路径解析成值。
 *
 * - `primitive.xxx` → 查原子层；
 * - `semantic.xxx` → 查**上一轮**的语义层（所以字体色能引用 `semantic.color.text.primary`，
 *   覆盖文字色时字体跟着变）；
 * - 其余字符串 / 数字 → 原样保留（字面值、字体栈、字距）。
 *
 * 多跑几轮是为了支持「语义 → 语义 → 原子」这种链；某一轮没有变化就提前结束。
 */
function resolveDict(dict: unknown, semanticLookup: unknown): unknown {
  let current = dict;
  let lookup = semanticLookup;

  for (let pass = 0; pass < 4; pass += 1) {
    let changed = false;

    const next = mapLeaves(current, (leaf) => {
      if (typeof leaf !== 'string') return leaf;

      if (leaf.startsWith('primitive.')) {
        const value = readPath(primitive, leaf.slice('primitive.'.length));
        if (value !== undefined) {
          changed = true;
          return value;
        }
        return leaf;
      }

      if (leaf.startsWith('semantic.')) {
        const value = readPath(lookup, leaf.slice('semantic.'.length));
        // 如果解析结果还是路径，就留到下一轮继续
        if (value !== undefined && value !== leaf) {
          changed = true;
          return value;
        }
      }

      return leaf;
    });

    if (!changed) return next;
    current = next;
    lookup = next;
  }

  return current;
}

/* ============================== 主题 ============================== */

/**
 * 一套完整的主题：**语义层 + 组件层 + 主题名**。
 *
 * 不包含原子层：原子层是静态共享的原始值，不属于「某个主题」，
 * 组件 / 消费方需要时直接从 `design/primitive` 取（或用语义层已经引用好的值）。
 */
export interface ThemeConfig {
  /** 主题名 */
  themeName: ThemeName;
  /** ② 语义层（**已解析**：值是色值 / 数字，不是路径） */
  semantic: Semantic;
  /** ③ 组件层（**已解析**） */
  components: Components;
}

/** 覆盖路径前缀：带它表示改**组件层**（`components.button.height.6`），不带就是语义层。 */
const COMPONENT_PREFIX = 'components.';

/** 把扁平覆盖拆成「语义层」与「组件层」两组。 */
function splitOverrides(overrides?: ThemeOverrides): {
  semantic: ThemeOverrides;
  components: ThemeOverrides;
} {
  const semanticPatches: ThemeOverrides = {};
  const componentPatches: ThemeOverrides = {};

  Object.entries(overrides ?? {}).forEach(([path, value]) => {
    if (path.startsWith(COMPONENT_PREFIX)) {
      componentPatches[path.slice(COMPONENT_PREFIX.length)] = value;
    } else {
      semanticPatches[path] = value;
    }
  });

  return { semantic: semanticPatches, components: componentPatches };
}

/** 按主题名 + 运行时覆盖构造一套主题（不缓存；要稳定引用请用 `getTheme`）。 */
function buildTheme(name: ThemeName, overrides?: ThemeOverrides): ThemeConfig {
  const { semantic: semanticPatches, components: componentPatches } = splitOverrides(overrides);

  // ① 语义层：主题的品牌路径 + 调用方的语义覆盖
  const mergedSemantic = clone(semantic) as unknown as Record<string, unknown>;
  Object.entries({ ...brandOverrides(name), ...semanticPatches }).forEach(([path, value]) => {
    writePath(mergedSemantic, path, value);
  });
  const resolvedSemantic = resolveDict(mergedSemantic, mergedSemantic) as Semantic;

  // ② 组件层：调用方的组件覆盖（可以引用解析后的语义值）
  const mergedComponents = clone(components) as unknown as Record<string, unknown>;
  Object.entries(componentPatches).forEach(([path, value]) => {
    writePath(mergedComponents, path, value);
  });

  return {
    themeName: name,
    semantic: resolvedSemantic,
    components: resolveDict(mergedComponents, resolvedSemantic) as Components,
  };
}

const cache = new Map<ThemeName, ThemeConfig>();

/**
 * 取内置主题（同一个名字永远返回**同一个对象引用**）。
 *
 * 引用稳定很重要：组件拿它当 `WeakMap` 的 key 缓存 `StyleSheet`（见 `button/style.ts`）。
 * 带运行时覆盖的主题**不进缓存**（每次新对象，由调用方 `useMemo` 兜住）。
 */
export function getTheme(
  name: ThemeName = DEFAULT_THEME_NAME,
  overrides?: ThemeOverrides,
): ThemeConfig {
  if (overrides != null) return buildTheme(name, overrides);

  const cached = cache.get(name);
  if (cached != null) return cached;

  const theme = buildTheme(name);
  cache.set(name, theme);
  return theme;
}

/** 默认主题（黄）。无 `QThemeProvider` 时的兜底。 */
export const defaultTheme: ThemeConfig = getTheme();

/**
 * 在已有主题上再叠一层运行时覆盖（语义层 + 组件层都支持）。
 *
 * @example
 * ```ts
 * withOverrides(getTheme('yellow'), {
 *   'color.brand.primary': '#EF4444',
 *   'components.button.height.6': 60,
 * });
 * ```
 */
export function withOverrides(theme: ThemeConfig, overrides: ThemeOverrides): ThemeConfig {
  return buildTheme(theme.themeName, overrides);
}

/**
 * 把「主题名 / 主题对象 / 不传」统一成 {@link ThemeConfig}。
 *
 * 传对象时原样返回（便于调用方自己组装）；带 `overrides` 时按主题名重新解析。
 */
export function resolveTheme(
  input?: ThemeName | ThemeConfig,
  overrides?: ThemeOverrides,
): ThemeConfig {
  if (input == null) {
    return overrides == null ? defaultTheme : withOverrides(defaultTheme, overrides);
  }
  if (typeof input === 'string') return getTheme(input, overrides);
  return overrides == null ? input : withOverrides(input, overrides);
}
