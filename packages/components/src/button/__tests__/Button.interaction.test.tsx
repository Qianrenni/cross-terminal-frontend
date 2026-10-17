import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { QButton } from '@/button';
import type { QButtonProps } from '@/button';
import * as buttonStyleModule from '@/button/style';
import { getTheme, DEFAULT_THEME_NAME, withAlpha } from '@/design';

/** 默认主题（黄）——无 `QThemeProvider` 时组件读到的就是它。 */
const theme = getTheme(DEFAULT_THEME_NAME);
const qButtonTokens = theme.components.button;

/** `toJSON()` 出来的 host 树节点（只含真正渲染出来的原生节点）。 */
interface HostNode {
  type: string;
  props: Record<string, unknown>;
  children: (HostNode | string)[] | null;
}

/**
 * 找出渲染结果里所有**绝对定位**的节点（按钮里只有描边线框是绝对定位的）。
 *
 * 走 `toJSON()`（host 树）而不是 `UNSAFE_getAllByType(View)`：后者会把复合组件层一起算进来，
 * 层级关系跟肉眼看到的树对不上，结构断言容易踩坑。
 */
function absoluteStylesOf(result: ReturnType<typeof render>): ViewStyle[] {
  const found: ViewStyle[] = [];
  const tree = result.toJSON();
  const walk = (node: HostNode | string | null): void => {
    if (node == null || typeof node === 'string') return;
    const style = StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>);
    if (style?.position === 'absolute') found.push(style);
    node.children?.forEach(walk);
  };
  (Array.isArray(tree) ? tree : [tree]).forEach(walk);
  return found;
}

/**
 * 交互测试：只断言行为与语义，不断言渲染结构（结构交给快照测试）。
 */
describe('QButton 交互', () => {
  it('渲染主文案 / 后缀文案 / 副文案 / 副后缀文案', () => {
    const { getByText } = render(
      <QButton text="提交订单" suffixText="去支付" subText="¥128.00" subSuffixText="限时" />,
    );

    expect(getByText('提交订单')).toBeTruthy();
    expect(getByText('去支付')).toBeTruthy();
    expect(getByText('¥128.00')).toBeTruthy();
    expect(getByText('限时')).toBeTruthy();
  });

  it('点击时触发 onPress', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<QButton testID="btn" text="提交" onPress={onPress} />);

    fireEvent.press(getByTestId('btn'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled 时不触发 onPress，并暴露 disabled 无障碍状态', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<QButton testID="btn" text="提交" disabled onPress={onPress} />);
    const button = getByTestId('btn');

    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: false });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('loading 时展示加载指示器并禁用点击', () => {
    const onPress = jest.fn();
    const { getByTestId, UNSAFE_getByType } = render(
      <QButton testID="btn" text="提交" loading onPress={onPress} />,
    );
    const button = getByTestId('btn');

    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('无障碍角色为 button；未传 accessibilityLabel 时回退到 text', () => {
    const { getByTestId } = render(<QButton testID="btn" text="提交" />);
    const button = getByTestId('btn');

    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('提交');
  });

  it('显式传入 accessibilityLabel 时优先生效', () => {
    const { getByTestId } = render(
      <QButton testID="btn" text="提交" accessibilityLabel="提交订单按钮" />,
    );

    expect(getByTestId('btn').props.accessibilityLabel).toBe('提交订单按钮');
  });

  it('level 影响强调强度：等级越高背景越不透明', () => {
    const low = StyleSheet.flatten(
      render(<QButton testID="low" text="A" level={1} />).getByTestId('low').props.style,
    );
    const high = StyleSheet.flatten(
      render(<QButton testID="high" text="A" level={6} />).getByTestId('high').props.style,
    );

    expect(low.backgroundColor).toBe(withAlpha(theme.semantic.color.brand.primary, 0.55));
    expect(high.backgroundColor).toBe(withAlpha(theme.semantic.color.brand.primary, 1));
  });

  it('level 决定左右内边距：等级越高越宽', () => {
    const low = StyleSheet.flatten(
      render(<QButton testID="low" text="A" level={1} />).getByTestId('low').props.style,
    );
    const high = StyleSheet.flatten(
      render(<QButton testID="high" text="A" level={6} />).getByTestId('high').props.style,
    );

    expect(low.paddingHorizontal).toBe(6);
    expect(high.paddingHorizontal).toBe(16);
    expect(low.paddingHorizontal as number).toBeLessThan(high.paddingHorizontal as number);
  });

  it('高度与左右内边距都按 level 分档，圆角永远是高度的一半（半圆端）', () => {
    const style = StyleSheet.flatten(
      render(<QButton testID="b" text="A" />).getByTestId('b').props.style,
    );
    const height = qButtonTokens.height[6];

    expect(style.height).toBe(height);
    expect(style.borderRadius).toBe(height / 2);
    // 别用「超大值假装胶囊」——超过高度一半会被按宽高分别裁剪成椭圆
    expect(style.borderRadius).not.toBe(theme.primitive.radius.full);
  });

  it('type 决定填充方式：primary 实心无线框，secondary / tertiary 各有一个绝对定位线框', () => {
    const renderType = (type: 'primary' | 'secondary' | 'tertiary') => {
      const result = render(<QButton testID="btn" text="A" type={type} />);
      const container = StyleSheet.flatten(result.getByTestId('btn').props.style);
      // 线框是容器里唯一一个绝对定位的节点
      const frames = absoluteStylesOf(result);

      return { container, frames };
    };

    const primary = renderType('primary');
    const secondary = renderType('secondary');
    const tertiary = renderType('tertiary');

    // 容器上不再画边框 —— 边框会吃掉内容盒，改由绝对定位的线框负责
    expect(primary.container.borderWidth).toBeUndefined();
    expect(primary.frames).toHaveLength(0);

    expect(secondary.frames).toHaveLength(1);
    expect(tertiary.frames).toHaveLength(1);

    const secondaryFrame = secondary.frames[0];
    const tertiaryFrame = tertiary.frames[0];

    expect(secondaryFrame.borderWidth).toBe(theme.primitive.stroke.thin);
    expect(secondaryFrame.borderRadius).toBe(qButtonTokens.height[6] / 2);

    // 两种形态都有线框，只是颜色不同
    expect(secondaryFrame.borderColor).toBe(withAlpha(theme.semantic.color.brand.primary, 1));
    expect(tertiaryFrame.borderColor).toBe(theme.semantic.color.stroke.default);
    expect(secondaryFrame.borderColor).not.toBe(tertiaryFrame.borderColor);

    // tertiary 仍是透明底
    expect(tertiary.container.backgroundColor).toBe('transparent');
  });

  it('文字色由变体决定，覆盖排版 token 自带的 color', () => {
    // 排版 token（font.sys.label.m）自带 color=主文字色。
    // 若渲染时不再用变体色覆盖，主按钮上会变成跟底同色的文字 → 这里锁死。
    const primary = StyleSheet.flatten(
      render(<QButton text="提交" type="primary" />).getByText('提交').props.style,
    );
    const secondary = StyleSheet.flatten(
      render(<QButton text="提交" type="secondary" />).getByText('提交').props.style,
    );

    // 默认主题是黄：黄底用深色字，不用白字（白字在黄底上根本看不清）
    expect(primary.color).toBe(theme.semantic.color.brand.onPrimary);
    expect(secondary.color).toBe(theme.semantic.color.brand.primary);
  });

  it('QButton 是 memo 组件', () => {
    // ⚠️ 这是**契约断言**，不是行为断言，原因记录在此：
    // 试过用 <React.Profiler> 数重渲染次数来测行为 —— 测不准。
    // Profiler 在父组件 commit 时也会回调，即使子树被 memo 挡下，
    // 结果就是「memo 没生效」和「memo 生效」分不出来（实测得到 false positive）。
    // 而渲染次数是组件内部的副作用，外部拿不到，所以只能锁住 memo 包裹这一事实。
    expect((QButton as unknown as { $$typeof?: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });

  it('useMemo：只有影响样式的入参变化才重算，且 memo 不会挡住该有的更新', () => {
    const spy = jest.spyOn(buttonStyleModule, 'buttonVariantStyle');

    function Wrapper() {
      const [text, setText] = useState('A');
      const [level, setLevel] = useState<NonNullable<QButtonProps['level']>>(3);
      return (
        <>
          <QButton testID="btn" text={text} level={level} />
          <Pressable testID="change-text" onPress={() => setText((t) => (t === 'A' ? 'B' : 'A'))}>
            <Text>text</Text>
          </Pressable>
          <Pressable testID="change-level" onPress={() => setLevel((l) => (l === 3 ? 4 : 3))}>
            <Text>level</Text>
          </Pressable>
        </>
      );
    }

    const { getByTestId, getByText } = render(<Wrapper />);
    const initial = spy.mock.calls.length;
    expect(initial).toBeGreaterThan(0);

    // 1) 只改 text：先证明组件**确实重渲染了**（B 出现），否则下面的断言就是假绿
    fireEvent.press(getByTestId('change-text'));
    expect(getByText('B')).toBeTruthy();
    // text 不影响样式 → 变体样式不应重算
    expect(spy.mock.calls.length).toBe(initial);

    // 2) 改 level：影响样式 → 必须重算，且渲染结果要真的跟着变（memo 不能把更新挡住）
    fireEvent.press(getByTestId('change-level'));
    expect(spy.mock.calls.length).toBe(initial + 1);
    expect(StyleSheet.flatten(getByTestId('btn').props.style).paddingHorizontal).toBe(12);

    spy.mockRestore();
  });
});
