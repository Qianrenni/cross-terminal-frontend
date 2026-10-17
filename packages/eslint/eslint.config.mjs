import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import json from '@eslint/json';
import css from '@eslint/css';
import reactHooks from 'eslint-plugin-react-hooks';
import react from '@eslint-react/eslint-plugin';
import { defineConfig } from 'eslint/config';

/**
 * 共享 ESLint 配置（flat config）。
 *
 * 设计原则：
 * 1. **只 lint 源码**：原生壳工程（android / ios / harmony / miniprogram）与
 *    后端（backend）各有自己的工具链，构建产物（dist / build / coverage）不该进 lint；
 * 2. **TS 是主语言**：`typescript-eslint` recommended；JS / JSX 也覆盖；
 * 3. **React 规则全开**：`react-hooks` v7 的 `flat.recommended`（含 React Compiler 那套：
 *    `set-state-in-effect` / `refs` / `purity` / `immutability` …）+ `@eslint-react` 的
 *    `recommended`（JSX + React 最佳实践，替代尚不支持 ESLint 10 的 `eslint-plugin-react`）；
 * 4. **JSON 分两种**：纯 `.json` 用 `json/json`；`tsconfig*.json` / `jsconfig*.json` 是
 *    **JSONC（带注释）**，必须用 `json/jsonc` 解析，否则一定报 parsing error；
 * 5. **CommonJS 文件放行 `require`**：Metro / Babel / Prettier / ESLint 自身的配置文件都是 CJS。
 */

/** 不参与 JS 侧 lint 的目录（各端有自己的工具链 / 是生成物）。 */
const IGNORED = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.codegraph/**',
  '**/.vscode/**',
  '**/*.lock',
  '**/pnpm-lock.yaml',
  // 原生壳工程与后端：不是 JS 项目
  '**/android/**',
  '**/ios/**',
  '**/harmony/**',
  '**/miniprogram/**',
  '**/backend/**',
];

export default defineConfig([
  { ignores: IGNORED },

  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx,vue}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },

  tseslint.configs.recommended,

  // React：React Compiler 规则集全开（react-hooks v7 recommended）
  {
    files: ['**/*.{jsx,tsx}'],
    ...reactHooks.configs.flat.recommended,
  },

  // JSX / React 规则：`eslint-plugin-react` 目前还不支持 ESLint 10（peer 仅到 ^9.7），
  // 改用 `@eslint-react/eslint-plugin`（peer 为 `*`，官方支持 ESLint 10）
  {
    files: ['**/*.{jsx,tsx}'],
    ...react.configs.recommended,
  },

  // 纯 JSON
  {
    files: ['**/*.json'],
    plugins: { json },
    language: 'json/json',
    extends: ['json/recommended'],
  },
  // JSONC（带注释）：放在纯 JSON 之后，靠**后定义生效**覆盖 language
  {
    files: ['**/tsconfig*.json', '**/jsconfig*.json', '**/*.jsonc'],
    plugins: { json },
    language: 'json/jsonc',
    extends: ['json/recommended'],
  },
  {
    files: ['**/*.json5'],
    plugins: { json },
    language: 'json/json5',
    extends: ['json/recommended'],
  },

  // CJS 配置：`require()` 合法
  {
    files: ['**/*.cjs', '**/*.config.js', '**/metro.config.js', '**/babel.config.js'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  // Vue：本仓库暂未使用，保留给同类项目复用（无 Vue 文件时零开销）
  {
    files: ['**/*.vue'],
    ...pluginVue.configs['flat/essential'][0],
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tseslint.parser },
    },
  },

  // CSS：baseline 规则太严（`user-select` / `accent-color` 会被判成「非广泛可用」），关掉
  {
    files: ['**/*.css'],
    plugins: { css },
    language: 'css/css',
    extends: ['css/recommended'],
    rules: {
      'css/no-invalid-properties': 'warn',
      'css/use-baseline': 'off',
    },
  },
]);
