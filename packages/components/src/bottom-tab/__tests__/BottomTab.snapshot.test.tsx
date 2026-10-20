import React from 'react';
import { render } from '@testing-library/react-native';
import { QBottomTab } from '@/bottom-tab';
import { bottomTabCases } from './props/BottomTab.cases';

/**
 * 快照测试：把 `props/BottomTab.cases.ts` 里的每组 props **直接渲染** `<QBottomTab />`。
 *
 * 锁住的是**结构**：每个 item 里 `Active` / `Inactive` 两个图标同时存在（叠在同一个
 * 24×24 盒子里）、文字的绝对定位贴底、以及各层的静态样式数值。
 * 动画进度值是 `Animated.Value` 实例，也会出现在快照里 —— 那是刻意的：
 * 一旦有人把「同时渲染两个图标」改成条件渲染，快照立刻变红。
 */
describe('QBottomTab 快照', () => {
  for (const { name, props } of bottomTabCases) {
    it(name, () => {
      expect(render(<QBottomTab {...props} />).toJSON()).toMatchSnapshot();
    });
  }
});
