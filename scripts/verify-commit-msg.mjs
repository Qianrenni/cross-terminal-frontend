#!/usr/bin/env node
/**
 * commit message 校验：`[type][change] 改了什么 [effect] 影响哪些`
 *
 * ```text
 * [feat][change] 新增 QHotzone 热区开关 [effect] 文档站、全部示例
 * │    │        │                     │       │
 * │    │        │                     │       └ 影响哪些（包 / 组件 / 文档 / none）
 * │    │        │                     └ [effect] 固定标签
 * │    │        └ 具体改了什么
 * │    └ [change] 固定标签
 * └ type：feat / fix / test / docs / refactor / style / perf / build / ci / chore / revert
 * ```
 *
 * 规则（只校验**首行**，正文 / footer 随你写）：
 * 1. 必须是白名单里的 type（小写），紧跟 `[change]`；
 * 2. `[change]` 后写具体改了什么，不能为空；
 * 3. 必须出现 `[effect]`，后面写影响哪些，不能为空；
 * 4. 首行不超过 120 个字符（中文按字符数，报错时提示）；
 * 5. `Merge` / `Revert` / `fixup!` / `squash!` 开头的自动提交放行。
 *
 * 零依赖（只用 node 内置模块），因为它在每次 commit 时都会跑。
 */
import { readFileSync } from 'node:fs';

/** 允许的改动类型（小写）。加类型时同步 README / AGENTS.md / scripts/README.md。 */
const TYPES = [
  'feat',
  'fix',
  'test',
  'docs',
  'refactor',
  'style',
  'perf',
  'build',
  'ci',
  'chore',
  'revert',
];

/** 首行长度上限（中文按字符数）。 */
const MAX_LENGTH = 120;

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

/** `[type][change] <改动> [effect] <影响>` */
const PATTERN = /^\[([a-z]+)\]\[change\]\s+(.+?)\s+\[effect\]\s+(.+)$/;

function fail(reason) {
  console.error('');
  console.error('✖ 提交信息不符合规范：' + reason);
  console.error('');
  console.error('  格式： [type][change] 改了什么 [effect] 影响哪些');
  console.error('  type： ' + TYPES.join(' | '));
  console.error('  示例： [feat][change] 新增 QHotzone 热区开关 [effect] 文档站、全部示例');
  console.error('         [refactor][change] 设计系统改为三层字典 [effect] 全部组件、主题 API');
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
  fail('格式应为 `[type][change] 改了什么 [effect] 影响哪些`');
}

const [, type, change, effect] = match;

if (!TYPES.includes(type)) {
  fail(`type \`${type}\` 不在白名单内（只能是 ${TYPES.join(' / ')}）`);
}
if (change.trim() === '') fail('`[change]` 后面要写具体改了什么');
if (effect.trim() === '') fail('`[effect]` 后面要写影响哪些');
if (header.length > MAX_LENGTH) fail(`首行 ${header.length} 个字符，超过 ${MAX_LENGTH}`);

process.exit(0);
