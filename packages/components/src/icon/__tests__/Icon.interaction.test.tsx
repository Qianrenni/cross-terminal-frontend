import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Path, Svg } from 'react-native-svg';
import { DEFAULT_THEME_NAME, getTheme } from '@/design';
import { ICON_PATHS, QIcon } from '@/icon';
import type { IconShape } from '@/icon';
import type { IconName } from '@/icon/type';

/** 默认主题（黄）——无 `QThemeProvider` 时组件读到的就是它。 */
const qIconTokens = getTheme(DEFAULT_THEME_NAME).components.icon;

/** 取某个图标「所有」路径的 d 值（填充 + 两条描边）。 */
function pathDataSet(shape: IconShape): string[] {
  return [shape.stroke, shape.fill, shape.solidStroke].filter(
    (d): d is string => typeof d === 'string',
  );
}

/**
 * 交互测试：只断言行为与语义，不断言渲染结构（结构交给快照测试）。
 *
 * 查询用 `UNSAFE_getByType` 而不是 `testID`：图标的宿主是 `Svg` / `Pressable`，
 * 按类型取更稳，也不依赖 react-native-svg 往宿主透传 testID 的行为。
 */
/**
 * **冻结的图标名清单** —— 增删 / 改名图标时必须同步改这里。
 *
 * 为什么需要它：`ICON_PATHS` 的 key 是**手写**的（JS 标识符不能带连字符，
 * 没法从文件名自动推导出来），所以「漏加一个图标」「把 `caret-left` 敲成 `caret-lfet`」
 * 这类错误类型系统抓不到 —— 只有这份清单能抓到。它同时也是「图标集变更」的天然阻断点。
 */
const FROZEN_ICON_NAMES = [
  'caret-left',
  'caret-right',
  'caret-up',
  'caret-down',
  'chevron-left',
  'chevron-right',
  'arrow-left',
  'arrow-right',
  'arrow-up',
  'arrow-down',
  'close',
  'check',
  'info',
  'warning',
  'error',
  'plus',
  'minus',
  'more',
  'star',
  'star-outline',
  'circle',
  'circle-outline',
  'square',
  'square-outline',
  'placeholder-line',
].sort();

describe('QIcon 交互', () => {
  it('图标名与冻结清单完全一致（增删改名都必须改这里）', () => {
    expect(Object.keys(ICON_PATHS).sort()).toEqual(FROZEN_ICON_NAMES);
  });

  it('按 name 渲染出对应的矢量路径', () => {
    const { UNSAFE_getAllByType } = render(<QIcon name="caret-right" />);
    const paths = UNSAFE_getAllByType(Path);

    expect(paths).toHaveLength(1);
    expect(paths[0].props.d).toBe(ICON_PATHS['caret-right'].fill);
  });

  it('路径表里每个 name 都至少有一条非空路径，且都能渲染出来', () => {
    // 防止往 paths.ts 里加了 key 却漏了 d（空 d 渲染出来什么都没有）
    for (const [name, shape] of Object.entries(ICON_PATHS)) {
      const parts = pathDataSet(shape);
      expect(parts.length).toBeGreaterThan(0);
      for (const d of parts) expect(d.length).toBeGreaterThan(0);

      const { UNSAFE_getAllByType, unmount } = render(<QIcon name={name as IconName} />);
      expect(UNSAFE_getAllByType(Path)).toHaveLength(parts.length);
      unmount();
    }
  });

  it('填充与描边分成两条 Path，颜色都由 color 驱动', () => {
    // info = 描边的圈 + 实心的点，正好同时覆盖两类路径
    const { UNSAFE_getAllByType } = render(<QIcon name="info" color="#FF0000" />);
    const paths = UNSAFE_getAllByType(Path);

    const filled = paths.find((node) => node.props.fill === '#FF0000');
    const stroked = paths.find((node) => node.props.stroke === '#FF0000');

    expect(filled).toBeTruthy();
    expect(stroked).toBeTruthy();
    expect(stroked?.props.fill).toBe('none');
  });

  it('不传 size / color 时走组件 token 的默认值', () => {
    const { UNSAFE_getByType, UNSAFE_getAllByType } = render(<QIcon name="close" />);
    const svg = UNSAFE_getByType(Svg);

    expect(svg.props.width).toBe(qIconTokens.size);
    expect(svg.props.height).toBe(qIconTokens.size);
    expect(UNSAFE_getAllByType(Path)[0].props.stroke).toBe(qIconTokens.color);
  });

  it('显式传入 size / color 时覆盖默认值', () => {
    const { UNSAFE_getByType, UNSAFE_getAllByType } = render(
      <QIcon name="close" size={48} color="#FF0000" />,
    );

    expect(UNSAFE_getByType(Svg).props.width).toBe(48);
    expect(UNSAFE_getByType(Svg).props.height).toBe(48);
    expect(UNSAFE_getAllByType(Path)[0].props.stroke).toBe('#FF0000');
  });

  it('线宽是 viewBox 单位（不随 size 变），由 Svg 缩放到实际尺寸', () => {
    const small = render(<QIcon name="close" size={12} />);
    const large = render(<QIcon name="close" size={48} />);

    const smallPath = small.UNSAFE_getAllByType(Path)[0];
    const largePath = large.UNSAFE_getAllByType(Path)[0];

    expect(smallPath.props.strokeWidth).toBe(qIconTokens.strokeWidth.regular);
    expect(largePath.props.strokeWidth).toBe(qIconTokens.strokeWidth.regular);
  });

  it('weight 三档都能取到 token 里的数值，且三档互不相同', () => {
    for (const weight of ['thin', 'regular', 'bold'] as const) {
      const { UNSAFE_getAllByType, unmount } = render(<QIcon name="close" weight={weight} />);
      expect(UNSAFE_getAllByType(Path)[0].props.strokeWidth).toBe(qIconTokens.strokeWidth[weight]);
      unmount();
    }

    // 三档必须是三个不同的值，否则这个功能等于没接上
    const { thin, regular, bold } = qIconTokens.strokeWidth;
    expect(new Set([thin, regular, bold]).size).toBe(3);
  });

  it('不传 weight 时用图标自带的档位（chevron 系列自带 thin）', () => {
    const chevron = render(<QIcon name="chevron-left" />);
    expect(chevron.UNSAFE_getAllByType(Path)[0].props.strokeWidth).toBe(
      qIconTokens.strokeWidth.thin,
    );

    // 对照组：同样不传 weight，普通描边图标走 regular
    const close = render(<QIcon name="close" />);
    expect(close.UNSAFE_getAllByType(Path)[0].props.strokeWidth).toBe(
      qIconTokens.strokeWidth.regular,
    );
  });

  it('weight prop 优先于图标自带的档位', () => {
    const { UNSAFE_getAllByType } = render(<QIcon name="chevron-left" weight="bold" />);

    expect(UNSAFE_getAllByType(Path)[0].props.strokeWidth).toBe(qIconTokens.strokeWidth.bold);
  });

  it('viewBox 默认是 100×100 的画布', () => {
    // 内置图标当前都没有写自己的 viewBox，所以只能锁住默认值这条路径
    const { UNSAFE_getByType } = render(<QIcon name="close" />);

    expect(UNSAFE_getByType(Svg).props.viewBox).toBe('0 0 100 100');
  });

  it('dash 会透传给描边 Path，未声明 dash 的图标不带这个属性', () => {
    // placeholder-line 是唯一的虚线图标（虚线圆角矩形）
    const dashed = render(<QIcon name="placeholder-line" />);
    const dashedPath = dashed.UNSAFE_getAllByType(Path)[0];

    expect(dashedPath.props.d).toBe(ICON_PATHS['placeholder-line'].stroke);
    expect(dashedPath.props.strokeDasharray).toEqual(ICON_PATHS['placeholder-line'].dash);

    // 对照组：普通图标不能带上这个属性，否则会被当成虚线渲染
    const solid = render(<QIcon name="close" />);
    expect(solid.UNSAFE_getAllByType(Path)[0].props.strokeDasharray).toBeUndefined();
  });

  it('solidStroke 渲染成第二条描边，且永远不带虚线', () => {
    // placeholder-line = 四条直边（虚线）+ 四个角（各一整段实线圆弧）
    const { UNSAFE_getAllByType } = render(<QIcon name="placeholder-line" />);
    const paths = UNSAFE_getAllByType(Path);

    expect(paths).toHaveLength(2);

    // 第 1 条：直边，虚线
    expect(paths[0].props.d).toBe(ICON_PATHS['placeholder-line'].stroke);
    expect(paths[0].props.strokeDasharray).toEqual(ICON_PATHS['placeholder-line'].dash);

    // 第 2 条：圆角，整段实线 —— 这就是「四角各是一整段不间断的弧」的关键
    expect(paths[1].props.d).toBe(ICON_PATHS['placeholder-line'].solidStroke);
    expect(paths[1].props.strokeDasharray).toBeUndefined();
    expect(paths[1].props.fill).toBe('none');

    // 两条描边走同一套颜色与粗细，换色 / 换档位一处生效
    expect(paths[1].props.stroke).toBe(paths[0].props.stroke);
    expect(paths[1].props.strokeWidth).toBe(paths[0].props.strokeWidth);
  });

  it('不传 onPress 时不可点，无障碍角色为 image', () => {
    const { UNSAFE_getByType } = render(<QIcon name="close" />);
    const svg = UNSAFE_getByType(Svg);

    expect(svg.props.accessibilityRole).toBe('image');
    expect(svg.props.onPress).toBeUndefined();
  });

  it('传了 onPress 时可点，无障碍角色变为 button', () => {
    const onPress = jest.fn();
    // 按类型取不到 Pressable（它是 memo 包裹的复合组件），所以这里用 testID —— 与 QButton 的测试同一套写法
    const { getByTestId } = render(<QIcon testID="icon" name="close" onPress={onPress} />);
    const pressable = getByTestId('icon');

    expect(pressable.props.accessibilityRole).toBe('button');
    fireEvent.press(pressable);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('未传 accessibilityLabel 时回退到图标名', () => {
    const { UNSAFE_getByType } = render(<QIcon name="arrow-left" />);

    expect(UNSAFE_getByType(Svg).props.accessibilityLabel).toBe('arrow-left');
  });

  it('显式传入 accessibilityLabel 时优先生效', () => {
    const { UNSAFE_getByType } = render(
      <QIcon name="arrow-left" accessibilityLabel="返回上一步" />,
    );

    expect(UNSAFE_getByType(Svg).props.accessibilityLabel).toBe('返回上一步');
  });
});
