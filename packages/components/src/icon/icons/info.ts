import { RING, circle } from './_shared';
import type { IconShape } from './type';

/** 信息（**描边的圈** + 实心的点 + 竖杆），同时用上两类路径，是很好的回归样本。 */
const info: IconShape = {
  stroke: `${RING} M50 70 V46`,
  fill: circle(50, 32, 5),
};

export default info;
