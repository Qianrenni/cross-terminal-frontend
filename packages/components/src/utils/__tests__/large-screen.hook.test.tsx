import React from 'react';
import { Dimensions } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { QLargeScreenProvider, useLargeScreenStyles, useLargeScreenValue } from '@/utils';

/** 大屏换算的测试窗口（基准 / 桌面） */
const BASE_WINDOW = { width: 375, height: 667, scale: 2, fontScale: 2 };
const WIDE_WINDOW = { width: 1024, height: 768, scale: 2, fontScale: 2 };

/** 桌面宽度的包装：`QLargeScreenProvider` 需要一个组件包 children。 */
function wrap(enabled: boolean) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QLargeScreenProvider enabled={enabled}>{children}</QLargeScreenProvider>;
  };
}

describe('useLargeScreenValue', () => {
  afterEach(() => {
    act(() => Dimensions.set({ window: BASE_WINDOW, screen: BASE_WINDOW }));
  });

  it('传入数值得到当前大屏换算后的值（>880 → 1.4，向下取整）', () => {
    Dimensions.set({ window: WIDE_WINDOW, screen: WIDE_WINDOW });

    const { result } = renderHook(() => useLargeScreenValue(20));

    expect(result.current).toBe(28);
  });

  it('0.几 换算后取整为 0 时保留原值', () => {
    Dimensions.set({ window: WIDE_WINDOW, screen: WIDE_WINDOW });

    const { result } = renderHook(() => useLargeScreenValue(0.5));

    expect(result.current).toBe(0.5);
  });

  it('QLargeScreenProvider enabled={false} 时原样返回', () => {
    Dimensions.set({ window: WIDE_WINDOW, screen: WIDE_WINDOW });

    const { result } = renderHook(() => useLargeScreenValue(20), { wrapper: wrap(false) });

    expect(result.current).toBe(20);
  });

  it('窗口变化时通过全局快照通知已挂载组件（Dimensions 只在模块级订阅一次）', () => {
    const { result } = renderHook(() => useLargeScreenValue(20));
    expect(result.current).toBe(20);

    act(() => Dimensions.set({ window: WIDE_WINDOW, screen: WIDE_WINDOW }));

    expect(result.current).toBe(28);
  });
});

describe('useLargeScreenStyles', () => {
  /** 模拟组件层按主题缓存的静态样式表（引用稳定）。 */
  const STYLES = { row: { paddingHorizontal: 16 }, text: { fontSize: 14 } };

  afterEach(() => {
    act(() => Dimensions.set({ window: BASE_WINDOW, screen: BASE_WINDOW }));
  });

  it('同一份样式表按系数全局缓存：多个组件共享同一个换算结果', () => {
    Dimensions.set({ window: WIDE_WINDOW, screen: WIDE_WINDOW });

    const first = renderHook(() => useLargeScreenStyles(STYLES));
    const second = renderHook(() => useLargeScreenStyles(STYLES));

    expect(first.result.current).toBe(second.result.current);
    expect(first.result.current.row.paddingHorizontal).toBe(22); // 16 × 1.4 → 22
  });

  it('系数为 1 时直接复用原对象（零拷贝）', () => {
    const { result } = renderHook(() => useLargeScreenStyles(STYLES));

    expect(result.current).toBe(STYLES);
  });
});
