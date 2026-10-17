import { RING_RADIUS, circle } from './_shared';
import type { IconShape } from './type';

/** 空心圆（`circle-outline`）。半径与 `circle` 一致，两者可以互换使用。 */
const circleOutline: IconShape = { stroke: circle(50, 50, RING_RADIUS) };

export default circleOutline;
