import React from 'react';
import { render } from '@testing-library/react-native';
import { QIcon } from '@/icon';
import { iconCases } from './props/Icon.cases';

/**
 * 快照测试：把 `props/Icon.cases.ts` 里的每组 props **直接渲染** `<QIcon />`，锁定渲染结构。
 *
 * 用例（纯数据）集中在 `__tests__/props/` 下 —— 新增组合通常只需在那里加一行，
 * 或用通用生成器 `matrix<T>()`（见 `src/testUtils/case.ts`），本文件不需要改。
 *
 * 快照锁住的是 `<Svg viewBox={…}><Path d={…} /></Svg>` 这一层结构：路径数据、`viewBox`、
 * 描边宽度、颜色。这些都是**纯数据**，所以快照在两端（RN / RNW）应当完全一致 ——
 * 这也是从「字形字体」换成 SVG 之后额外拿到的好处（旧方案只能锁住某个系统字体的排版结果）。
 */
describe('QIcon 快照', () => {
  for (const { name, props } of iconCases) {
    it(name, () => {
      expect(render(<QIcon {...props} />).toJSON()).toMatchSnapshot();
    });
  }
});
