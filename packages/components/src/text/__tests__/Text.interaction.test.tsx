import React, { type ReactElement } from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { DEFAULT_THEME_NAME, getTheme } from '@/design';
import { QText } from '@/text';
import type { TypographyPath } from '@/text/type';
import { QLargeScreenProvider } from '@/utils';

/** 大屏换算的测试窗口（基准 / 桌面） */
const BASE_WINDOW = { width: 375, height: 667, scale: 2, fontScale: 2 };
const WIDE_WINDOW = { width: 1024, height: 768, scale: 2, fontScale: 2 };

/** 默认主题（黄）——无 `QThemeProvider` 时组件读到的就是它。 */
const theme = getTheme(DEFAULT_THEME_NAME);
/** 语义层字体树：QText 没有组件 token，排版全从这里来 */
const sysFont = theme.semantic.font.sys;

/** 渲染并取出 `Text` 的**最终样式**（`style` 是数组，拍平后断言数值）。 */
function styleOf(element: ReactElement): Record<string, unknown> {
  const { UNSAFE_getByType } = render(element);
  return StyleSheet.flatten(UNSAFE_getByType(Text).props.style) as Record<string, unknown>;
}

describe('QText 交互', () => {
  it('typography 路径解析成对应的语义层档位', () => {
    expect(styleOf(<QText text="正文" typography="font.sys.body.m" />)).toMatchObject({
      fontSize: sysFont.body.m.fontSize,
      lineHeight: sysFont.body.m.lineHeight,
      fontWeight: sysFont.body.m.fontWeight,
      letterSpacing: sysFont.body.m.letterSpacing,
      fontFamily: sysFont.body.m.fontFamily,
    });
  });

  it('不同档位真的不一样（防止 typography 没接上）', () => {
    const body = styleOf(<QText text="正文" typography="font.sys.body.m" />);
    const display = styleOf(<QText text="大标题" typography="font.sys.display.s" />);

    expect(display.fontSize).toBeGreaterThan(body.fontSize as number);
    expect(display.fontWeight).not.toBe(body.fontWeight);
  });

  it('caption 系自带次要色，color 可以覆盖', () => {
    const caption = styleOf(<QText text="辅助说明" typography="font.sys.caption.s" />);

    expect(caption.color).toBe(sysFont.caption.s.color);
    // 对照组：正文是主文字色，两者必须不同，否则说明颜色根本没跟着排版走
    expect(caption.color).not.toBe(sysFont.body.m.color);

    const overridden = styleOf(
      <QText text="辅助说明" typography="font.sys.caption.s" color="#FF0000" />,
    );
    expect(overridden.color).toBe('#FF0000');
  });

  it('数字族会带上自己的字体栈', () => {
    const number = styleOf(<QText text="1,280" typography="font.number.5xl" />);

    expect(number.fontSize).toBe(theme.semantic.font.number['5xl'].fontSize);
    expect(number.fontFamily).toBe(theme.semantic.font.number['5xl'].fontFamily);
  });

  it('typography 传了不存在的路径时回落到正文档位（不渲染空文本）', () => {
    const fallback = styleOf(<QText text="x" typography={'font.sys.nope' as TypographyPath} />);

    expect(fallback.fontSize).toBe(sysFont.body.m.fontSize);
  });

  it('style 覆盖排版 token 的同名属性', () => {
    const merged = styleOf(
      <QText text="x" typography="font.sys.body.m" style={{ fontSize: 30 }} />,
    );

    expect(merged.fontSize).toBe(30);
    // 未覆盖的属性仍来自排版 token
    expect(merged.lineHeight).toBe(sysFont.body.m.lineHeight);
  });

  it('numberOfLines 透传给 Text', () => {
    const { UNSAFE_getByType } = render(
      <QText text="x" typography="font.sys.body.m" numberOfLines={2} />,
    );

    expect(UNSAFE_getByType(Text).props.numberOfLines).toBe(2);
  });

  it('不传 onPress 时不可点', () => {
    const { UNSAFE_getByType } = render(<QText text="不可点" typography="font.sys.body.m" />);

    expect(UNSAFE_getByType(Text).props.accessibilityRole).toBeUndefined();
  });

  it('传了 onPress 时可点，无障碍角色变为 button', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <QText testID="text" text="点我" typography="font.sys.label.m" onPress={onPress} />,
    );
    const pressable = getByTestId('text');

    expect(pressable.props.accessibilityRole).toBe('button');
    fireEvent.press(pressable);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('未传 accessibilityLabel 时回退到文本内容', () => {
    const { UNSAFE_getByType } = render(<QText text="读屏内容" typography="font.sys.body.m" />);

    expect(UNSAFE_getByType(Text).props.accessibilityLabel).toBe('读屏内容');
  });

  it('显式传入 accessibilityLabel 时优先生效', () => {
    const { UNSAFE_getByType } = render(
      <QText text="1280" typography="font.number.m" accessibilityLabel="一千二百八十" />,
    );

    expect(UNSAFE_getByType(Text).props.accessibilityLabel).toBe('一千二百八十');
  });
});

describe('大屏换算', () => {
  afterEach(() => {
    act(() => Dimensions.set({ window: BASE_WINDOW, screen: BASE_WINDOW }));
  });

  it('窗口变宽时字号 / 行高跟着放大', () => {
    Dimensions.set({ window: WIDE_WINDOW, screen: WIDE_WINDOW });

    const scaled = styleOf(<QText text="正文" typography="font.sys.body.m" />);

    expect(scaled.fontSize).toBe(Math.floor(sysFont.body.m.fontSize * 1.4));
    expect(scaled.lineHeight).toBe(Math.floor(sysFont.body.m.lineHeight * 1.4));
  });

  it('QLargeScreenProvider enabled={false} 时保持 1 倍', () => {
    Dimensions.set({ window: WIDE_WINDOW, screen: WIDE_WINDOW });

    const scaled = styleOf(
      <QLargeScreenProvider enabled={false}>
        <QText text="正文" typography="font.sys.body.m" />
      </QLargeScreenProvider>,
    );

    expect(scaled.fontSize).toBe(sysFont.body.m.fontSize);
  });
});
