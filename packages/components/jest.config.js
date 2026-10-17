/**
 * Jest 配置。
 *
 * 复用 RN 官方 preset（`@react-native/jest-preset`，RN 0.87 起从 `react-native/jest-preset` 迁出），
 * 它已配置好 babel-jest 转译（含 TS / JSX）与 react-native 的 transformIgnorePatterns。
 *
 * @type {import('jest').Config}
 */
module.exports = {
  preset: '@react-native/jest-preset',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  // 与 tsconfig.json 的 paths 保持一致：`@/xxx` → `<rootDir>/src/xxx`
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
