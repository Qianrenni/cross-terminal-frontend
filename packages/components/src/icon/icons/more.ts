import { circle } from './_shared';
import type { IconShape } from './type';

/** 更多（横向三个实心点）。三个圆拼成**一条** `d`，不需要多条路径。 */
const more: IconShape = {
  fill: `${circle(25, 50, 7)} ${circle(50, 50, 7)} ${circle(75, 50, 7)}`,
};

export default more;
