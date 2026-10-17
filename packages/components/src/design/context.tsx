import React, { createContext, use, useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DEFAULT_THEME_NAME,
  THEME_NAMES,
  defaultTheme,
  resolveTheme,
  withOverrides,
} from './theme';
import type { Components, Semantic, ThemeConfig, ThemeName, ThemeOverrides } from './theme';

/**
 * # 运行时主题（Context + hooks）
 *
 * ```tsx
 * // ① 根部包一层（不包也能用，兜底默认主题「黄」）
 * <QThemeProvider theme="yellow">
 *   <App />
 * </QThemeProvider>
 *
 * // ② 运行时覆盖（语义层 + 组件层都支持，路径 → 值）
 * <QThemeProvider
 *   theme="yellow"
 *   overrides={{
 *     'color.brand.primary': '#EF4444',        // 语义层
 *     'components.button.height.6': 60,        // 组件层
 *   }}
 * />
 *
 * // ③ 任意位置切换主题 / 读主题
 * const { theme, setTheme } = useQTheme();
 * setTheme('blue');
 *
 * // ④ 组件内部：一次拿到「全局 token + 组件 token」（也支持覆盖）
 * const { theme, global, tokens } = useThemeConfig(props.theme, 'button', overrides);
 * ```
 *
 * ⚠️ 不要在模块顶层缓存主题，否则切换 / 覆盖都不生效。
 */

/** 主题上下文的值。 */
export interface QThemeContextValue {
  /** 当前主题（三层，语义层与组件层都已解析） */
  theme: ThemeConfig;
  /** 运行时切换主题；传名字用内置主题，传对象用自定义主题 */
  setTheme: (next: ThemeName | ThemeConfig) => void;
  /** 当前生效的运行时覆盖 */
  overrides: ThemeOverrides | undefined;
  /** 运行时覆盖（语义层 / 组件层）；传 `undefined` 清除 */
  setOverrides: (next: ThemeOverrides | undefined) => void;
  /** 全部内置主题名 */
  themeNames: readonly ThemeName[];
}

/**
 * 无 `QThemeProvider` 时的兜底：默认主题 + 空操作。
 *
 * 这样组件能脱离 Provider 单独用（尤其是单测直接 `render(<QButton />)`），
 * 也不会因为漏包 Provider 而崩。
 */
const fallback: QThemeContextValue = {
  theme: defaultTheme,
  setTheme: () => {},
  overrides: undefined,
  setOverrides: () => {},
  themeNames: THEME_NAMES,
};

const ThemeContext = createContext<QThemeContextValue>(fallback);

/**
 * prop 指纹：主题名 + 覆盖对象的内容。
 *
 * 用**内容**而不是对象引用，这样父组件每次 render 新建 `overrides` 对象也不会让本地覆盖失效。
 */
function themeKey(theme: ThemeName | ThemeConfig, overrides?: ThemeOverrides): string {
  const name = typeof theme === 'string' ? theme : theme.themeName;
  return overrides == null ? name : `${name}|${JSON.stringify(overrides)}`;
}

/** `QThemeProvider` 的 props。 */
export interface QThemeProviderProps {
  /** 初始主题；传主题名（内置）或完整主题对象（自定义）。默认「黄」 */
  theme?: ThemeName | ThemeConfig;
  /**
   * 运行时覆盖：扁平路径 → **值**（也可以是原子层 / 语义层路径）。
   *
   * - 语义层：直接写路径，如 `'color.brand.primary'`；
   * - 组件层：带 `components.` 前缀，如 `'components.button.height.6'`。
   *
   * @example `{ 'color.brand.primary': '#EF4444', 'components.button.height.6': 60 }`
   */
  overrides?: ThemeOverrides;
  children?: ReactNode;
}

/**
 * 主题提供者。
 *
 * - `theme` / `overrides` 是**受控输入**：父组件一变，子树立刻跟着变；
 * - `setTheme()` / `setOverrides()` 写入的是**本地覆盖**，它绑定在「当前 prop 指纹」上：
 *   prop 一变（`themeKey` 变）本地覆盖自动失效，回到 prop 的主题；
 * - 同一个主题名（无覆盖）返回同一个对象引用，基于主题对象的缓存不会失效。
 *
 * ⚠️ 这里**没有** `useEffect` 同步 prop → state：那是 React 明确不推荐的模式
 * （`react-hooks/set-state-in-effect`），既多一轮渲染，又容易在快速切换时读到旧值。
 * 现在用「派生值 + 带指纹的本地覆盖」表达同一语义，纯渲染期计算。
 */
export function QThemeProvider({
  theme = DEFAULT_THEME_NAME,
  overrides,
  children,
}: QThemeProviderProps) {
  /** 本地覆盖：`key` 是写入时的 prop 指纹，prop 变了它就不再匹配（自动失效） */
  const [local, setLocal] = useState<{ key: string; theme: ThemeConfig } | undefined>(undefined);

  const propKey = themeKey(theme, overrides);
  const propTheme = useMemo(() => resolveTheme(theme, overrides), [theme, overrides]);

  /** 当前生效主题：本地覆盖优先（仅当它是对当前 prop 写入的） */
  const active = local != null && local.key === propKey ? local.theme : propTheme;

  const setTheme = useCallback(
    (next: ThemeName | ThemeConfig) => setLocal({ key: propKey, theme: resolveTheme(next) }),
    [propKey],
  );

  /** 运行时覆盖：在当前生效主题上重新解析 */
  const setOverrides = useCallback(
    (next: ThemeOverrides | undefined) =>
      setLocal({ key: propKey, theme: resolveTheme(active.themeName, next) }),
    [propKey, active.themeName],
  );

  const value = useMemo<QThemeContextValue>(
    () => ({ theme: active, setTheme, overrides, setOverrides, themeNames: THEME_NAMES }),
    [active, setTheme, overrides, setOverrides],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

/** 读完整上下文（主题 + 切换函数 + 覆盖函数）。 */
export function useQTheme(): QThemeContextValue {
  return use(ThemeContext);
}

/** 读当前主题。 */
export function useTheme(): ThemeConfig {
  return use(ThemeContext).theme;
}

/** `useThemeConfig` 的返回值：全局 token + 组件 token。 */
export interface ThemeConfigResult<T extends keyof Components> {
  /** 完整主题（三层都在） */
  theme: ThemeConfig;
  /** 全局语义 token（颜色 + 字体） */
  global: Semantic;
  /** 该组件的 token */
  tokens: Components[T];
}

/**
 * 取「全局 token + 某个组件的 token」——组件实现的标准入口。
 *
 * 顺序与需求一致：**先主题，后组件名**，覆盖放最后。
 *
 * @example
 * ```tsx
 * // ① 跟随当前主题
 * const { global, tokens } = useThemeConfig('button');
 *
 * // ② 组件 props 上的 theme 覆盖
 * const { global, tokens } = useThemeConfig(props.theme, 'button');
 *
 * // ③ 再叠一层「按值」覆盖（只影响这个组件）
 * const { global, tokens } = useThemeConfig(props.theme, 'button', {
 *   'color.brand.primary': '#EF4444',        // 语义层
 *   'components.button.height.6': 60,        // 组件层
 * });
 * ```
 */
export function useThemeConfig<T extends keyof Components>(componentName: T): ThemeConfigResult<T>;
export function useThemeConfig<T extends keyof Components>(
  theme: ThemeName | ThemeConfig | undefined,
  componentName: T,
  overrides?: ThemeOverrides,
): ThemeConfigResult<T>;
export function useThemeConfig<T extends keyof Components>(
  themeOrName: ThemeName | ThemeConfig | T,
  maybeComponentName?: T,
  overrides?: ThemeOverrides,
): ThemeConfigResult<T> {
  // hook 必须无条件调用：先拿当前主题，再决定是否被覆盖
  const active = useTheme();

  const componentName = (maybeComponentName ?? themeOrName) as T;
  const requested =
    maybeComponentName == null ? undefined : (themeOrName as ThemeName | ThemeConfig | undefined);

  const base = requested == null ? active : resolveTheme(requested);

  const theme = useMemo(
    () => (overrides == null ? base : withOverrides(base, overrides)),
    [base, overrides],
  );

  return useMemo(
    () => ({ theme, global: theme.semantic, tokens: theme.components[componentName] }),
    [theme, componentName],
  );
}
