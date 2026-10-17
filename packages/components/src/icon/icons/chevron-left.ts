import type { IconShape } from './type';

/**
 * 左向折角号（`chevron-left`）。
 *
 * 折角号按设计惯例比箭头更轻，所以这里显式声明 `thin`（对比 `arrow-left` 的默认 `regular`）。
 */
const chevronLeft: IconShape = { stroke: 'M62 24 L36 50 L62 76', weight: 'thin' };

export default chevronLeft;
