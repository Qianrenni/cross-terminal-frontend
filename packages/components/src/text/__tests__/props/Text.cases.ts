import type { QTextProps } from '@/text/type';
import { matrix, testCase, type Case } from '@/testUtils/case';

/**
 * QText 的快照用例（**只存数据**，渲染与断言交给 `Text.snapshot.test.tsx`）。
 *
 * 本文件是 `.ts` 而非 `.tsx`：`QText` 的内容走 `text` prop（纯字符串），不需要 JSX。
 *
 * 每个字体族各取几档 —— 快照锁住的正是「`typography` 路径 → 语义层 token → 实际数值」。
 */
export const textCases: Case<QTextProps>[] = [
  // —— 系统字族（display / heading / title / body / caption / label） ——
  testCase('排版/display', { text: '大标题', typography: 'font.sys.display.s' }),
  testCase('排版/heading', { text: '章节标题', typography: 'font.sys.heading.m' }),
  testCase('排版/title', { text: '卡片标题', typography: 'font.sys.title.l' }),
  testCase('排版/body', { text: '正文内容', typography: 'font.sys.body.s' }),
  testCase('排版/caption', { text: '辅助说明', typography: 'font.sys.caption.s' }),
  testCase('排版/label', { text: '按钮文案', typography: 'font.sys.label.m' }),

  // —— 数字族（自带等宽数字字体栈）与品牌字族 ——
  testCase('排版/数字', { text: '1,280', typography: 'font.number.5xl' }),
  testCase('排版/品牌', { text: '品牌正文', typography: 'font.brand.body.m' }),

  // —— 颜色 × 行数 ——
  ...matrix<QTextProps>({ text: '两行文本会在这里换行显示', typography: 'font.sys.body.m' }, [
    { 默认色: {}, 品牌色: { color: '#2563EB' } },
    { 单行: { numberOfLines: 1 }, 不限制: {} },
  ]),
];
