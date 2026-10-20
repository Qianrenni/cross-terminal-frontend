import React from 'react';
import { StyleSheet, Text, type ViewStyle } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { act, fireEvent, render } from '@testing-library/react-native';
import {
  DEFAULT_THEME_NAME,
  QBottomTab,
  getTheme,
  type QBottomTabItem,
  type QBottomTabProps,
} from '@cross-terminal/components';

/** 默认主题（黄）——无 `QThemeProvider` 时组件读到的就是它。 */
const theme = getTheme(DEFAULT_THEME_NAME);
const tokens = theme.components.bottomTab;

const TABS: QBottomTabItem[] = [
  { key: 'home', label: '首页', icon: 'circle', activeIcon: 'circle-outline' },
  { key: 'shelf', label: '书架', icon: 'star', activeIcon: 'star-outline' },
  { key: 'me', label: '我的', icon: 'square', activeIcon: 'square-outline' },
];

/** 取出某个（或第一个）标签项的文字节点。 */
function textsOf(props: QBottomTabProps) {
  const { UNSAFE_getAllByType } = render(<QBottomTab {...props} />);
  return UNSAFE_getAllByType(Text);
}

describe('QBottomTab 交互', () => {
  it('渲染出全部标签文字', () => {
    expect(textsOf({ items: TABS }).map((node) => node.props.children)).toEqual([
      '首页',
      '书架',
      '我的',
    ]);
  });

  it('每项都同时渲染两个图标（选中态 + 未选中态）', () => {
    const { UNSAFE_getAllByType } = render(<QBottomTab items={TABS} />);

    // 3 项 × 2 个图标
    expect(UNSAFE_getAllByType(Svg)).toHaveLength(TABS.length * 2);
  });

  it('整条高 46，图标 24×24（8 + 24 + 14 的布局）', () => {
    const { UNSAFE_getAllByType, toJSON } = render(<QBottomTab testID="tab" items={TABS} />);

    const tree = toJSON() as { props: { style: ViewStyle } };
    const container = StyleSheet.flatten(tree.props.style) as Record<string, unknown>;
    expect(container.height).toBe(46);

    UNSAFE_getAllByType(Svg).forEach((svg) => {
      expect(svg.props.width).toBe(tokens.iconSize);
      expect(svg.props.height).toBe(tokens.iconSize);
    });
  });

  it('文字是 10/14，并且绝对定位贴底', () => {
    const label = StyleSheet.flatten(textsOf({ items: TABS })[0].props.style) as Record<
      string,
      unknown
    >;

    expect(label.fontSize).toBe(10);
    expect(label.lineHeight).toBe(14);
    expect(label.bottom).toBe(0);
    expect(label.left).toBe(0);
    expect(label.right).toBe(0);
    expect(label.position).toBe('absolute');
    // 文字区高度 = 行高，撑满 46 的最后一格
    expect(label.height).toBe(14);
  });

  it('选中项文字用品牌色，未选中用次要文字色', () => {
    const texts = textsOf({ items: TABS, defaultValue: 'shelf' });

    const colorOf = (index: number) =>
      (StyleSheet.flatten(texts[index].props.style) as Record<string, unknown>).color;

    expect(colorOf(1)).toBe(tokens.colorActive);
    expect(colorOf(0)).toBe(tokens.colorInactive);
    expect(colorOf(2)).toBe(tokens.colorInactive);
  });

  it('图标也用对应态的颜色（选中品牌色 / 未选中次要色）', () => {
    const { UNSAFE_getAllByType } = render(<QBottomTab items={TABS} defaultValue="home" />);

    const svgOf = (name: string) =>
      UNSAFE_getAllByType(Svg).find((svg) => svg.props.accessibilityLabel === name)!;
    /** 描边图标取 stroke、实心图标取 fill —— 两种形状都要覆盖到 */
    const paintOf = (name: string) => {
      const path = svgOf(name).findAllByType(Path)[0];
      return path.props.stroke ?? path.props.fill;
    };

    // home 选中：circle-outline 是选中态图标 → 品牌色；circle 是未选中态 → 次要色
    expect(paintOf('circle-outline')).toBe(tokens.colorActive);
    expect(paintOf('circle')).toBe(tokens.colorInactive);
  });

  it('非受控：点击切换选中项并回调 onChange', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<QBottomTab items={TABS} onChange={onChange} />);

    act(() => {
      fireEvent.press(getByTestId('me'));
    });

    expect(onChange).toHaveBeenCalledWith('me');
    expect(getByTestId('me').props.accessibilityState).toEqual({ selected: true });
    expect(getByTestId('home').props.accessibilityState).toEqual({ selected: false });
  });

  it('受控：点击只回调，选中态由 value 决定', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<QBottomTab items={TABS} value="home" onChange={onChange} />);

    act(() => {
      fireEvent.press(getByTestId('shelf'));
    });

    expect(onChange).toHaveBeenCalledWith('shelf');
    // value 没变 → 仍然是 home 选中
    expect(getByTestId('home').props.accessibilityState).toEqual({ selected: true });
    expect(getByTestId('shelf').props.accessibilityState).toEqual({ selected: false });
  });

  it('无障碍：每项 role=tab，容器 role=tablist', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(<QBottomTab testID="tab" items={TABS} />);

    expect(getByTestId('tab').props.accessibilityRole).toBe('tablist');
    expect(getByTestId('home').props.accessibilityRole).toBe('tab');
    expect(UNSAFE_getAllByType(Text)).toHaveLength(TABS.length);
  });
});

describe('QBottomTab 选中动画', () => {
  it('膨大段到 popScale，之后串行回弹到 1', () => {
    // 峰值必须大于 1 才有「弹」的效果
    expect(tokens.popScale).toBeGreaterThan(1);
    // 回弹是独立的一段，长度固定 50ms
    expect(tokens.bounceDuration).toBe(50);
  });

  it('回弹段远短于膨大段（串行，不共用时间轴）', () => {
    expect(tokens.bounceDuration).toBeLessThan(tokens.durationIn);
  });

  it('进场总时长（膨大 + 回弹）不短于出场', () => {
    expect(tokens.durationIn + tokens.bounceDuration).toBeGreaterThanOrEqual(tokens.durationOut);
  });
});
