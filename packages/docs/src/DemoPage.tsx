import { useCallback, useMemo, useRef, useState } from 'react';
import { useQTheme } from '@cross-terminal/components';
import {
  initialValues,
  type AnyComponentDemo,
  type DemoValue,
  type DemoValues,
} from './demo/types';
import { renderCode } from './demo/toCode';
import { ControlPanel } from './ui/ControlPanel';
import { HotzoneOverlay } from './ui/HotzoneOverlay';

interface DemoPageProps {
  /** 当前组件 */
  demo: AnyComponentDemo;
  /** 返回列表 */
  onBack: () => void;
  /** 是否显示热区（可点范围）调试覆盖层 */
  hotzone: boolean;
}

/**
 * 组件 Demo 页：左侧实时预览 + 示例代码，右侧由 schema 生成的控件面板。
 *
 * 本页完全不认识具体组件（只知道 `Component` / `controls` / `toProps`），
 * 所以新增组件不需要改这里。
 */
export function DemoPage({ demo, onBack, hotzone }: DemoPageProps) {
  const [values, setValues] = useState<DemoValues>(() => initialValues(demo.controls));
  const [pressedCount, setPressedCount] = useState(0);
  const [copied, setCopied] = useState(false);

  /** 预览区容器：热区覆盖层以它为坐标系测量 */
  const stageRef = useRef<HTMLDivElement>(null);

  /**
   * **当前生效主题**（顶栏切主题会变）。
   *
   * 必须传给 `toProps`：颜色 / 字体这类主题派生值要现算，
   * 否则 demo 里在模块顶层取一次默认主题，切主题时预览不会变色。
   */
  const { theme } = useQTheme();

  const props = useMemo(() => demo.toProps(values, theme), [demo, values, theme]);
  const code = useMemo(
    () =>
      demo.renderCode ? demo.renderCode(values) : renderCode(demo.name, demo.controls, values),
    [demo, values],
  );

  const handleChange = (name: string, value: DemoValue) => {
    setValues((current) => ({ ...current, [name]: value }));
    setPressedCount(0);
  };

  /**
   * 稳住回调引用。
   *
   * `QButton` 是 `memo` 组件，`onPress` 每次新建就会让浅比较失败、memo 白加。
   * 这里是文档站给使用者的示范：传给 memo 组件的回调一律 `useCallback`。
   */
  const handlePress = useCallback(() => setPressedCount((count) => count + 1), []);

  const handleReset = () => {
    setValues(initialValues(demo.controls));
    setPressedCount(0);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // 非 https / 无权限时忽略，代码区本来就可以手动选中
    }
  };

  return (
    <div className="demo">
      <button className="back" type="button" onClick={onBack}>
        ← 返回组件列表
      </button>

      <header className="demo__header">
        <h1 className="demo__title">{demo.name}</h1>
        <code className="demo__key">#{demo.key}</code>
      </header>
      <p className="demo__desc">{demo.description}</p>

      <div className="demo__body">
        <section className="demo__left">
          <div className="stage">
            <div className="stage__label">
              实时预览
              {hotzone && (
                <span className="stage__legend">
                  热区：<b className="stage__legend-pressable">蓝</b> 可点元素 ·
                  <b className="stage__legend-hotzone">橙</b> 外扩热区
                </span>
              )}
            </div>
            <div className="stage__area" ref={stageRef}>
              <demo.Component {...props} onPress={handlePress} />
              {hotzone && <HotzoneOverlay containerRef={stageRef} />}
            </div>
            <div className="stage__foot">
              <span>
                onPress 触发 <b>{pressedCount}</b> 次
              </span>
              <button className="btn btn--ghost" type="button" onClick={handleReset}>
                重置
              </button>
            </div>
          </div>

          <div className="code">
            <div className="code__bar">
              <span className="code__label">示例代码</span>
              <button className="btn btn--ghost" type="button" onClick={handleCopy}>
                {copied ? '已复制 ✓' : '复制'}
              </button>
            </div>
            <pre className="code__body">
              <code>{code}</code>
            </pre>
          </div>
        </section>

        <aside className="demo__right">
          <ControlPanel controls={demo.controls} values={values} onChange={handleChange} />
        </aside>
      </div>
    </div>
  );
}
