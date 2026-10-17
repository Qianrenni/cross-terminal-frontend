import React from 'react';
import { render } from '@testing-library/react-native';
import { QButton } from '@/button';
import { buttonCases } from './props/Button.cases';

/**
 * 快照测试：把 `props/Button.cases.ts` 里的每组 props **直接渲染** `<QButton />`，锁定渲染结构。
 *
 * 用例（纯数据）集中在 `__tests__/props/` 下——新增组合通常只需在那里加一行，
 * 或用通用生成器 `matrix<T>()`（见 `src/testUtils/case.ts`），本文件不需要改。
 *
 * 视觉变更会让快照失败；确认无误后用 `jest -u` **有意识**地更新。
 */
describe('QButton 快照', () => {
  for (const { name, props } of buttonCases) {
    it(name, () => {
      expect(render(<QButton {...props} />).toJSON()).toMatchSnapshot();
    });
  }
});
