import { useMemo, useState } from 'react';
import { searchDemos, demos } from './demo/registry';
import { ComponentList } from './ui/ComponentList';

interface HomePageProps {
  onOpen: (key: string) => void;
}

/** 首页：组件列表 + 按组件名搜索。 */
export function HomePage({ onOpen }: HomePageProps) {
  const [keyword, setKeyword] = useState('');
  const matched = useMemo(() => searchDemos(keyword), [keyword]);

  return (
    <div className="home">
      <h1 className="home__title">组件库</h1>
      <p className="home__subtitle">共 {demos.length} 个组件。点进去可以实时改 props 看效果。</p>

      <div className="search">
        <input
          className="search__input"
          type="search"
          autoFocus
          value={keyword}
          placeholder="搜索组件名（如 button / QButton）"
          onChange={(event) => setKeyword(event.target.value)}
        />
        {keyword && (
          <button className="search__clear" type="button" onClick={() => setKeyword('')}>
            清除
          </button>
        )}
      </div>

      <p className="home__count">
        {keyword ? `匹配 ${matched.length} / ${demos.length}` : `全部 ${demos.length} 个`}
      </p>

      <ComponentList demos={matched} onOpen={onOpen} />
    </div>
  );
}
