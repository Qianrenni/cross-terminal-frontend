import { RING_RADIUS, circle } from './_shared';
import type { IconShape } from './type';

/**
 * 实心圆（`circle`）。
 *
 * 局部变量叫 `circleShape` 而不是 `circle`，因为这里 import 了同名的 `circle()` 构造器；
 * 文件名仍严格等于图标名（`circle.ts`），这是「文件名 = 图标名」约定的必然结果。
 */
const circleShape: IconShape = { fill: circle(50, 50, RING_RADIUS) };

export default circleShape;
