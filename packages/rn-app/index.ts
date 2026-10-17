/**
 * RN 入口：注册名为 MainComponent 的根组件。
 *
 * 容器侧通过 `startReactApplication(manager, entry, props)` 加载，
 * 其中 `entry` 必须与 app.json 里的 `name` 一致（服务端下发的 entry 字段同理）。
 */
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
