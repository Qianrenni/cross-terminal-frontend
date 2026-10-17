/**
 * 颜色工具（纯函数）。
 */

/**
 * 把 `#RRGGBB` 加上透明度，返回 `rgba()`。
 *
 * RN 与 Web（react-native-web）都支持 `rgba()`，因此这是跨端安全的做法。
 */
export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
