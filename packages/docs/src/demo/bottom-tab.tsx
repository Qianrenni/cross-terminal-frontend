import { QBottomTab } from '@cross-terminal/components';
import type { QBottomTabItem, QBottomTabProps } from '@cross-terminal/components';
import type { ComponentDemo, DemoValues } from './types';

/**
 * `QBottomTab` 的配置式 Demo。
 *
 * `items` 不是标量，没法用控件拼出来 —— 固定一份数据，只用下拉切 `value`，
 * 示例代码由 `renderCode` 手写。
 */
const TABS: QBottomTabItem[] = [
  { key: 'home', label: '首页', icon: 'placeholder-line', activeIcon: 'placeholder-line' },
  { key: 'shelf', label: '书架', icon: 'placeholder-line', activeIcon: 'placeholder-line' },
  { key: 'me', label: '我的', icon: 'placeholder-line', activeIcon: 'placeholder-line' },
];

export const bottomTabDemo: ComponentDemo<QBottomTabProps> = {
  key: 'bottom-tab',
  name: 'QBottomTab',
  description:
    '底部标签栏。高 46 = 8 + 24（icon）+ 14（文字）；选中 / 未选中图标同时渲染，用 opacity + scale 交叉切换（选中后串行 50ms 回弹）。',
  Component: QBottomTab,

  controls: [
    {
      kind: 'select',
      name: 'value',
      label: 'value',
      defaultValue: 'home',
      options: TABS.map((tab) => ({ label: `${tab.label}（${tab.key}）`, value: tab.key })),
      hint: '受控选中项：改这个下拉才会真正切；点标签只回调 onChange',
    },
  ],

  toProps: (values: DemoValues) => ({
    items: TABS,
    value: String(values.value ?? 'home'),
  }),

  renderCode: (values: DemoValues) =>
    [
      '<QBottomTab',
      '  items={TABS}',
      `  value="${String(values.value ?? 'home')}"`,
      '  onChange={setTab}',
      '/>',
    ].join('\n'),
};
