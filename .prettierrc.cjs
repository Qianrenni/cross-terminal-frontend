// .prettierrc.cjs
// 说明：本仓库的代码风格以 Prettier 为准，ESLint 只管代码质量（不做格式化）。
module.exports = {
  // 一行最多 100 字符（实测本仓库 p99 ≈ 98，取 100 改动最小）
  printWidth: 100,
  // 使用 2 个空格缩进
  tabWidth: 2,
  // 不使用制表符，而使用空格
  useTabs: false,
  // 行尾需要有分号
  semi: true,
  // 使用单引号
  singleQuote: true,
  // 对象的 key 仅在必要时用引号
  quoteProps: 'as-needed',
  // JSX 不使用单引号，而使用双引号
  jsxSingleQuote: false,
  // 末尾需要有逗号
  trailingComma: 'all',
  // 大括号内的首尾需要空格
  bracketSpacing: true,
  // JSX 标签的反尖括号需要换行
  bracketSameLine: false,
  // 箭头函数只有一个参数的时候，也需要括号
  arrowParens: 'always',
  // 每个文件格式化的范围是文件的全部内容
  rangeStart: 0,
  rangeEnd: Infinity,
  // 不需要写文件开头的 @prettier
  requirePragma: false,
  // 不需要自动在文件开头插入 @prettier
  insertPragma: false,
  // 使用默认的折行标准
  proseWrap: 'preserve',
  // 根据显示样式决定 html 要不要折行
  htmlWhitespaceSensitivity: 'css',
  // vue 文件中的 script 和 style 内不用缩进
  vueIndentScriptAndStyle: false,
  // 换行符：统一 LF（跨平台标准；Windows 下也不要写 CRLF，否则 CI 上 format:check 必红）
  endOfLine: 'lf',
  // 格式化嵌入的内容
  embeddedLanguageFormatting: 'auto',
};
