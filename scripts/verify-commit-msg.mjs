#!/usr/bin/env node
/**
 * commit message 校验：`[改动][影响] 摘要`
 *
 * ```text
 * [design][button] 三层 token 改成字典，圆角按高度算
 * │      │
 * │      └ 第二个 []：影响什么（组件 / 范围 / all / none）
 * └ 第一个 []：改了什么（模块 / 领域）
 * ```
 *
 * 规则（只校验**首行**，正文 / footer 随你写）：
 * 1. 必须以 `[改动][影响]` 开头（两个方括号**相邻**），两个方括号都不能为空；
 * 2. `]` 之后至少一个空格，再接非空摘要；
 * 3. 首行不超过 100 个字符（中文按字符数，报错时提示）；
 * 4. `Merge` / `Revert` / `fixup!` / `squash!` 开头的自动提交放行。
 *
 * 零依赖（只用 node 内置模块），因为它在每次 commit 时都会跑。
 */
import { readFileSync } from 'node:fs';

/** 命令行参数：commit-msg 钩子传进来的文件路径。 */
const messageFile = process.argv[2];

if (!messageFile) {
  console.error('用法: node scripts/verify-commit-msg.mjs <commit-msg-file>');
  process.exit(1);
}

/** 提交信息原文（去掉注释行，交给 git 的注释不参与校验）。 */
const raw = readFileSync(messageFile, 'utf8');
// 有些编辑器 / 脚本写文件会带 BOM（PowerShell 的 `Out-File -Encoding utf8` 就会），先剥掉
const lines = raw
  .replace(/^\uFEFF/, '')
  .split('\n')
  .map((line) => line.replace(/\r$/, ''))
  .filter((line) => !line.startsWith('#'));

const header = (lines.find((line) => line.trim() !== '') ?? '').trim();

/** 自动产生的提交：合并 / 回滚 / rebase 修正，不套用业务格式。 */
const AUTO_PREFIXES = ['Merge ', 'Revert ', 'fixup!', 'squash!'];

const PATTERN = /^\[([^[\]\n]+)\]\[([^[\]\n]+)\]\s+(\S.*)$/;

function fail(reason) {
  console.error('');
  console.error('✖ 提交信息不符合规范：' + reason);
  console.error('');
  console.error('  格式： [改动][影响] 摘要');
  console.error('  示例： [design][button] 三层 token 改成字典，圆角按高度算');
  console.error('         [docs][docs-site] 补充热区调试开关说明');
  console.error('');
  console.error('  你写的是： ' + (header === '' ? '(空)' : header));
  console.error('');
  process.exit(1);
}

if (header === '') fail('提交信息为空');

if (AUTO_PREFIXES.some((prefix) => header.startsWith(prefix))) {
  process.exit(0);
}

const match = header.match(PATTERN);
if (match == null) {
  fail('必须以 `[改动][影响]` 开头，且后面跟一个空格 + 摘要');
}

const [, change, impact, summary] = match;

if (change.trim() === '') fail('第一个 []（改动）不能为空');
if (impact.trim() === '') fail('第二个 []（影响）不能为空');
if (summary.trim() === '') fail('`[改动][影响]` 之后必须有摘要');
if (header.length > 100) fail(`首行 ${header.length} 个字符，超过 100`);

process.exit(0);
