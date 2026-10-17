import {
  hotzoneLayerStyle,
  hotzoneSize,
  insetToReachTarget,
  normalizeHotzoneInset,
} from '@/hotzone';

describe('normalizeHotzoneInset', () => {
  it('不传时四边都是 0', () => {
    expect(normalizeHotzoneInset()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('number 展开成四边相同', () => {
    expect(normalizeHotzoneInset(12)).toEqual({ top: 12, right: 12, bottom: 12, left: 12 });
  });

  it('对象里没写的边按 0 补齐', () => {
    expect(normalizeHotzoneInset({ top: 8, left: 4 })).toEqual({
      top: 8,
      right: 0,
      bottom: 0,
      left: 4,
    });
  });

  it('负数 / NaN / Infinity 都收敛成 0（外扩量只能是非负有限数）', () => {
    const zero = { top: 0, right: 0, bottom: 0, left: 0 };

    expect(normalizeHotzoneInset(-10)).toEqual(zero);
    expect(normalizeHotzoneInset(Number.NaN)).toEqual(zero);
    expect(normalizeHotzoneInset(Number.POSITIVE_INFINITY)).toEqual(zero);
    expect(normalizeHotzoneInset({ top: -1, right: Number.NaN })).toEqual(zero);
  });
});

describe('hotzoneLayerStyle', () => {
  it('四边偏移取负值，才能向外扩', () => {
    expect(hotzoneLayerStyle(12)).toEqual({
      position: 'absolute',
      top: -12,
      right: -12,
      bottom: -12,
      left: -12,
    });
  });

  it('四边可以分别指定，没写的边是正 0（不是 -0）', () => {
    const style = hotzoneLayerStyle({ top: 16, bottom: 16 });

    expect(style).toEqual({ position: 'absolute', top: -16, right: 0, bottom: -16, left: 0 });
    // -0 虽然 === 0，但在样式对象里出现会误导阅读，所以这里额外锁一下符号
    expect(Object.is(style.right, 0)).toBe(true);
    expect(Object.is(style.left, 0)).toBe(true);
  });

  it('永远是绝对定位（否则会插入正常布局、把内容挤走）', () => {
    expect(hotzoneLayerStyle().position).toBe('absolute');
    expect(hotzoneLayerStyle({ left: 6 }).position).toBe('absolute');
  });
});

describe('hotzoneSize', () => {
  it('20px 的图标每边外扩 12，热区正好 44×44', () => {
    expect(hotzoneSize({ width: 20, height: 20 }, 12)).toEqual({ width: 44, height: 44 });
  });

  it('四边分别指定时宽高各加对应两边的和', () => {
    expect(
      hotzoneSize({ width: 20, height: 10 }, { left: 4, right: 6, top: 1, bottom: 3 }),
    ).toEqual({
      width: 30,
      height: 14,
    });
  });

  it('不外扩时就是内容尺寸', () => {
    expect(hotzoneSize({ width: 20, height: 20 })).toEqual({ width: 20, height: 20 });
  });
});

describe('insetToReachTarget', () => {
  it('20 补到 44 → 每边扩 12', () => {
    expect(insetToReachTarget(20, 44)).toBe(12);
  });

  it('已经达到目标时返回 0，不会把热区缩小', () => {
    expect(insetToReachTarget(44, 44)).toBe(0);
    expect(insetToReachTarget(48, 44)).toBe(0);
  });

  it('差值为奇数时不取整，保持相对内容居中', () => {
    // (44 - 21) / 2 = 11.5，取整就会偏心
    expect(insetToReachTarget(21, 44)).toBe(11.5);
  });

  it('目标尺寸由调用方给定，没有内置默认值', () => {
    expect(insetToReachTarget(24, 48)).toBe(12);
  });

  it('非法输入返回 0', () => {
    expect(insetToReachTarget(Number.NaN, 44)).toBe(0);
    expect(insetToReachTarget(20, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('和外扩样式串起来能自洽：返回值直接可用', () => {
    expect(hotzoneSize({ width: 20, height: 20 }, insetToReachTarget(20, 44))).toEqual({
      width: 44,
      height: 44,
    });
  });
});
