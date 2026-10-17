import { buttonDemo } from './button';
import { hotzoneDemo } from './hotzone';
import { iconDemo } from './icon';
import type { AnyComponentDemo } from './types';

/**
 * 组件注册表 —— 首页列表 / 搜索 / 路由都读它。
 *
 * 新增一个组件：写一份 `ComponentDemo`，然后在这里加一行。
 */
export const demos: AnyComponentDemo[] = [hotzoneDemo, iconDemo, buttonDemo];

/** 按路由 key 找 demo。 */
export function findDemo(key: string): AnyComponentDemo | undefined {
  return demos.find((demo) => demo.key === key);
}

/** 按组件名 / key / 说明做不区分大小写的模糊搜索。 */
export function searchDemos(keyword: string): AnyComponentDemo[] {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed) return demos;

  return demos.filter((demo) =>
    [demo.name, demo.key, demo.description].some((field) => field.toLowerCase().includes(trimmed)),
  );
}
