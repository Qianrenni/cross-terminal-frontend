const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
/** 组件库源码根：其内部把 `src` 配成了 `@`（见 packages/components/tsconfig.json 的 paths） */
const componentsSrc = path
  .resolve(workspaceRoot, 'packages/components/src')
  .split(path.sep)
  .join('/');

/**
 * pnpm workspace（monorepo）下的 Metro 配置。
 *
 * 三个关键点：
 * - `watchFolders` 必须包含工作区根目录，否则改组件库源码不会触发热更；
 * - `nodeModulesPaths` 同时包含本包与根目录的 node_modules（hoisted 布局）；
 * - 组件库源码里用了 `@/` 别名（tsconfig paths），Metro 不认 tsconfig，这里手动接管。
 *   仅在「从组件库文件里发起」的导入上生效，不影响 rn-app 自身。
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    resolveRequest: (context, moduleName, platform) => {
      const fromComponents = (context.originModulePath || '')
        .split(path.sep)
        .join('/')
        .startsWith(componentsSrc);

      if (fromComponents && moduleName.startsWith('@/')) {
        const target = `${componentsSrc}/${moduleName.slice(2)}`;
        return context.resolveRequest(context, target, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
