import type { IconShape } from './type';

/**
 * 空心五角星（`star-outline`）。
 *
 * 与 `star` 用**同一份** `d`，只换渲染方式（描边而不是填充）—— 这也正是把两类路径
 * 分开的价值：同一套坐标可以同时产出实心 / 线性两版。
 */
const starOutline: IconShape = {
  stroke:
    'M50 12 L59.1 39.5 L88 39.6 L64.7 56.8 L73.5 84.4 L50 67.5 L26.5 84.4 L35.3 56.8 L12 39.6 L40.9 39.5 Z',
};

export default starOutline;
