import { primitive } from '@/design';

/**
 * 原子层测试：只验证「刻度完整 + 路径解析得通」，不写死具体色值
 * （色值会随设计调整，断言死色值只会让每次调色都改测试）。
 */
describe('原子层 primitive（一个巨大字典）', () => {
  const HUES = [
    'yellow',
    'orange',
    'brown',
    'red',
    'pink',
    'purple',
    'blue',
    'cyan',
    'teal',
    'green',
    'lime',
  ] as const;
  const STEPS = [50, 100, 200, 300, 400, 500, 600];

  it.each(HUES)('%s 色相有完整的 50~600 七档', (hue) => {
    const ramp = primitive.color[hue] as Record<number, string>;
    expect(
      Object.keys(ramp)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual(STEPS);
    STEPS.forEach((step) => expect(ramp[step]).toMatch(/^#[0-9A-F]{6}$/i));
  });

  it('无彩色：gray / slate 都是 25~900；基础三色齐全', () => {
    const steps = [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
    expect(
      Object.keys(primitive.color.gray)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual(steps);
    expect(
      Object.keys(primitive.color.slate)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual(steps);

    expect(primitive.color.white).toBe('#FFFFFF');
    expect(primitive.color.black).toBe('#000000');
    expect(primitive.color.transparent).toBe('transparent');
  });

  it('透明度阶梯：alpha.white 15~60、alpha.black 2~93', () => {
    const white = Object.keys(primitive.color.alpha.white).map(Number);
    const black = Object.keys(primitive.color.alpha.black).map(Number);

    expect(Math.min(...white)).toBe(15);
    expect(Math.max(...white)).toBe(60);
    expect(Math.min(...black)).toBe(2);
    expect(Math.max(...black)).toBe(93);

    expect(primitive.color.alpha.white[15]).toBe('rgba(255, 255, 255, 0.15)');
    expect(primitive.color.alpha.black[45]).toBe('rgba(0, 0, 0, 0.45)');
  });

  it('字体：字号 9~42、行高 14~60、字重四档、三个字族都分平台', () => {
    const sizes = Object.keys(primitive.font.size).map(Number);
    const heights = Object.keys(primitive.font.lineHeight).map(Number);

    expect(Math.min(...sizes)).toBe(9);
    expect(Math.max(...sizes)).toBe(42);
    expect(Math.min(...heights)).toBe(14);
    expect(Math.max(...heights)).toBe(60);

    expect(Object.keys(primitive.font.weight).sort()).toEqual([
      'bold',
      'medium',
      'regular',
      'semibold',
    ]);

    (['sans', 'brand', 'brandNumber'] as const).forEach((family) => {
      expect(Object.keys(primitive.font.family[family]).sort()).toEqual([
        'android',
        'default',
        'ios',
        'web',
      ]);
    });
  });

  it('几何：spacing 是 2px 网格，radius / stroke / size 档位齐全', () => {
    expect(primitive.spacing['3xs']).toBe(2);
    expect(primitive.spacing.m).toBe(10);
    expect(primitive.spacing['2xl']).toBe(16);
    Object.entries(primitive.spacing).forEach(([key, value]) => {
      if (key !== '0' && key !== '4xs') expect(value % 2).toBe(0);
    });

    expect(primitive.radius.none).toBe(0);
    expect(primitive.radius.full).toBeGreaterThan(360);
    expect(primitive.stroke.thin).toBe(1);
    expect(primitive.stroke.hairline).toBeLessThan(1);
    expect(primitive.size.icon.m).toBe(20);
  });

  it('阴影 / 透明度：四档阴影 + 四个透明度档位', () => {
    expect(Object.keys(primitive.shadow)).toEqual(['none', 's', 'm', 'l']);
    expect(primitive.shadow.m.elevation).toBeGreaterThan(primitive.shadow.s.elevation);
    expect(primitive.opacity.disabled).toBeLessThan(primitive.opacity.full);
  });
});
