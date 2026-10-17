import {
  LARGE_SCREEN_BASE_WIDTH,
  largeScreenScale,
  scaleStyle,
  scaleStyles,
  scaleValue,
} from '@/utils/large-screen';

describe('largeScreenScale', () => {
  it('基准宽度就是 375', () => {
    expect(LARGE_SCREEN_BASE_WIDTH).toBe(375);
  });

  it('w < 375：按 w / 375 缩小', () => {
    expect(largeScreenScale(320)).toBeCloseTo(320 / 375);
    expect(largeScreenScale(374.9)).toBeCloseTo(374.9 / 375);
  });

  it('375 ≤ w < 413：不缩放', () => {
    expect(largeScreenScale(375)).toBe(1);
    expect(largeScreenScale(390)).toBe(1);
    expect(largeScreenScale(412.9)).toBe(1);
  });

  it('413 ≤ w < 440：w / 375 × 0.96', () => {
    expect(largeScreenScale(413)).toBeCloseTo((413 / 375) * 0.96);
    expect(largeScreenScale(430)).toBeCloseTo((430 / 375) * 0.96);
    expect(largeScreenScale(439.9)).toBeCloseTo((439.9 / 375) * 0.96);
  });

  it('440 ≤ w < 800：1.03', () => {
    expect(largeScreenScale(440)).toBe(1.03);
    expect(largeScreenScale(600)).toBe(1.03);
    expect(largeScreenScale(799.9)).toBe(1.03);
  });

  it('800 ≤ w ≤ 880：1.2（880 仍算这一档）', () => {
    expect(largeScreenScale(800)).toBe(1.2);
    expect(largeScreenScale(880)).toBe(1.2);
  });

  it('w > 880：1.4', () => {
    expect(largeScreenScale(880.1)).toBeCloseTo(1.4);
    expect(largeScreenScale(1024)).toBe(1.4);
    expect(largeScreenScale(2560)).toBe(1.4);
  });

  it('375 处没有跳变（前一档恰好收敛到 1）', () => {
    expect(largeScreenScale(374.999)).toBeCloseTo(0.999997, 5);
    expect(largeScreenScale(375)).toBe(1);
  });

  it('413 / 440 / 800 / 880 这几处是**规则本身**的跳变，不是实现误差', () => {
    // 把跳变固化成断言：将来有人「顺手把曲线抹平」会立刻失败
    expect(largeScreenScale(412.9)).toBe(1);
    expect(largeScreenScale(413)).toBeCloseTo(1.0573, 4);

    expect(largeScreenScale(439.9)).toBeCloseTo(1.1261, 4);
    expect(largeScreenScale(440)).toBe(1.03);

    expect(largeScreenScale(799.9)).toBe(1.03);
    expect(largeScreenScale(800)).toBe(1.2);
  });

  it('非法 / 缺失的宽度退回 1（宁可不错缩放）', () => {
    expect(largeScreenScale(0)).toBe(1);
    expect(largeScreenScale(-1)).toBe(1);
    expect(largeScreenScale(Number.NaN)).toBe(1);
    expect(largeScreenScale(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('scaleValue', () => {
  it('按系数相乘', () => {
    expect(scaleValue(16, 1.5)).toBe(24);
  });

  it('0 返回正 0', () => {
    const scaled = scaleValue(0, 1.4);
    expect(scaled).toBe(0);
    expect(Object.is(scaled, 0)).toBe(true);
  });

  it('负值照常乘（负 margin 是合法用法）', () => {
    expect(scaleValue(-8, 1.5)).toBe(-12);
  });
});

describe('scaleStyle', () => {
  const scale = 1.5;

  it('换算长度类属性', () => {
    expect(
      scaleStyle(
        {
          width: 20,
          height: 10,
          minWidth: 4,
          padding: 16,
          paddingHorizontal: 8,
          marginTop: -8,
          marginStart: 2,
          gap: 6,
          rowGap: 3,
          fontSize: 14,
          lineHeight: 20,
          letterSpacing: 0.5,
          borderRadius: 12,
          borderWidth: 1,
          borderBottomStartRadius: 4,
          elevation: 2,
          shadowRadius: 8,
          flexBasis: 100,
        },
        scale,
      ),
    ).toEqual({
      width: 30,
      height: 15,
      minWidth: 6,
      padding: 24,
      paddingHorizontal: 12,
      marginTop: -12,
      marginStart: 3,
      gap: 9,
      rowGap: 4.5,
      fontSize: 21,
      lineHeight: 30,
      letterSpacing: 0.75,
      borderRadius: 18,
      borderWidth: 1.5,
      borderBottomStartRadius: 6,
      elevation: 3,
      shadowRadius: 12,
      flexBasis: 150,
    });
  });

  it('无量纲 / 比例属性一个都不动', () => {
    expect(
      scaleStyle(
        {
          opacity: 0.5,
          flex: 1,
          flexGrow: 2,
          flexShrink: 0,
          zIndex: 10,
          aspectRatio: 1.5,
        },
        scale,
      ),
    ).toEqual({ opacity: 0.5, flex: 1, flexGrow: 2, flexShrink: 0, zIndex: 10, aspectRatio: 1.5 });
  });

  it('字符串值原样保留（百分比 / auto / 颜色）', () => {
    expect(
      scaleStyle({ width: '50%', marginLeft: 'auto', backgroundColor: '#FF0000' }, scale),
    ).toEqual({ width: '50%', marginLeft: 'auto', backgroundColor: '#FF0000' });
  });

  it('shadowOffset / textShadowOffset 里的宽高分别换算', () => {
    expect(
      scaleStyle(
        {
          shadowOffset: { width: 2, height: 4 },
          textShadowOffset: { width: 1, height: 1 },
        },
        scale,
      ),
    ).toEqual({
      shadowOffset: { width: 3, height: 6 },
      textShadowOffset: { width: 1.5, height: 1.5 },
    });
  });

  it('嵌套对象按同一套白名单递归，白名单外的键仍然不动', () => {
    expect(
      scaleStyle(
        {
          shadowOffset: { width: 2, height: 4 },
          // 不是真实 RN 属性，用来锁住「递归 + 白名单」这个通用行为
          customPair: { width: 2, gap: 4, opacity: 0.5 },
        },
        2,
      ),
    ).toEqual({
      shadowOffset: { width: 4, height: 8 },
      customPair: { width: 4, gap: 8, opacity: 0.5 },
    });
  });

  it('transform：长度类算子缩放，比例 / 角度算子原样保留', () => {
    expect(
      scaleStyle(
        {
          transform: [
            { translateX: 10 },
            { translateY: -20 },
            { scale: 2 },
            { rotate: '45deg' },
            { perspective: 800 },
          ],
        },
        scale,
      ).transform,
    ).toEqual([
      { translateX: 15 },
      { translateY: -30 },
      { scale: 2 },
      { rotate: '45deg' },
      { perspective: 1200 },
    ]);
  });

  it('数组里的字符串项原样保留（如 fontVariant）', () => {
    expect(scaleStyle({ fontVariant: ['small-caps', 'tabular-nums'] }, scale)).toEqual({
      fontVariant: ['small-caps', 'tabular-nums'],
    });
  });

  it('白名单外的数值属性原样保留（防止将来 RN 新增属性被误缩放）', () => {
    expect(scaleStyle({ someFutureLength: 10 }, scale)).toEqual({ someFutureLength: 10 });
  });

  it('支持样式数组，数组里的假值原样保留', () => {
    expect(scaleStyle([{ padding: 8 }, null, false, undefined, { width: 10 }], scale)).toEqual([
      { padding: 12 },
      null,
      false,
      undefined,
      { width: 15 },
    ]);
  });

  it('非对象入参原样返回（例如 StyleSheet.create 产出的数字 id）', () => {
    expect(scaleStyle(42 as unknown as object, scale)).toBe(42);
    expect(scaleStyle(null as unknown as object, scale)).toBeNull();
  });

  it('不改入参（返回新对象）', () => {
    const raw = { padding: 8, shadowOffset: { width: 1, height: 2 } };
    const snapshot = JSON.parse(JSON.stringify(raw));

    const scaled = scaleStyle(raw, scale);

    expect(scaled).not.toBe(raw);
    expect(raw).toEqual(snapshot);
  });

  it('系数 1 时数值完全不变', () => {
    const raw = { padding: 8, fontSize: 14, borderRadius: 6 };
    expect(scaleStyle(raw, 1)).toEqual(raw);
  });
});

describe('scaleStyles', () => {
  it('批量换算每个命名样式', () => {
    const raw = {
      container: { padding: 16 },
      title: { fontSize: 20, opacity: 0.9 },
    };

    expect(scaleStyles(raw, 1.25)).toEqual({
      container: { padding: 20 },
      title: { fontSize: 25, opacity: 0.9 },
    });
  });

  it('不改入参', () => {
    const raw = { container: { padding: 16 } };
    const snapshot = JSON.parse(JSON.stringify(raw));

    scaleStyles(raw, 1.4);

    expect(raw).toEqual(snapshot);
  });
});
