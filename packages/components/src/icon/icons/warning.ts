import { circle } from './_shared';
import type { IconShape } from './type';

/**
 * 警告（**描边的三角** + 感叹号：竖杆 + 实心点）。
 *
 * 三角顶点 `(50, 17)`、底边 `y = 81`；感叹号的竖杆特意从 `y = 42` 起，而不是从顶点起，
 * 这样在顶点那个尖角处不会糊成一团。
 */
const warning: IconShape = {
  stroke: 'M50 17 L87 81 H13 Z M50 42 V60',
  fill: circle(50, 70, 4.5),
};

export default warning;
