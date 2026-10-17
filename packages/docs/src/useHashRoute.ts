import { useCallback, useEffect, useState } from 'react';

/** 从 `location.hash` 取路由 key：`#/button` → `button`，`#/` → ''。 */
function readKey(): string {
  return window.location.hash.replace(/^#\/?/, '');
}

/**
 * 极简 hash 路由。
 *
 * 只有两个页面（列表 / Demo），所以没引路由库：
 * hash 天然支持刷新与前进后退，且静态部署不需要服务端 rewrite。
 * 以后要换成 react-router，只需替换本文件与 `App.tsx` 里的两处调用。
 */
export function useHashRoute() {
  const [key, setKey] = useState(readKey);

  useEffect(() => {
    const handleChange = () => setKey(readKey());
    window.addEventListener('hashchange', handleChange);
    return () => window.removeEventListener('hashchange', handleChange);
  }, []);

  const navigate = useCallback((next: string) => {
    window.location.hash = next ? `#/${next}` : '#/';
  }, []);

  return { key, navigate };
}
