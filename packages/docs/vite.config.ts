import path from 'node:path';
import { defineConfig, searchForWorkspaceRoot, type Plugin } from 'vite';

/**
 * react-native-svg 15.16.0 的 **web 打包缺陷**补丁。
 *
 * 它的 `lib/module/lib/SvgTouchableMixin.js`（**web 路径上的 `WebShape` 也会 import 它**）里有：
 *
 * ```js
 * if (Platform.OS === 'android' && !this.props.touchSoundDisabled) {
 *   const soundModule = require('../fabric/NativeSvgSoundModule').default;
 *   soundModule.playTouchSound();
 * }
 * ```
 *
 * 运行时被 `Platform.OS === 'android'` 挡住，Web 永远不会执行；
 * 但**打包器是静态解析的**，会顺着这个惰性 `require` 把原生 fabric 实现
 * （它 `import { TurboModuleRegistry } from 'react-native'`）拉进 web 依赖图，
 * 于是构建报 `MISSING_EXPORT "TurboModuleRegistry" is not exported by react-native-web`。
 *
 * 这里把它换成空实现（web 下不会被调）。
 *
 * 第二处：`lib/module/lib/resolveAssetUri.web.js` **具名导入** `@react-native/assets-registry/registry`
 * 的 `getAssetByID` —— 那是 **react-native 核心包**的模块（不是 react-native-web 的），纯 RNW 构建解析不到。
 * 它只在 `SvgUri` / `SvgXml` 拿到**数字资源 id**（`require('./x.png')`）时才被调用，
 * 而我们的用法是 `name → path 数据`，永远不走那条路，所以给个空实现即可。
 *
 * ⚠️ **升级 react-native-svg 后先跑一次 build**，确认这两处补丁是否还需要。
 */
function patchRnSvgForWeb(): Plugin {
  /**
   * 虚拟模块 id。
   *
   * ⚠️ 不能用 Vite 惯例的 `'\0'` 前缀：实测这条路径上 `load` 收到的 id **被剥掉了 `\0`**
   * （`resolveId` 返回 `'\0xxx'`，`load` 收到的却是 `'xxx'`），于是 `id === STUB_ID` 恒为 false、
   * 补丁**静默失效**（构建仍报原来的错）。用普通 id + 子串匹配最稳。
   */
  const SOUND_STUB = 'virtual:rn-svg-sound-stub';
  const ASSETS_STUB = 'virtual:rn-assets-registry-stub';
  return {
    name: 'patch-rn-svg-for-web',
    enforce: 'pre',
    resolveId(source) {
      if (source.includes('NativeSvgSoundModule')) return SOUND_STUB;
      if (source.includes('@react-native/assets-registry')) return ASSETS_STUB;
      return null;
    },
    load(id) {
      if (id.includes('rn-svg-sound-stub')) return 'export default { playTouchSound() {} };';
      if (id.includes('rn-assets-registry-stub'))
        return 'export function getAssetByID() { return null; }';
      return null;
    },
  };
}

/**
 * 上面那个补丁的**预打包专用版**。
 *
 * 为什么不直接复用 `patchRnSvgForWeb`：预打包（dev）里 Vite 的插件管线是**旁路**的 ——
 * 相对路径（`./xxx`、`../xxx`）**根本不经过用户插件的 `resolveId`**，所以上面那句
 * 相对路径的 `require('../fabric/NativeSvgSoundModule')` 拦不住。
 *
 * 但 **`load` 钩子照常会被调用**，所以这里改成直接替换该文件的**内容**。
 * 两种模式下语义一致：都是把 web 下永远不会执行的原生 sound module 换成空实现。
 */
function stubRnSvgSoundForOptimizer() {
  return {
    name: 'stub-rn-svg-native-sound-in-optimizer',
    load: {
      filter: { id: /fabric[\\/]NativeSvgSoundModule\.js$/ },
      handler() {
        return 'export default { playTouchSound() {} };';
      },
    },
  };
}

/**
 * 组件库源码根。
 *
 * 组件库内部把 `src` 配成了 `@`（见 `packages/components/tsconfig.json` 的 `paths`），
 * Vite 不读 tsconfig，因此这里手动映射。
 * 依赖 cwd 为 docs 目录（用 `pnpm --filter @cross-terminal/docs run ...` 即可保证）。
 */
const componentsSrc = path.resolve(process.cwd(), '../components/src').split(path.sep).join('/');

/**
 * 站点部署根路径。
 *
 * GitHub Pages 的**项目页**地址是 `https://<owner>.github.io/<repo>/`，
 * 资源必须挂在 `/<repo>/` 下，否则 JS/CSS 全 404。
 *
 * - 本地 dev / preview / 默认构建：`/`
 * - CI（`.github/workflows/deploy-docs.yml`）：`DOCS_BASE=/<repo>/ pnpm docs:build`
 * - 自定义域名或 `<owner>.github.io` 仓库：把 `DOCS_BASE` 设成 `/`
 */
const base = process.env.DOCS_BASE ?? '/';

/**
 * 文档站（浏览器端）。
 *
 * 关键点：
 * - `react-native` → `react-native-web` 别名：组件库源码里的 `import ... from 'react-native'`
 *   在浏览器里自动换成 RNW，**组件库本身不用改一行**；
 * - 扩展名按 `.web.*` 优先解析，便于将来写平台差异化文件（`Xxx.web.tsx`）；
 * - 站点外壳用纯 DOM + CSS（`index.html` 在包根，不用 `root` 子目录），
 *   只有**预览区**渲染组件库（RNW）—— 外壳不该长得像 RN；
 * - `__DEV__` / `global` 是 RN 生态里的常见全局量，浏览器端注入。
 */
export default defineConfig({
  // 部署到子路径（GitHub Pages 项目页）时由 `DOCS_BASE` 指定，见上方说明
  base,
  plugins: [patchRnSvgForWeb()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      // react-native-svg 没有 `browser` / `exports` 字段，默认入口是**原生实现**，
      // Web 端必须显式指向它的 web 实现。
      // 注意：这个 key 比 `react-native` 长，Vite 会先匹配长 key，所以不会被前缀规则改写成
      // `react-native-web-svg` —— 但这是隐含依赖，改动本块前先跑一次 build 确认。
      'react-native-svg': 'react-native-svg/lib/module/ReactNativeSVG.web.js',
      // 组件库内部别名。注意“斜杠”不能省：`@/` 不会误伤 `@cross-terminal/*`
      '@/': `${componentsSrc}/`,
    },
    extensions: [
      '.web.tsx',
      '.web.ts',
      '.web.jsx',
      '.web.js',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.json',
    ],
  },
  /**
   * 依赖预打包（dev）的解析配置 —— **必须把 `.web.*` 的顺序在这里再写一遍**。
   *
   * Vite 内部的预打包 rolldown 实例把扩展名**硬编码**了，而且**不含 `.web.*`**：
   *
   * ```js
   * resolve: { extensions: ['.tsx', '.ts', '.jsx', '.js', '.css', '.json'], ...rolldownOptions.resolve }
   * ```
   *
   * 于是 `react-native-svg` 的 `lib/module/ReactNativeSVG.web.js` 里那句
   * `import ... from './elements'`（**无扩展名**）会命中**原生**的 `elements.js`
   * （它 `import '../fabric/*NativeComponent'`），把整条原生 fabric 链拉进依赖图，
   * 报 33 个 `MISSING_EXPORT "codegenNativeComponent" is not exported by react-native-web`。
   *
   * 最后那个 `...rolldownOptions.resolve` 说明这里是**官方可覆盖点**，覆盖即可。
   * 注意：一旦覆盖就要写全（自己把 `.css` / `.json` 补回来）。
   *
   * ——— 下面三条路都试过，行不通，别再踩 ———
   * ① 「给 fabric 文件打桩」：报错会消失，但预打包产物里的 `Svg` / `Path` 会变成原生 codegen 组件，
   *    Web 端**渲染不出来**（静默白屏，比报错难查得多）。必须修正**解析行为**。
   * ② 「`optimizeDeps.exclude: ['react-native-svg']`」：解析确实对了，但该包 `lib/module/` 里
   *    还躺着一个 **CommonJS** 文件（`lib/extract/transform.js`，pegjs 生成物，末尾 `module.exports`），
   *    它的 CJS→ESM interop **只在预打包时才有**；排除之后 dev 直接报
   *    `does not provide an export named 'parse'`。所以必须**保留**预打包。
   * ③ 「往 `optimizeDeps.rolldownOptions.plugins` 塞自定义 `resolveId`」：插件确实被加载，
   *    但**相对路径**（`./elements`）根本不经过插件 `resolveId`，实测无效。
   */
  optimizeDeps: {
    rolldownOptions: {
      /**
       * 预打包里的「fabric 桩」。
       *
       * 注意：**不能用插件的 `resolveId`**（相对路径不经过插件），必须用 `load` 改内容；
       * 这一条是上面那 33 个错修好之后**仅剩**的错误。
       */
      plugins: [stubRnSvgSoundForOptimizer()],
      resolve: {
        extensions: [
          '.web.tsx',
          '.web.ts',
          '.web.jsx',
          '.web.js',
          '.tsx',
          '.ts',
          '.jsx',
          '.js',
          '.css',
          '.json',
        ],
      },
    },
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    global: 'window',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    // rn-app 的 web 用 5173，这里错开
    port: 5174,
    open: false,
    fs: {
      // 允许访问工作区根目录：`@cross-terminal/components` 是 workspace 链接包，源码在本包之外
      allow: [searchForWorkspaceRoot(process.cwd())],
    },
  },
});
