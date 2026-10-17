import { createElement } from 'react';
import { Text } from 'react-native';
import type { QButtonProps } from '@/button/type';
import { matrix, testCase, type Case } from '@/testUtils/case';

/**
 * QButton 的快照用例（**只存数据**，渲染与断言交给 `Button.snapshot.test.tsx`）。
 *
 * 本文件是 `.ts` 而非 `.tsx`，因此不能写 JSX；图标这类需要节点的地方用 `createElement`。
 */

/** 图标占位：图标系统尚未实现，先用文本节点代替。 */
const LEFT_ICON = createElement(Text, null, '◀');
const RIGHT_ICON = createElement(Text, null, '▶');

/** 全部用例。 */
export const buttonCases: Case<QButtonProps>[] = [
  // —— 精确指定的特殊组合 ——
  testCase('默认', { text: '提交' }),
  testCase('仅副文案', { text: '提交订单', subText: '¥128.00' }),
  testCase('仅后缀', { text: '提交订单', suffixText: '去支付' }),
  testCase('双行 + 前后缀', {
    text: '提交订单',
    suffixText: '去支付',
    subText: '¥128.00',
    subSuffixText: '限时',
  }),
  testCase('左图标', { text: '提交', leftIcon: LEFT_ICON }),
  testCase('右图标', { text: '提交', rightIcon: RIGHT_ICON }),
  testCase('左右图标', { text: '提交', leftIcon: LEFT_ICON, rightIcon: RIGHT_ICON }),
  testCase('最低层级 L1', { text: '提交', level: 1 }),
  testCase('自定义无障碍标签', { text: '提交', accessibilityLabel: '提交订单按钮' }),

  // —— 批量生成：type × 状态 = 9 组 ——
  ...matrix<QButtonProps>({ text: '提交' }, [
    {
      primary: { type: 'primary' },
      secondary: { type: 'secondary' },
      tertiary: { type: 'tertiary' },
    },
    { 默认: {}, 禁用: { disabled: true }, 加载中: { loading: true } },
  ]),
];
