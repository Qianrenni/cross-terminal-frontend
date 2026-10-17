/**
 * Jest 全局准备。
 *
 * 把窗口宽度固定成**设计基准 375**：`useLargeScreenScale()` 返回 1，
 * 这样组件单测与快照断言的都是**未缩放**的几何（大屏规则本身由
 * `src/utils/__tests__/large-screen.test.ts` 覆盖）。
 *
 * 需要验证缩放时，用例里自己 `Dimensions.set(...)`，并在 `afterEach` 还原。
 */
import { Dimensions } from 'react-native';

Dimensions.set({
  window: { width: 375, height: 667, scale: 2, fontScale: 2 },
  screen: { width: 375, height: 667, scale: 2, fontScale: 2 },
});
