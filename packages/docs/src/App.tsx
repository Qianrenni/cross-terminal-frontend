import { useState } from 'react';
import {
  DEFAULT_THEME_NAME,
  QLargeScreenProvider,
  QThemeProvider,
  THEME_NAMES,
  type ThemeName,
} from '@cross-terminal/components';
import { demos, findDemo } from './demo/registry';
import { BenchPage } from './BenchPage';
import { DemoPage } from './DemoPage';
import { HomePage } from './HomePage';
import { useHashRoute } from './useHashRoute';

/**
 * 应用外壳：hash 路由 + 顶栏（主题切换 / 热区开关 / 大屏换算开关）。
 *
 * - **主题切换**：整个 `<main>` 包在 `QThemeProvider` 里，预览区通过
 *   `useThemeConfig()` 读当前主题，所以改下拉框会**即时**改色。
 * - **热区开关**：打开后预览区会画出「哪些元素能点、范围多大」
 *   （蓝 = 元素自身，橙 = `QHotzone` 外扩的热区），实现见 `ui/HotzoneOverlay.tsx`。
 * - **大屏换算开关**：`QLargeScreenProvider` 控制组件是否按窗口宽度缩放
 *   （`enabled=false` 时 `useLargeScreenScale()` 恒为 1）；桌面浏览器打开时能看到 1.4 倍效果。
 */
export function App() {
  const { key, navigate } = useHashRoute();
  const demo = key ? findDemo(key) : undefined;

  const [themeName, setThemeName] = useState<ThemeName>(DEFAULT_THEME_NAME);
  const [hotzone, setHotzone] = useState(false);
  const [largeScreen, setLargeScreen] = useState(true);

  return (
    <QThemeProvider theme={themeName}>
      <QLargeScreenProvider enabled={largeScreen}>
        <div className="app">
          <header className="topbar">
            <button className="topbar__brand" type="button" onClick={() => navigate('')}>
              跨端组件库
            </button>
            <span className="topbar__meta">react-native-web · 浏览器端渲染</span>

            <button className="topbar__link" type="button" onClick={() => navigate('bench')}>
              性能
            </button>

            <label className="topbar__switch">
              <input
                type="checkbox"
                checked={hotzone}
                onChange={(event) => setHotzone(event.target.checked)}
              />
              热区
            </label>

            <label className="topbar__switch">
              <input
                type="checkbox"
                checked={largeScreen}
                onChange={(event) => setLargeScreen(event.target.checked)}
              />
              大屏转换
            </label>

            <label className="topbar__theme">
              主题
              <select
                value={themeName}
                onChange={(event) => setThemeName(event.target.value as ThemeName)}
              >
                {THEME_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </header>

          <main className="main">
            {key === 'bench' ? (
              <BenchPage largeScreen={largeScreen} onLargeScreenChange={setLargeScreen} />
            ) : demo ? (
              /**
               * `key` 是必须的：`#/icon` → `#/button` 只是 hash 变化，React 会**复用同一个
               * `DemoPage` 实例**，而 `DemoPage` 里的 `useState(initialValues(...))` 只在挂载时求值，
               * 结果就是换组件后控件值还是上一个组件的 —— 表现为 `QButton` 读到 undefined 的 props。
               * 用 `key` 强制按组件重挂载，状态自然重置。
               */
              <DemoPage key={demo.key} demo={demo} onBack={() => navigate('')} hotzone={hotzone} />
            ) : key ? (
              <div className="notfound">
                <h1>找不到组件 #{key}</h1>
                <p>可用：{demos.map((item) => `#${item.key}`).join('、')}</p>
                <button className="btn" type="button" onClick={() => navigate('')}>
                  返回组件列表
                </button>
              </div>
            ) : (
              <HomePage onOpen={navigate} />
            )}
          </main>
        </div>
      </QLargeScreenProvider>
    </QThemeProvider>
  );
}
