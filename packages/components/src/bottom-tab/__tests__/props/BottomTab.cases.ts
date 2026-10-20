import type { QBottomTabItem, QBottomTabProps } from '@/bottom-tab';
import { testCase, type Case } from '@/testUtils/case';

/**
 * QBottomTab 的快照用例（**只存数据**，渲染与断言交给 `BottomTab.snapshot.test.tsx`）。
 *
 * 标准 item = `{ key, label, icon, activeIcon }`，图标名取自 `ICON_PATHS`，
 * 所以拼错图标名会在编译期报错。
 */
const TABS: QBottomTabItem[] = [
  { key: 'home', label: '首页', icon: 'circle', activeIcon: 'circle-outline' },
  { key: 'shelf', label: '书架', icon: 'star', activeIcon: 'star-outline' },
  { key: 'me', label: '我的', icon: 'square', activeIcon: 'square-outline' },
];

export const bottomTabCases: Case<QBottomTabProps>[] = [
  // —— 兜底：不传 defaultValue，选中第一项 ——
  testCase('默认选中第一项', { items: TABS }),

  // —— 指定非首项 ——
  testCase('指定选中项', { items: TABS, defaultValue: 'shelf' }),

  // —— 单项 / 五项：锁住 flex 均分与文字截断 ——
  testCase('单项', { items: TABS.slice(0, 1) }),
  testCase('五项', {
    items: [
      ...TABS,
      { key: 'msg', label: '消息', icon: 'more', activeIcon: 'check' },
      { key: 'setting', label: '设置', icon: 'info', activeIcon: 'warning' },
    ],
  }),

  // —— 长文案（`numberOfLines={1}` + 绝对定位贴底，不能撑高） ——
  testCase('长文案', {
    items: [
      { key: 'long', label: '我的收藏夹与阅读历史', icon: 'star', activeIcon: 'star-outline' },
    ],
    defaultValue: 'long',
  }),
];
