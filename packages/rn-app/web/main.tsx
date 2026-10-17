/**
 * Web 端入口：与 RN 端共用同一份 `App.tsx`，通过 `react-native-web` 渲染到浏览器。
 *
 * 与 RN 端（`index.ts`）的差别：
 * - RN 端由原生容器 `startReactApplication` 拉起，这里由我们手动 `runApplication`；
 * - 容器注入的 props（route / appKey / versionCode / dark）在 Web 端用 URL query 模拟，
 *   便于本地联调：`?versionCode=2&dark=1`
 */
import { AppRegistry } from 'react-native';
import App from '../App';
import { name as appName } from '../app.json';

AppRegistry.registerComponent(appName, () => App);

const container = document.getElementById('root');
if (!container) {
  throw new Error('找不到 #root 容器节点');
}

const params = new URLSearchParams(window.location.search);

/**
 * 类型桥接：`AppRegistry` 的类型来自 `react-native`（RN 的 rootTag 是 symbol），
 * 而运行时经 Vite 别名解析到 `react-native-web`，它需要真实的 DOM 节点。
 * 两者类型不一致，这里显式桥接，避免污染 App 代码。
 */
type RunApplicationParams = Parameters<typeof AppRegistry.runApplication>[1];

AppRegistry.runApplication(appName, {
  rootTag: container,
  initialProps: {
    route: params.get('route') ?? '/rn/demo',
    appKey: params.get('appKey') ?? 'guga_app',
    versionCode: Number(params.get('versionCode') ?? '1'),
    dark: params.get('dark') === '1',
  },
} as unknown as RunApplicationParams);
