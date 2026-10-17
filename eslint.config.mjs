import qyaniConfig from '@qyani/eslint-config';

/**
 * 工作区根配置：直接复用共享包 `@qyani/eslint-config`（`packages/eslint/`）。
 *
 * 用 `.mjs` 而不是 `.js`：根 `package.json` 没有 `"type": "module"`，
 * 而配置文件是 ESM，`.js` 会触发 Node 的 `MODULE_TYPELESS_PACKAGE_JSON` 警告。
 * （不给根包加 `"type": "module"`，是因为 `scripts/` 下还有 CJS 脚本。）
 */
export default [...qyaniConfig];
