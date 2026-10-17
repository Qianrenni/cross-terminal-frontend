import { components, getTheme, semantic, THEME_NAMES, primitive } from '@/design';

/**
 * 语义层 / 组件层是「路径字典」，主题负责解析。
 * 这组测试只验证**解析确实发生了**，不锁死每一处配色。
 */
describe('语义层 semantic（路径字典）', () => {
  const theme = getTheme('yellow');

  it('字典里存的是路径，解析后是值', () => {
    expect(semantic.color.brand.primary).toBe('primitive.color.yellow.500');
    expect(theme.semantic.color.brand.primary).toBe(primitive.color.yellow[500]);
  });

  it('交互态透明度在语义层（组件不再依赖 theme.primitive）', () => {
    expect(semantic.opacity.pressed).toBe(primitive.opacity.pressed);
    expect(semantic.opacity.disabled).toBe(primitive.opacity.disabled);
    expect(theme.semantic.opacity.pressed).toBe(primitive.opacity.pressed);
    expect(theme.semantic.opacity.disabled).toBe(primitive.opacity.disabled);
  });

  it('文字 / 背景 / 描边 / 状态 / 促销都能追溯到原子层', () => {
    const { color } = theme.semantic;

    expect(color.text.primary).toBe(primitive.color.gray[900]);
    expect(color.text.secondary).toBe(primitive.color.gray[600]);
    expect(color.text.disabled).toBe(primitive.color.gray[300]);
    expect(color.text.inverse).toBe(primitive.color.white);

    expect(color.background.white).toBe(primitive.color.white);
    expect(color.background.primary).toBe(primitive.color.gray[25]);
    expect(color.background.transparent).toBe('transparent');
    expect(color.background.mask).toBe(primitive.color.alpha.black[45]);

    expect(color.stroke.default).toBe(primitive.color.gray[200]);
    expect(color.stroke.white).toBe(primitive.color.white);

    expect(color.status.success.default).toBe(primitive.color.green[500]);
    expect(color.status.error.default).toBe(primitive.color.red[500]);
    expect(color.status.warning.default).toBe(primitive.color.orange[500]);
    expect(color.status.info.default).toBe(primitive.color.blue[500]);
    expect(color.status.success.weak).toBe(primitive.color.green[50]);

    expect(color.promo.red.default).toBe(primitive.color.red[500]);
    expect(color.promo.orange.default).toBe(primitive.color.orange[500]);
  });

  it('字体：数字直接取原子层，颜色写语义路径（解析后是值）', () => {
    expect(semantic.font.sys.body.m.fontSize).toBe(15);
    expect(semantic.font.sys.caption.m.color).toBe('semantic.color.text.secondary');

    const { font } = theme.semantic;
    expect(font.sys.display.xxl.fontSize).toBe(42);
    expect(font.sys.body.m.fontSize).toBe(15);
    expect(font.sys.body.m.lineHeight).toBe(22);
    expect(font.sys.body.m.fontWeight).toBe('400');
    expect(font.sys.label.m.fontWeight).toBe('600');
    // 说明文字解析成次级文字色（语义引用被解析）
    expect(font.sys.caption.m.color).toBe(primitive.color.gray[600]);

    // 所有字族都带 fontFamily（暂统一 PingFang SC）
    expect(font.sys.body.m.fontFamily).toContain('PingFang SC');
    expect(font.number['5xl'].fontFamily).toBeDefined();
    expect(font.brand.heading.xl.fontFamily).toBeDefined();
  });

  it('组件层：几何直接写数值，颜色写点分字符串', () => {
    // 组件层不 import 原子层，几何是「按钮自己的数值」
    expect(components.button.height[6]).toBe(48);
    expect(components.button.paddingHorizontal[1]).toBe(10);

    const { button, icon } = theme.components;
    expect(button.height).toEqual({ 1: 28, 2: 32, 3: 36, 4: 40, 5: 44, 6: 48 });
    expect(button.paddingHorizontal).toEqual({ 1: 10, 2: 12, 3: 15, 4: 18, 5: 20, 6: 24 });
    // 排版引用语义层 font token，解析后是整份文字样式（level 越高字号越大）
    expect(button.font[6]).toEqual(theme.semantic.font.sys.label.xl);
    expect(button.font[1]).toEqual(theme.semantic.font.sys.label['2xs']);
    expect(button.subFont[6]).toEqual(theme.semantic.font.sys.caption.l);
    expect(button.font[1].fontSize as number).toBeLessThan(button.font[6].fontSize);
    expect(button.lineGap).toBe(-2);
    expect(button.iconGap).toBe(2);
    expect(button.textGap).toBe(2);

    // 颜色是点分字符串，由主题解析成色值
    expect(components.icon.color).toBe('semantic.color.text.primary');
    expect(icon.color).toBe(theme.semantic.color.text.primary);
    expect(icon.size).toBe(20);
  });

  it('7 套主题：品牌色各不相同，其余语义色完全一致', () => {
    expect(THEME_NAMES).toEqual(['yellow', 'orange', 'pink', 'blue', 'red', 'brown', 'green']);

    const primaries = THEME_NAMES.map((name) => getTheme(name).semantic.color.brand.primary);
    expect(new Set(primaries).size).toBe(THEME_NAMES.length);

    THEME_NAMES.forEach((name) => {
      const { color } = getTheme(name).semantic;
      expect(color.text.primary).toBe(primitive.color.gray[900]);
      expect(color.background.white).toBe(primitive.color.white);
      expect(color.stroke.default).toBe(primitive.color.gray[200]);
      expect(color.status.error.default).toBe(primitive.color.red[500]);
    });
  });

  it('onPrimary 跟着品牌色亮度走：浅色底深字、深色底白字', () => {
    expect(getTheme('yellow').semantic.color.brand.onPrimary).toBe(primitive.color.gray[900]);
    expect(getTheme('green').semantic.color.brand.onPrimary).toBe(primitive.color.gray[900]);
    expect(getTheme('blue').semantic.color.brand.onPrimary).toBe(primitive.color.white);
    expect(getTheme('red').semantic.color.brand.onPrimary).toBe(primitive.color.white);
  });
});
