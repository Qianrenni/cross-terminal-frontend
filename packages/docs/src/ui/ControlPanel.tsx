import type { DemoControl, DemoValue, DemoValues } from '../demo/types';

interface ControlPanelProps {
  /** 控件定义 */
  controls: DemoControl[];
  /** 当前值 */
  values: DemoValues;
  /** 某个控件值变化 */
  onChange: (name: string, value: DemoValue) => void;
}

/**
 * 由 schema 自动生成的控件面板 —— **配置式 Demo 的核心**。
 *
 * 它不认识任何具体组件，只按 `DemoControl.kind` 渲染对应输入控件，
 * 所以新增组件时不用碰这个文件。
 */
export function ControlPanel({ controls, values, onChange }: ControlPanelProps) {
  return (
    <div className="panel">
      <div className="panel__title">属性配置</div>

      {controls.map((control) => (
        <label className="field" key={control.name}>
          <span className="field__label">
            {control.label}
            <span className="field__kind">{control.kind}</span>
          </span>

          {control.kind === 'boolean' ? (
            <span className="field__control">
              <input
                type="checkbox"
                checked={Boolean(values[control.name])}
                onChange={(event) => onChange(control.name, event.target.checked)}
              />
              <span className="field__switch">{values[control.name] ? 'true' : 'false'}</span>
            </span>
          ) : control.kind === 'select' ? (
            <span className="field__control">
              <select
                value={String(values[control.name])}
                onChange={(event) => onChange(control.name, event.target.value)}
              >
                {control.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </span>
          ) : control.kind === 'number' ? (
            <span className="field__control">
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step ?? 1}
                value={Number(values[control.name])}
                onChange={(event) => onChange(control.name, Number(event.target.value))}
              />
              <output className="field__value">{String(values[control.name])}</output>
            </span>
          ) : (
            <span className="field__control">
              <input
                type="text"
                value={String(values[control.name])}
                placeholder="留空 = 不传该 prop"
                onChange={(event) => onChange(control.name, event.target.value)}
              />
            </span>
          )}

          {control.hint && <span className="field__hint">{control.hint}</span>}
        </label>
      ))}
    </div>
  );
}
