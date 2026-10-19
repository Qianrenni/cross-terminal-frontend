import { buttonTokens } from './button';
import type { ButtonTokenDict } from './button';
import { iconTokens } from './icon';

/**
 * # ③ 组件层（components）
 *
 * **一个组件一个文件**：
 *
 * ```
 * design/components/button.ts   →  buttonTokens
 * design/components/icon.ts     →  iconTokens
 * design/components/index.ts    →  汇总 + 类型（就是这个文件）
 * ```
 *
 * 新增组件的步骤：
 * 1. 在本目录加 `<组件目录名>.ts`，导出 `xxxTokens`；
 * 2. 在下面汇总对象里加一行（漏了会编译报错）；
 * 3. 组件目录的 `QxxxTokens` 形状要与它一致。
 */
export const components = {
  button: buttonTokens,
  icon: iconTokens,
};

/**
 * 组件层字典的类型（键 = 组件目录名）。
 *
 * ⚠️ `button` 用解析后的 `ButtonTokenDict` 而不是 `typeof buttonTokens`：
 * 源码里的 `font` / `subFont` 是 `semantic.font.*` 路径字符串，解析后是字体对象。
 */
export type ComponentDict = Omit<typeof components, 'button'> & {
  button: ButtonTokenDict;
};

export { buttonTokens } from './button';
export { iconTokens } from './icon';
export type { ButtonTokenDict } from './button';
export type { FontToken } from './font';
export type { IconTokenDict } from './icon';
