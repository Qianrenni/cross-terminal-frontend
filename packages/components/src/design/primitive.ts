/**
 * # ① 原子层：一个巨大的字典
 *
 * **只有值，没有含义**。`color.yellow['500']` 就是一串色值，它不知道自己是「品牌色」；
 * 「品牌色」这种含义写在语义层（`./semantic.ts`），那里用**路径字符串**引用本文件的叶子：
 *
 * ```ts
 * // semantic.ts
 * primary: 'primitive.color.yellow.500'
 * ```
 *
 * 使用约定：
 * - 组件 / 语义层**不 import 本文件取值**，只写路径；真正解析在 `theme.ts` 的 `resolve()` 里；
 * - 路径写法与对象层级完全一致，用 `.` 连接（数字键也写数字：`primitive.font.size.42`）。
 *
 * 分组：`color` / `font` / `spacing` / `radius` / `stroke` / `size` / `shadow` / `opacity`。
 */
export const primitive = {
  color: {
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',

    /** 中性灰：25 是页面底，900 是正文主色 */
    gray: {
      25: '#FCFCFD',
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    /** 冷灰：需要「金属感 / 冷色底」时整组替换 `gray` */
    slate: {
      25: '#FBFCFD',
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
    },

    /** 黄色系（**默认主题色**） */
    yellow: {
      50: '#FEFCE8',
      100: '#FEF9C3',
      200: '#FEF08A',
      300: '#FDE047',
      400: '#FACC15',
      500: '#EAB308',
      600: '#CA8A04',
    },
    orange: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#F97316',
      600: '#EA580C',
    },
    /** 棕色：Tailwind 没有，按同一套感知亮度手调（咖啡 / 烘焙品类） */
    brown: {
      50: '#FBF6F2',
      100: '#F3E5DA',
      200: '#E4CBB6',
      300: '#CFA98A',
      400: '#B4805C',
      500: '#96603C',
      600: '#7A4A2C',
    },
    red: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
    },
    pink: {
      50: '#FDF2F8',
      100: '#FCE7F3',
      200: '#FBCFE8',
      300: '#F9A8D4',
      400: '#F472B6',
      500: '#EC4899',
      600: '#DB2777',
    },
    purple: {
      50: '#FAF5FF',
      100: '#F3E8FF',
      200: '#E9D5FF',
      300: '#D8B4FE',
      400: '#C084FC',
      500: '#A855F7',
      600: '#9333EA',
    },
    blue: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
    },
    cyan: {
      50: '#ECFEFF',
      100: '#CFFAFE',
      200: '#A5F3FC',
      300: '#67E8F9',
      400: '#22D3EE',
      500: '#06B6D4',
      600: '#0891B2',
    },
    teal: {
      50: '#F0FDFA',
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#14B8A6',
      600: '#0D9488',
    },
    green: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#22C55E',
      600: '#16A34A',
    },
    lime: {
      50: '#F7FEE7',
      100: '#ECFCCB',
      200: '#D9F99D',
      300: '#BEF264',
      400: '#A3E635',
      500: '#84CC16',
      600: '#65A30D',
    },

    /** 透明度阶梯：键是百分比，所以 `alpha.black.45` = 45% 黑（遮罩） */
    alpha: {
      white: {
        15: 'rgba(255, 255, 255, 0.15)',
        20: 'rgba(255, 255, 255, 0.2)',
        30: 'rgba(255, 255, 255, 0.3)',
        40: 'rgba(255, 255, 255, 0.4)',
        50: 'rgba(255, 255, 255, 0.5)',
        60: 'rgba(255, 255, 255, 0.6)',
      },
      black: {
        2: 'rgba(0, 0, 0, 0.02)',
        4: 'rgba(0, 0, 0, 0.04)',
        6: 'rgba(0, 0, 0, 0.06)',
        8: 'rgba(0, 0, 0, 0.08)',
        10: 'rgba(0, 0, 0, 0.1)',
        15: 'rgba(0, 0, 0, 0.15)',
        20: 'rgba(0, 0, 0, 0.2)',
        25: 'rgba(0, 0, 0, 0.25)',
        30: 'rgba(0, 0, 0, 0.3)',
        40: 'rgba(0, 0, 0, 0.4)',
        45: 'rgba(0, 0, 0, 0.45)',
        50: 'rgba(0, 0, 0, 0.5)',
        60: 'rgba(0, 0, 0, 0.6)',
        70: 'rgba(0, 0, 0, 0.7)',
        80: 'rgba(0, 0, 0, 0.8)',
        88: 'rgba(0, 0, 0, 0.88)',
        93: 'rgba(0, 0, 0, 0.93)',
      },
    },
  },

  font: {
    /** 分平台字体栈：解析时由 `semantic.ts` 按当前平台选一条 */
    family: {
      sans: {
        ios: 'System',
        android: 'sans-serif',
        web: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        default: 'System',
      },
      brand: {
        ios: 'System',
        android: 'sans-serif',
        web: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        default: 'System',
      },
      brandNumber: {
        ios: 'Menlo',
        android: 'monospace',
        web: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        default: 'monospace',
      },
    },
    /** 字号：键就是 px 值 */
    size: {
      9: 9,
      10: 10,
      11: 11,
      12: 12,
      13: 13,
      14: 14,
      15: 15,
      16: 16,
      17: 17,
      18: 18,
      20: 20,
      22: 22,
      24: 24,
      26: 26,
      28: 28,
      30: 30,
      32: 32,
      36: 36,
      40: 40,
      42: 42,
    },
    /** 行高：键就是 px 值 */
    lineHeight: {
      14: 14,
      16: 16,
      18: 18,
      20: 20,
      22: 22,
      24: 24,
      26: 26,
      28: 28,
      30: 30,
      32: 32,
      36: 36,
      40: 40,
      44: 44,
      48: 48,
      52: 52,
      56: 56,
      60: 60,
    },
    weight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    } as const,
  },

  /** 间距：2px 网格 */
  spacing: {
    0: 0,
    '4xs': 1,
    '3xs': 2,
    '2xs': 4,
    xs: 6,
    s: 8,
    m: 10,
    l: 12,
    xl: 14,
    '2xl': 16,
    '3xl': 20,
    '4xl': 24,
    '5xl': 32,
    '6xl': 40,
    '7xl': 48,
    '8xl': 64,
  },

  radius: {
    none: 0,
    '2xs': 2,
    xs: 4,
    s: 6,
    m: 8,
    l: 12,
    xl: 16,
    '2xl': 24,
    /** ⚠️ 不是「胶囊」的意思：超过控件高度一半会被裁成椭圆，胶囊请用「高度的一半」 */
    full: 999,
  },

  /** 描边宽度（px）；颜色在语义层 */
  stroke: {
    none: 0,
    hairline: 0.5,
    thin: 1,
    medium: 2,
    thick: 4,
  },

  size: {
    /** 控件高度（按钮 / 输入框 / 标签…） */
    control: { s: 28, m: 36, l: 44, xl: 52 },
    /** 图标边长 */
    icon: { xs: 12, s: 16, m: 20, l: 24, xl: 32 },
  },

  /** 阴影：复合值，可整块展开进 style */
  shadow: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    s: {
      shadowColor: '#111827',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    m: {
      shadowColor: '#111827',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    l: {
      shadowColor: '#111827',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  opacity: {
    full: 1,
    pressed: 0.85,
    disabled: 0.5,
    overlay: 0.45,
  },
};

/** 原子层类型（由值推断）。 */
export type Primitive = typeof primitive;
