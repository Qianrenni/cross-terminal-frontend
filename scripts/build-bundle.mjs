#!/usr/bin/env node
/**
 * 构建 RN Bundle（Hermes 字节码）并产出发布元数据 `dist/release.json`。
 *
 * 用法（仓库根目录）：
 *   node scripts/build-bundle.mjs --version 2.0.0
 *   node scripts/build-bundle.mjs --platform android --dev false --rollout 50
 *
 * 产物：`packages/rn-app/dist/index.<platform>.bundle`
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const appDir = path.join(rootDir, 'packages', 'rn-app');
const distDir = path.join(appDir, 'dist');

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const platform = arg('platform', 'android');
const dev = arg('dev', 'false');
const entryFile = arg('entryFile', 'index.ts');
const appKey = arg('appKey', 'guga_app');
const entry = arg('entry', 'MainComponent');
const minBinaryVersion = Number(arg('minBinaryVersion', '1'));
const maxBinaryVersion = Number(arg('maxBinaryVersion', '20'));
const rollout = Number(arg('rollout', '100'));

if (!fs.existsSync(path.join(appDir, 'node_modules'))) {
  console.error('✗ 未安装依赖，请先执行：cd packages/rn-app && pnpm install');
  process.exit(1);
}

const appPackageJson = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'));
const version = arg('version', appPackageJson.version ?? '1.0.0');

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

// CLI 参数用相对路径（cwd 为 rn-app），避免 Windows shell 把反斜杠当转义
const bundleRel = path.posix.join('dist', `index.${platform}.bundle`);
const bundleAbs = path.join(appDir, bundleRel);

function run(step, command, args) {
  console.log(`\n▶ ${step}\n  $ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: appDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) {
    console.error(`✗ ${step} 执行失败：${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`✗ ${step} 失败（exit ${result.status}）`);
    process.exit(result.status ?? 1);
  }
}

/**
 * 寻找本机的 hermesc 可执行文件。
 *
 * hermesc 的位置随 RN 版本与包管理器布局变化：
 * - RN 0.87+ 拆成独立包 `hermes-compiler`，更早版本在 `react-native/sdks/hermesc`；
 * - pnpm workspace 会把依赖 hoist 到**仓库根** node_modules，而非包内。
 *
 * 因此从 `packages/rn-app` 起逐级向上查找 node_modules，命中即返回。
 */
function findHermesc() {
  const binDir =
    process.platform === 'win32'
      ? 'win64-bin'
      : process.platform === 'darwin'
        ? 'osx-bin'
        : 'linux64-bin';
  const binName = process.platform === 'win32' ? 'hermesc.exe' : 'hermesc';

  const locations = [
    ['hermes-compiler', 'hermesc'],
    ['react-native', 'sdks', 'hermesc'],
  ];

  let dir = appDir;
  while (true) {
    for (const location of locations) {
      const candidate = path.join(dir, 'node_modules', ...location, binDir, binName);
      if (fs.existsSync(candidate)) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// 1) 生成 JS bundle
run('生成 JS Bundle', 'npx', [
  'react-native',
  'bundle',
  '--platform',
  platform,
  '--dev',
  dev,
  '--entry-file',
  entryFile,
  '--bundle-output',
  bundleRel,
  '--assets-dest',
  path.posix.join('dist', 'assets'),
]);

// 2) 编译为 Hermes 字节码（若本机存在 hermesc）
const hermesc = findHermesc();
let isHermes = false;
if (hermesc) {
  const hbcRel = `${bundleRel}.hbc`;
  run('编译 Hermes 字节码', hermesc, ['-O', '-emit-binary', '-out', hbcRel, bundleRel]);
  fs.rmSync(bundleAbs, { force: true });
  fs.renameSync(path.join(appDir, hbcRel), bundleAbs);
  isHermes = true;
} else {
  console.warn('\n⚠ 未找到 hermesc，保留 JS 源包（Hermes 开启的 App 可能无法加载）');
}

// 3) 计算 MD5 / 体积，产出发布元数据
const bytes = fs.readFileSync(bundleAbs);
const md5 = createHash('md5').update(bytes).digest('hex');
const release = {
  appKey,
  platform,
  renderer: 'react_native',
  version,
  entry,
  minBinaryVersion,
  maxBinaryVersion,
  rollout,
  file: path.basename(bundleAbs),
  md5,
  size: bytes.length,
  hermes: isHermes,
  builtAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(distDir, 'release.json'), JSON.stringify(release, null, 2));

console.log('\n✅ 构建完成');
console.log(`   产物  ：${path.relative(rootDir, bundleAbs)}`);
console.log(`   形态  ：${isHermes ? 'Hermes 字节码' : 'JS 源包'}`);
console.log(`   大小  ：${bytes.length} 字节`);
console.log(`   MD5   ：${md5}`);
console.log(`   元数据：${path.relative(rootDir, path.join(distDir, 'release.json'))}`);
