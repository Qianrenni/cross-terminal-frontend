import type { TextStyle } from 'react-native';

/**
 * 语义层字体 token（`semantic.font.*`）**解析后**的形状。
 *
 * 语义层里每个档位都是 `text(fontSize, lineHeight, { weight, letterSpacing, color, fontFamily })`
 * 的产物；组件层用点分字符串引用它（如 `'semantic.font.sys.body.m'`），
 * `theme.ts` 解析后就是这个对象。
 *
 * 放在独立文件里是因为 `button` 与 `text` 都要用 —— 组件层之间不该互相 import。
 */
export interface FontToken {
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing: number;
  color: string;
  fontFamily?: string;
}
