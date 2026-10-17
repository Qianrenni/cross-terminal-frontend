import type { AnyComponentDemo } from '../demo/types';

interface ComponentListProps {
  /** 已过滤的组件列表 */
  demos: AnyComponentDemo[];
  /** 打开某个组件 */
  onOpen: (key: string) => void;
}

/** 首页的组件列表。 */
export function ComponentList({ demos, onOpen }: ComponentListProps) {
  if (demos.length === 0) {
    return <p className="empty">没有匹配的组件。</p>;
  }

  return (
    <ul className="cards">
      {demos.map((demo) => (
        <li key={demo.key}>
          <button className="card" type="button" onClick={() => onOpen(demo.key)}>
            <span className="card__name">{demo.name}</span>
            <span className="card__key">#{demo.key}</span>
            <span className="card__desc">{demo.description}</span>
            <span className="card__meta">{demo.controls.length} 个可配置 prop</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
