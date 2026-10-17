import type { IconShape } from './type';

/**
 * 实心五角星（`star`）。
 *
 * 外接半径 40、内接半径 15.5，圆心 `(50, 52)`。
 * 圆心的 y 比画布中心低 2，是让五角星的**视觉重心**落在画布中心的常规做法
 * （上方那个尖角占了更多视觉重量）。
 */
const star: IconShape = {
  fill: 'M50 12 L59.1 39.5 L88 39.6 L64.7 56.8 L73.5 84.4 L50 67.5 L26.5 84.4 L35.3 56.8 L12 39.6 L40.9 39.5 Z',
};

export default star;
