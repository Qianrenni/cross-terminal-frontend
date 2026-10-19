/**
 * 跨端组件库入口。
 *
 * 约定：
 * - **组件一律 `Q` 前缀**（`button` → `QButton`，Props 类型 → `QButtonProps`）；
 * - 每个组件独占一个目录，**目录名小写**（`src/button/`），内含 `index.ts` / `type.ts` / `style.ts` / 实现 / 单元测试；
 * - 接口定义与 JSDoc 以仓库根目录的 `COMPONENT.md` 为准。
 */
export * from './types';
export * from './design';
export * from './utils';
export * from './button';
export * from './icon';
export * from './hotzone';
export * from './text';
