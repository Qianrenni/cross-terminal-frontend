import type { QHotzoneProps } from '@/hotzone/type';
import { testCase, type Case } from '@/testUtils/case';

/**
 * QHotzone 的快照用例（**只存数据**，渲染与断言交给 `Hotzone.snapshot.test.tsx`）。
 *
 * `children` 不是数据，快照测试统一塞一个 20×20 的固定孩子。
 */

/** 用例只关心渲染结果，不需要真的做事。 */
const noop = () => undefined;

export const hotzoneCases: Case<QHotzoneProps>[] = [
  testCase('四边外扩 12（20px 内容补到 44）', { onPress: noop, inset: 12 }),
  testCase('只外扩上下 16', { onPress: noop, inset: { top: 16, bottom: 16 } }),
  testCase('不外扩（inset=0）', { onPress: noop, inset: 0 }),
  testCase('禁用', { onPress: noop, inset: 12, disabled: true }),
  testCase('自定义无障碍标签', { onPress: noop, inset: 12, accessibilityLabel: '关闭弹窗' }),
];
