import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import config from '../eslint.config.mjs';

/**
 * 共享配置的自检（零依赖：用 Node 内置的 `node:test`）。
 *
 * 只验证「结构还在」：导出是扁平数组、关键 ignores 与 Vue / React Hooks / JSONC 配置存在。
 * 真正的 lint 行为由各消费方跑 `eslint .` 验证。
 */
describe('@qyani/eslint-config', () => {
  it('导出 ESLint 扁平配置数组', () => {
    assert.ok(Array.isArray(config));
    assert.ok(config.length > 0);
  });

  it('包含忽略规则（依赖 / 产物 / 原生端）', () => {
    const ignoresBlock = config.find((block) => Array.isArray(block.ignores));
    assert.ok(ignoresBlock, '缺少全局 ignores');
    assert.ok(ignoresBlock.ignores.includes('**/node_modules/**'));
    assert.ok(ignoresBlock.ignores.includes('**/dist/**'));
    assert.ok(ignoresBlock.ignores.includes('**/android/**'));
  });

  it('包含 Vue 相关配置', () => {
    const hasVue = config.some(
      (block) =>
        Array.isArray(block.files) && block.files.some((file) => String(file).includes('vue')),
    );
    assert.ok(hasVue, '缺少 Vue 配置块');
  });

  it('包含 TypeScript / React Hooks / JSX 配置', () => {
    const hasReactHooks = config.some(
      (block) =>
        Array.isArray(block.files) &&
        block.files.some((file) => String(file).includes('tsx')) &&
        block.rules?.['react-hooks/rules-of-hooks'] != null,
    );
    assert.ok(hasReactHooks, '缺少 react-hooks 规则');

    const hasJsxRules = config.some(
      (block) => block.plugins != null && Object.keys(block.plugins).includes('@eslint-react'),
    );
    assert.ok(hasJsxRules, '缺少 @eslint-react（JSX）规则');
  });

  it('tsconfig 走 JSONC 解析（带注释的 JSON 不能按纯 JSON 处理）', () => {
    const hasJsonc = config.some((block) => block.language === 'json/jsonc');
    assert.ok(hasJsonc, '缺少 json/jsonc 配置块');
  });
});
