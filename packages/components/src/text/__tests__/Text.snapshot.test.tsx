import React from 'react';
import { render } from '@testing-library/react-native';
import { QText } from '@/text';
import { textCases } from './props/Text.cases';

/**
 * 快照测试：把 `props/Text.cases.ts` 里的每组 props **直接渲染** `<QText />`，锁定渲染结构。
 *
 * 文本没有子节点结构，快照锁住的其实是**最终样式**
 * （字号 / 行高 / 字重 / 字距 / 字体栈 / 颜色），
 * 也就是「`typography` 路径 → 语义层 token → 实际数值」这条链路的结果。
 */
describe('QText 快照', () => {
  for (const { name, props } of textCases) {
    it(name, () => {
      expect(render(<QText {...props} />).toJSON()).toMatchSnapshot();
    });
  }
});
