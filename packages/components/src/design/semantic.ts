import { Platform } from 'react-native';
import type { TextStyle } from 'react-native';
import { primitive } from './primitive';

/**
 * # ② 语义层：一堆「路径」
 *
 * 这一层只干一件事：**给原子层的值起有含义的名字**。值是路径字符串，不是色值：
 *
 * ```ts
 * color.brand.primary  →  'primitive.color.yellow.500'
 * ```
 *
 * 所以它是**动态读取**的：
 * - 换主题 = 换几条路径（黄 → 蓝），见 `./theme.ts`；
 * - 运行时覆盖 = 把某条路径换成**具体值**（`{ 'color.brand.primary': '#EF4444' }`）；
 * - 真正把路径变成值，发生在 `theme.ts` 的 `resolve()` 里（组件拿到的都是解析后的值）。
 *
 * 路径前缀只有两个：`primitive.`（原子层）与 `semantic.`（语义层内部互相引用，
 * 例如字体颜色引用 `semantic.color.text.primary`，这样覆盖文字色时字体跟着变）。
 * 不以这两个前缀开头的字符串**原样保留**（字面值，如字体栈）。
 */

/** 当前平台的字体栈（平台不会在运行中变，所以在这里定一次）。 */
function fontFamily(family: 'sans' | 'brand' | 'brandNumber'): string {
  const stacks = primitive.font.family[family];
  return Platform.select({
    ios: stacks.ios,
    android: stacks.android,
    web: stacks.web,
    default: stacks.default,
  }) as string;
}

interface TextStyleInput {
  /** 字重档位 */
  weight: keyof typeof primitive.font.weight;
  /** 字距（px）；大标题用负值收紧 */
  letterSpacing?: number;
  /** 文字颜色（语义路径）；默认 `semantic.color.text.primary` */
  color?: string;
  /** 字族；默认用 `sans` 字体栈（当前临时统一 PingFang SC） */
  fontFamily?: string;
}

/** 组装一个文字样式（数字直接取原子层，颜色写语义路径）。 */
function text(
  size: keyof typeof primitive.font.size,
  lineHeight: keyof typeof primitive.font.lineHeight,
  {
    weight,
    letterSpacing = 0,
    color = 'semantic.color.text.primary',
    fontFamily: family = sansFamily,
  }: TextStyleInput,
): {
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing: number;
  color: string;
  fontFamily?: string;
} {
  const base = {
    fontSize: primitive.font.size[size],
    lineHeight: primitive.font.lineHeight[lineHeight],
    fontWeight: primitive.font.weight[weight],
    letterSpacing,
    color,
  };
  return family == null ? base : { ...base, fontFamily: family };
}

const sansFamily = fontFamily('sans');
const numberFamily = fontFamily('brandNumber');
const brandFamily = fontFamily('brand');

/**
 * 语义层的**默认值**（默认主题「黄」的取值）。
 *
 * 主题只需要覆盖 `color.brand.*` 那几条；其余语义色/字体与主题无关。
 */
export const semantic = {
  color: {
    brand: {
      primary: 'primitive.color.yellow.500',
      onPrimary: 'primitive.color.gray.900',
      subtitle: 'primitive.color.yellow.100',
      onSubtitle: 'primitive.color.yellow.600',
      tertiary: 'primitive.color.yellow.50',
      onTertiary: 'primitive.color.yellow.600',
      /** 品牌色块内组合元素（副文案 / 分隔线）的前景色 */
      onCombo: 'primitive.color.alpha.black.60',
      text: {
        highlight: 'primitive.color.yellow.600',
        price: 'primitive.color.yellow.600',
      },
    },
    /** 文字层级：主 → 禁用 */
    text: {
      primary: 'primitive.color.gray.900',
      secondary: 'primitive.color.gray.600',
      tertiary: 'primitive.color.gray.500',
      quaternary: 'primitive.color.gray.400',
      disabled: 'primitive.color.gray.300',
      inverse: 'primitive.color.white',
    },
    /** 状态色（不随品牌主题变） */
    status: {
      success: {
        default: 'primitive.color.green.500',
        onDefault: 'primitive.color.white',
        weak: 'primitive.color.green.50',
      },
      warning: {
        default: 'primitive.color.orange.500',
        onDefault: 'primitive.color.white',
        weak: 'primitive.color.orange.50',
      },
      error: {
        default: 'primitive.color.red.500',
        onDefault: 'primitive.color.white',
        weak: 'primitive.color.red.50',
      },
      info: {
        default: 'primitive.color.blue.500',
        onDefault: 'primitive.color.white',
        weak: 'primitive.color.blue.50',
      },
    },
    /** 促销色 */
    promo: {
      red: { default: 'primitive.color.red.500', onDefault: 'primitive.color.white' },
      orange: { default: 'primitive.color.orange.500', onDefault: 'primitive.color.white' },
    },
    /** 背景 */
    background: {
      white: 'primitive.color.white',
      primary: 'primitive.color.gray.25',
      secondary: 'primitive.color.gray.50',
      tertiary: 'primitive.color.gray.100',
      subtitleFill: 'primitive.color.gray.50',
      disabled: 'primitive.color.gray.100',
      cancel: 'primitive.color.gray.200',
      mask: 'primitive.color.alpha.black.45',
      transparent: 'primitive.color.transparent',
    },
    /** 线条颜色 */
    stroke: {
      white: 'primitive.color.white',
      default: 'primitive.color.gray.200',
      secondary: 'primitive.color.gray.100',
      primary: 'primitive.color.gray.300',
    },
  },

  /**
   * 交互态透明度（无量纲，不随主题变）。
   *
   * 数值直接取原子层：组件不该再通过 `theme.primitive` 拿这些值
   * （`ThemeConfig` 里已经不含原子层）。
   */
  opacity: {
    /** 按压态 */
    pressed: primitive.opacity.pressed,
    /** 禁用态 */
    disabled: primitive.opacity.disabled,
  },

  font: {
    /** 系统字族：用原子层 `family.sans`（当前临时统一 PingFang SC） */
    sys: {
      display: {
        xxl: text(42, 52, { weight: 'bold', letterSpacing: -0.8 }),
        xl: text(36, 48, { weight: 'bold', letterSpacing: -0.6 }),
        l: text(32, 40, { weight: 'bold', letterSpacing: -0.5 }),
        m: text(28, 36, { weight: 'bold', letterSpacing: -0.4 }),
        s: text(24, 32, { weight: 'bold', letterSpacing: -0.3 }),
        xs: text(20, 28, { weight: 'bold', letterSpacing: -0.2 }),
      },
      heading: {
        xl: text(30, 40, { weight: 'semibold', letterSpacing: -0.3 }),
        l: text(26, 36, { weight: 'semibold', letterSpacing: -0.2 }),
        m: text(24, 32, { weight: 'semibold', letterSpacing: -0.2 }),
        s: text(20, 28, { weight: 'semibold', letterSpacing: -0.1 }),
        xs: text(18, 26, { weight: 'semibold' }),
      },
      title: {
        xl: text(20, 28, { weight: 'semibold' }),
        l: text(18, 26, { weight: 'semibold' }),
        m: text(17, 24, { weight: 'semibold' }),
        s: text(16, 24, { weight: 'semibold' }),
        xs: text(15, 22, { weight: 'semibold' }),
      },
      body: {
        l: text(17, 26, { weight: 'regular' }),
        m: text(15, 22, { weight: 'regular' }),
        s: text(13, 20, { weight: 'regular' }),
        xs: text(12, 18, { weight: 'regular' }),
      },
      /** 辅助说明：默认次级文字色 */
      caption: {
        l: text(13, 18, { weight: 'regular', color: 'semantic.color.text.secondary' }),
        m: text(12, 16, { weight: 'regular', color: 'semantic.color.text.secondary' }),
        s: text(11, 16, { weight: 'regular', color: 'semantic.color.text.secondary' }),
        xs: text(10, 14, {
          weight: 'regular',
          color: 'semantic.color.text.secondary',
          letterSpacing: 0.2,
        }),
      },
      /** 控件文字：按钮 / 标签 / 分段器（六档，供组件层按档位引用） */
      label: {
        xl: text(17, 26, { weight: 'semibold' }),
        l: text(16, 24, { weight: 'semibold' }),
        m: text(15, 22, { weight: 'semibold' }),
        s: text(14, 20, { weight: 'semibold' }),
        xs: text(13, 18, { weight: 'semibold' }),
        '2xs': text(12, 16, { weight: 'semibold' }),
      },
    },

    /** 价格 / 倒计时 / 计数：等宽数字 */
    number: {
      '5xl': text(42, 52, { weight: 'bold', letterSpacing: -0.5, fontFamily: numberFamily }),
      '4xl': text(36, 44, { weight: 'bold', letterSpacing: -0.4, fontFamily: numberFamily }),
      '3xl': text(32, 40, { weight: 'bold', letterSpacing: -0.3, fontFamily: numberFamily }),
      '2xl': text(28, 36, { weight: 'bold', letterSpacing: -0.2, fontFamily: numberFamily }),
      xl: text(24, 32, { weight: 'bold', letterSpacing: -0.1, fontFamily: numberFamily }),
      l: text(20, 28, { weight: 'semibold', fontFamily: numberFamily }),
      m: text(16, 24, { weight: 'semibold', fontFamily: numberFamily }),
      s: text(14, 22, { weight: 'medium', fontFamily: numberFamily }),
      xs: text(12, 16, { weight: 'medium', fontFamily: numberFamily }),
    },

    /** 品牌字族：字号 / 行高 / 字重与 sys 一致，只换字族 */
    brand: {
      heading: {
        xl: text(30, 40, { weight: 'bold', letterSpacing: -0.3, fontFamily: brandFamily }),
        l: text(26, 36, { weight: 'bold', letterSpacing: -0.2, fontFamily: brandFamily }),
        m: text(24, 32, { weight: 'bold', letterSpacing: -0.2, fontFamily: brandFamily }),
        s: text(20, 28, { weight: 'semibold', letterSpacing: -0.1, fontFamily: brandFamily }),
        xs: text(18, 26, { weight: 'semibold', fontFamily: brandFamily }),
      },
      title: {
        xl: text(20, 28, { weight: 'semibold', fontFamily: brandFamily }),
        l: text(18, 26, { weight: 'semibold', fontFamily: brandFamily }),
        m: text(17, 24, { weight: 'semibold', fontFamily: brandFamily }),
        s: text(16, 24, { weight: 'semibold', fontFamily: brandFamily }),
        xs: text(15, 22, { weight: 'semibold', fontFamily: brandFamily }),
      },
      body: {
        l: text(17, 26, { weight: 'regular', fontFamily: brandFamily }),
        m: text(15, 22, { weight: 'regular', fontFamily: brandFamily }),
        s: text(13, 20, { weight: 'regular', fontFamily: brandFamily }),
        xs: text(12, 18, { weight: 'regular', fontFamily: brandFamily }),
      },
      caption: {
        l: text(13, 18, {
          weight: 'regular',
          color: 'semantic.color.text.secondary',
          fontFamily: brandFamily,
        }),
        m: text(12, 16, {
          weight: 'regular',
          color: 'semantic.color.text.secondary',
          fontFamily: brandFamily,
        }),
        s: text(11, 16, {
          weight: 'regular',
          color: 'semantic.color.text.secondary',
          fontFamily: brandFamily,
        }),
        xs: text(10, 14, {
          weight: 'regular',
          color: 'semantic.color.text.secondary',
          letterSpacing: 0.2,
          fontFamily: brandFamily,
        }),
      },
    },
  },
};

/** 语义层字典的类型（叶子是路径字符串 / 字面值）。 */
export type SemanticDict = typeof semantic;
