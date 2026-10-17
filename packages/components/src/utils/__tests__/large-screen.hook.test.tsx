import React from 'react';
import { Dimensions } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { QLargeScreenProvider, useLargeScreenValue } from '@/utils';

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
