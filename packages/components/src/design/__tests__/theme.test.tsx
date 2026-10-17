import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { QButton } from '@/button';
import {
  DEFAULT_THEME_NAME,
  QThemeProvider,
  defaultTheme,
  getTheme,
  primitive,
  resolveTheme,
  useQTheme,
  useTheme,
  useThemeConfig,
  withOverrides,
} from '@/design';

/** 读主题的探针。 */
function ThemeProbe() {
  const { theme } = useQTheme();
  return (
    <>
      <Text testID="name">{theme.themeName}</Text>
      <Text testID="brand">{theme.semantic.color.brand.primary}</Text>
      <Text testID="onBrand">{theme.semantic.color.brand.onPrimary}</Text>
    </>
  );
}

/** 切换器。 */
function SwitchToBlue() {
  const { setTheme } = useQTheme();
  return (
    <Pressable testID="switch" onPress={() => setTheme('blue')}>
      <Text>换蓝</Text>
    </Pressable>
  );
}

/** 覆盖器：把品牌主色**按值**改成红色。 */
function OverrideToRed() {
  const { setOverrides } = useQTheme();
  return (
    <Pressable testID="override" onPress={() => setOverrides({ 'color.brand.primary': '#EF4444' })}>
      <Text>覆盖</Text>
    </Pressable>
  );
}

function ThemeReader() {
  const theme = useTheme();
  return <Text testID="reader">{theme.semantic.color.brand.primary}</Text>;
}

describe('主题：运行时切换', () => {
  it('没有 Provider 时兜底默认主题（黄），不报错', () => {
    const { getByTestId } = render(<ThemeProbe />);

    expect(getByTestId('name').props.children).toBe('yellow');
    expect(getByTestId('brand').props.children).toBe(primitive.color.yellow[500]);
  });

  it('Provider 传主题名：按该色相解析', () => {
    const { getByTestId } = render(
      <QThemeProvider theme="blue">
        <ThemeProbe />
      </QThemeProvider>,
    );

    expect(getByTestId('name').props.children).toBe('blue');
    expect(getByTestId('brand').props.children).toBe(primitive.color.blue[500]);
    expect(getByTestId('onBrand').props.children).toBe(primitive.color.white);
  });

  it('setTheme() 切换后，所有读主题的地方一起变', () => {
    const { getByTestId } = render(
      <QThemeProvider theme="yellow">
        <ThemeProbe />
        <ThemeReader />
        <SwitchToBlue />
      </QThemeProvider>,
    );

    expect(getByTestId('brand').props.children).toBe(primitive.color.yellow[500]);
    fireEvent.press(getByTestId('switch'));

    expect(getByTestId('name').props.children).toBe('blue');
    expect(getByTestId('brand').props.children).toBe(primitive.color.blue[500]);
    expect(getByTestId('reader').props.children).toBe(primitive.color.blue[500]);
  });

  it('组件本身即时跟着换色：QButton 底色', () => {
    const { getByTestId } = render(
      <QThemeProvider theme="yellow">
        <QButton testID="btn" text="提交" />
        <SwitchToBlue />
      </QThemeProvider>,
    );

    const before = StyleSheet.flatten(getByTestId('btn').props.style);
    expect(before.backgroundColor).toBe(primitive.color.yellow[500]);

    fireEvent.press(getByTestId('switch'));

    const after = StyleSheet.flatten(getByTestId('btn').props.style);
    expect(after.backgroundColor).toBe(primitive.color.blue[500]);
  });

  it('setTheme() 之后父组件重渲染（prop 不变）不会把主题重置回去', () => {
    function Wrapper() {
      // 父组件自己 re-render 一次，Provider 的 theme prop 仍是 'yellow'
      const [tick, setTick] = useState(0);
      return (
        <QThemeProvider theme="yellow">
          <ThemeProbe />
          <SwitchToBlue />
          <Pressable testID="rerender" onPress={() => setTick((value) => value + 1)}>
            <Text>{tick}</Text>
          </Pressable>
        </QThemeProvider>
      );
    }

    const { getByTestId } = render(<Wrapper />);
    fireEvent.press(getByTestId('switch'));
    expect(getByTestId('brand').props.children).toBe(primitive.color.blue[500]);

    fireEvent.press(getByTestId('rerender'));
    expect(getByTestId('brand').props.children).toBe(primitive.color.blue[500]);
  });

  it('外部 theme prop 变化时，本地 setTheme 的覆盖自动失效', () => {
    function Wrapper() {
      const [name, setName] = useState<'yellow' | 'green'>('yellow');
      return (
        <>
          <QThemeProvider theme={name}>
            <ThemeProbe />
            <SwitchToBlue />
          </QThemeProvider>
          <Pressable testID="prop-green" onPress={() => setName('green')}>
            <Text>green</Text>
          </Pressable>
        </>
      );
    }

    const { getByTestId } = render(<Wrapper />);
    fireEvent.press(getByTestId('switch'));
    expect(getByTestId('name').props.children).toBe('blue');

    // 父组件改 prop → 本地覆盖失效，回到 prop 指定的主题
    fireEvent.press(getByTestId('prop-green'));
    expect(getByTestId('name').props.children).toBe('green');
    expect(getByTestId('brand').props.children).toBe(primitive.color.green[500]);
  });
});

describe('主题：按值覆盖语义层', () => {
  it('Provider 的 overrides 生效（值覆盖默认值）', () => {
    const { getByTestId } = render(
      <QThemeProvider theme="yellow" overrides={{ 'color.brand.primary': '#EF4444' }}>
        <ThemeProbe />
      </QThemeProvider>,
    );

    expect(getByTestId('brand').props.children).toBe('#EF4444');
    // 主题名不变，只是把某一条语义值换掉了
    expect(getByTestId('name').props.children).toBe('yellow');
  });

  it('setOverrides() 运行时覆盖，且能覆盖成原子层路径', () => {
    const { getByTestId } = render(
      <QThemeProvider theme="yellow">
        <ThemeProbe />
        <OverrideToRed />
      </QThemeProvider>,
    );

    fireEvent.press(getByTestId('override'));
    expect(getByTestId('brand').props.children).toBe('#EF4444');

    // 覆盖成「路径」也支持：仍是运行时解析
    const viaPath = withOverrides(getTheme('yellow'), {
      'color.brand.primary': 'primitive.color.teal.500',
    });
    expect(viaPath.semantic.color.brand.primary).toBe(primitive.color.teal[500]);
  });

  it('覆盖文字色时，引用它的字体颜色跟着变（语义 → 语义 → 原子）', () => {
    const theme = withOverrides(getTheme('yellow'), {
      'color.text.primary': 'primitive.color.red.600',
    });

    expect(theme.semantic.color.text.primary).toBe(primitive.color.red[600]);
    expect(theme.semantic.font.sys.body.m.color).toBe(primitive.color.red[600]);
  });
});

describe('主题：按值覆盖组件层', () => {
  it('`components.` 前缀的覆盖只动组件 token，语义层不受影响', () => {
    const base = getTheme('yellow');
    const theme = withOverrides(base, { 'components.button.height.6': 60 });

    expect(theme.components.button.height[6]).toBe(60);
    expect(theme.components.button.height[1]).toBe(28); // 其它档位不动
    expect(theme.semantic.color.brand.primary).toBe(base.semantic.color.brand.primary);
  });

  it('组件 token 的覆盖值可以是原子层 / 语义层路径，也可以是具体值', () => {
    const theme = withOverrides(getTheme('yellow'), {
      'components.icon.color': 'semantic.color.brand.primary',
      'components.button.paddingHorizontal.1': 20,
      // 排版也可以直接指向语义层 font token（解析后是整份文字样式）
      'components.button.font.6': 'semantic.font.sys.label.s',
    });

    expect(theme.components.icon.color).toBe(theme.semantic.color.brand.primary);
    expect(theme.components.button.paddingHorizontal[1]).toBe(20);
    expect(theme.components.button.font[6]).toEqual(theme.semantic.font.sys.label.s);
  });

  it('Provider 覆盖组件 token 后，组件实际渲染跟着变', () => {
    const { getByTestId } = render(
      <QThemeProvider theme="yellow" overrides={{ 'components.button.height.6': 60 }}>
        <QButton testID="btn" text="提交" />
      </QThemeProvider>,
    );

    const style = StyleSheet.flatten(getByTestId('btn').props.style);
    expect(style.height).toBe(60);
    // 圆角仍是高度的一半（半圆端）
    expect(style.borderRadius).toBe(30);
  });

  it('useThemeConfig 的第三个参数同样支持组件层覆盖', () => {
    function HeightProbe() {
      const { tokens } = useThemeConfig(undefined, 'button', {
        'components.button.height.1': 40,
      });
      return <Text testID="height">{String(tokens.height[1])}</Text>;
    }

    const { getByTestId } = render(<HeightProbe />);
    expect(getByTestId('height').props.children).toBe('40');
  });
});

describe('useThemeConfig：全局 token + 组件 token', () => {
  /** 三参数形式：主题 + 组件名（+ 覆盖） */
  function ConfigProbe({
    themeOverride,
    overrides,
  }: {
    themeOverride?: Parameters<typeof resolveTheme>[0];
    overrides?: Record<string, string | number>;
  }) {
    // hook 不能条件调用：这里固定用三参数形式（`theme` 为 undefined 时跟随 Context）
    const result = useThemeConfig(themeOverride, 'button', overrides);
    return (
      <>
        <Text testID="brand">{result.global.color.brand.primary}</Text>
        <Text testID="height">{String(result.tokens.height[6])}</Text>
        <Text testID="padding">{String(result.tokens.paddingHorizontal[1])}</Text>
      </>
    );
  }

  /** 单参数形式：只传组件名（跟随 Context） */
  function SimpleConfigProbe() {
    const result = useThemeConfig('icon');
    return <Text testID="icon-size">{String(result.tokens.size)}</Text>;
  }

  it('只传组件名：跟随当前主题，返回全局 + 组件 token', () => {
    const { getByTestId } = render(
      <QThemeProvider theme="blue">
        <SimpleConfigProbe />
      </QThemeProvider>,
    );

    expect(getByTestId('icon-size').props.children).toBe('20');
  });

  it('三参数形式：主题传 undefined 时跟随 Context，并返回该组件 token', () => {
    const { getByTestId } = render(
      <QThemeProvider theme="blue">
        <ConfigProbe />
      </QThemeProvider>,
    );

    expect(getByTestId('brand').props.children).toBe(primitive.color.blue[500]);
    expect(getByTestId('height').props.children).toBe('48');
    expect(getByTestId('padding').props.children).toBe(
      String(getTheme('blue').components.button.paddingHorizontal[1]),
    );
  });

  it('传主题：优先于 Context', () => {
    const { getByTestId } = render(
      <QThemeProvider theme="blue">
        <ConfigProbe themeOverride="orange" />
      </QThemeProvider>,
    );

    expect(getByTestId('brand').props.children).toBe(primitive.color.orange[500]);
  });

  it('第三个参数：运行时按值覆盖，只影响这一处', () => {
    const { getByTestId } = render(
      <QThemeProvider theme="blue">
        <ConfigProbe themeOverride="yellow" overrides={{ 'color.brand.primary': '#123456' }} />
      </QThemeProvider>,
    );

    expect(getByTestId('brand').props.children).toBe('#123456');
    // 几何 token 不受颜色覆盖影响
    expect(getByTestId('padding').props.children).toBe(
      String(getTheme('yellow').components.button.paddingHorizontal[1]),
    );
  });
});

describe('CommonProps.theme：单个组件局部覆盖主题', () => {
  it('QButton 传 theme 时不受外层 Provider 影响', () => {
    const { getByTestId } = render(
      <QThemeProvider theme="blue">
        <QButton testID="btn" text="提交" theme={getTheme('red')} />
      </QThemeProvider>,
    );

    const style = StyleSheet.flatten(getByTestId('btn').props.style);
    expect(style.backgroundColor).toBe(primitive.color.red[500]);
  });

  it('不传 theme 时继续跟随 Provider', () => {
    const { getByTestId } = render(
      <QThemeProvider theme="blue">
        <QButton testID="btn" text="提交" />
      </QThemeProvider>,
    );

    const style = StyleSheet.flatten(getByTestId('btn').props.style);
    expect(style.backgroundColor).toBe(primitive.color.blue[500]);
  });
});

describe('主题：引用稳定（缓存的前提）', () => {
  it('同一个主题名永远返回同一个对象', () => {
    expect(getTheme('blue')).toBe(getTheme('blue'));
    expect(getTheme('blue')).not.toBe(getTheme('red'));
  });

  it('默认主题是「黄」', () => {
    expect(DEFAULT_THEME_NAME).toBe('yellow');
    expect(defaultTheme).toBe(getTheme('yellow'));
  });

  it('resolveTheme：不传 / 传名 / 传对象', () => {
    expect(resolveTheme()).toBe(defaultTheme);
    expect(resolveTheme('red')).toBe(getTheme('red'));

    const custom = getTheme('pink');
    expect(resolveTheme(custom)).toBe(custom);
  });

  it('主题不携带原子层；语义层按主题解析', () => {
    const yellow = getTheme('yellow');
    const blue = getTheme('blue');

    // 原子层是静态共享的，不属于任何主题
    expect('primitive' in yellow).toBe(false);
    expect(yellow.semantic.color.brand.primary).not.toBe(blue.semantic.color.brand.primary);
    // 图标默认色是主文字色，与品牌色无关
    expect(yellow.components.icon.color).toBe(blue.components.icon.color);
  });

  it('未覆盖的主题在页面内共享同一份引用（含 semantic / components）', () => {
    const seen: unknown[] = [];

    function RefProbe() {
      const { theme, global, tokens } = useThemeConfig(undefined, 'button');
      useEffect(() => {
        seen.push(theme, global, tokens);
      });
      return null;
    }

    render(
      <>
        <RefProbe />
        <RefProbe />
      </>,
    );

    const [themeA, globalA, tokensA, themeB, globalB, tokensB] = seen;
    expect(themeA).toBe(themeB);
    expect(themeA).toBe(defaultTheme);
    expect(globalA).toBe(globalB);
    expect(tokensA).toBe(tokensB);
    // 组件 token 就是主题里那一份，没有再拷贝
    expect(tokensA).toBe(defaultTheme.components.button);
  });
});
