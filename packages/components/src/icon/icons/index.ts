/**
 * 内置图标表：**图标名 → 矢量描述** —— 整个库唯一的「图标注册表」。
 *
 * ## 为什么需要这张显式的表
 *
 * `IconName` 是从它的 **key** 推导出来的（`keyof typeof ICON_PATHS`），所以
 * `name="clsoe"` 这种拼错会在**编译期**报错、编辑器也能补全。
 * JS 标识符不能带连字符，因此没法做到「文件名 = 图标名 = 导出名」自动推导 ——
 * 只能在这里显式列一遍，换来的是**彻底的类型安全**。
 *
 * ## 新增一个图标 = 两步
 *
 * 1. 在 `icons/` 下加一个文件：**文件名 = 图标名**（kebab-case），默认导出一个 `IconShape`；
 * 2. 回到本文件：import 进来，在 `ICON_PATHS` 里加一行（key 必须与文件名逐字一致）。
 *
 * 第 2 步写错 key（漏掉某个图标、或把 `caret-left` 敲成 `caret-lfet`）由测试兜住：
 * `../__tests__/Icon.interaction.test.tsx` 里有一张**冻结的图标名清单**，任何增删改名都会让它失败。
 *
 * ## 约定
 *
 * - 画布默认 **100×100**，坐标按 100 网格画（见 `./type.ts` 的说明）；
 * - key 一律 kebab-case；顺序 = 文档站下拉框的顺序，按语义分组。
 */
import arrowDown from './arrow-down';
import arrowLeft from './arrow-left';
import arrowRight from './arrow-right';
import arrowUp from './arrow-up';
import caretDown from './caret-down';
import caretLeft from './caret-left';
import caretRight from './caret-right';
import caretUp from './caret-up';
import check from './check';
import chevronLeft from './chevron-left';
import chevronRight from './chevron-right';
import circle from './circle';
import circleOutline from './circle-outline';
import close from './close';
import error from './error';
import info from './info';
import minus from './minus';
import more from './more';
import placeholderLine from './placeholder-line';
import plus from './plus';
import square from './square';
import squareOutline from './square-outline';
import star from './star';
import starOutline from './star-outline';
import warning from './warning';
import type { IconShape } from './type';

export const ICON_PATHS = {
  // —— 方向：实心三角 ——
  'caret-left': caretLeft,
  'caret-right': caretRight,
  'caret-up': caretUp,
  'caret-down': caretDown,

  // —— 方向：线性折角 ——
  'chevron-left': chevronLeft,
  'chevron-right': chevronRight,

  // —— 方向：箭头 ——
  'arrow-left': arrowLeft,
  'arrow-right': arrowRight,
  'arrow-up': arrowUp,
  'arrow-down': arrowDown,

  // —— 状态 ——
  close,
  check,
  info,
  warning,
  error,

  // —— 操作 ——
  plus,
  minus,
  more,

  // —— 评价 / 形状 ——
  star,
  'star-outline': starOutline,
  circle,
  'circle-outline': circleOutline,
  square,
  'square-outline': squareOutline,

  // —— 占位 ——
  'placeholder-line': placeholderLine,
} as const satisfies Record<string, IconShape>;
