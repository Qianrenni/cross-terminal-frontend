import { ICON_PATHS } from '@/icon';
import type { IconName, QIconProps } from '@/icon/type';
import { matrix, testCase, type Case } from '@/testUtils/case';

/**
 * QIcon 的快照用例（**只存数据**，渲染与断言交给 `Icon.snapshot.test.tsx`）。
 *
 * 本文件是 `.ts` 而非 `.tsx`，因此不能写 JSX —— QIcon 本身也不需要节点 prop。
 */

/** 全部图标名。从图标表推导，**新增图标会自动进快照**，本文件不用改。 */
const ALL_ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];

/** 全部用例。 */
export const iconCases: Case<QIconProps>[] = [
  // —— 兜底：不传 size / color，走组件 token 默认值 ——
  testCase('默认尺寸与颜色', { name: 'caret-right' }),

  // —— 每个图标各出一张，保证整张路径表被锁定 ——
  ...ALL_ICON_NAMES.map((name) => testCase(`图标/${name}`, { name })),

  // —— 尺寸 × 颜色 = 3 × 3 ——
  ...matrix<QIconProps>({ name: 'close' }, [
    { 小: { size: 12 }, 中: { size: 20 }, 大: { size: 48 } },
    { 默认色: {}, 品牌色: { color: '#2563EB' }, 白色: { color: '#FFFFFF' } },
  ]),

  // —— 描边粗细 ——
  // close 是普通描边图标（自带 regular），用来锁 thin / bold 两档 token 的实际数值；
  // chevron-left 自带 thin，用来锁「prop 覆盖图标自带」的优先级。
  testCase('粗细/细 thin', { name: 'close', weight: 'thin' }),
  testCase('粗细/粗 bold', { name: 'close', weight: 'bold' }),
  testCase('粗细/图标自带 thin', { name: 'chevron-left' }),
  testCase('粗细/prop 覆盖图标自带', { name: 'chevron-left', weight: 'bold' }),
];
