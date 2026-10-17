#!/usr/bin/env node
/**
 * 把 `packages/rn-app/dist/` 的产物发布到发版后端（`POST /admin/releases`）。
 *
 * 用法（仓库根目录）：
 *   $env:OTA_SERVER_URL  = "http://localhost:8080"
 *   $env:OTA_ADMIN_TOKEN = "dev-token"
 *   node scripts/publish-bundle.mjs
 *
 * 环境变量：
 *   OTA_SERVER_URL    后端地址（默认 http://localhost:8080）
 *   OTA_ADMIN_TOKEN   管理令牌（后端未配置 ADMIN_TOKEN 时可留空）
 *   OTA_DESCRIPTION   发布说明（可选）
 *   OTA_FINGERPRINT   原生工程指纹（可选，P2 启用）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const distDir = path.join(rootDir, 'packages', 'rn-app', 'dist');

const serverUrl = (process.env.OTA_SERVER_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
const adminToken = process.env.OTA_ADMIN_TOKEN ?? '';

const metaPath = path.join(distDir, 'release.json');
if (!fs.existsSync(metaPath)) {
  console.error('✗ 未找到 dist/release.json，请先执行：node scripts/build-bundle.mjs');
  process.exit(1);
}
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

const filePath = path.join(distDir, meta.file);
if (!fs.existsSync(filePath)) {
  console.error(`✗ 未找到产物文件：${filePath}`);
  process.exit(1);
}

const form = new FormData();
form.append('appKey', meta.appKey);
form.append('platform', meta.platform);
form.append('renderer', meta.renderer);
form.append('version', meta.version);
form.append('entry', meta.entry);
form.append('description', process.env.OTA_DESCRIPTION ?? '');
form.append('minBinaryVersion', String(meta.minBinaryVersion));
form.append('maxBinaryVersion', String(meta.maxBinaryVersion));
form.append('fingerprint', process.env.OTA_FINGERPRINT ?? '');
form.append('rollout', String(meta.rollout));
form.append(
  'file',
  new Blob([fs.readFileSync(filePath)], { type: 'application/octet-stream' }),
  meta.file,
);

const headers = adminToken ? { Authorization: `Bearer ${adminToken}` } : {};

console.log(`▶ 发布到 ${serverUrl}/admin/releases`);
console.log(
  `  appKey=${meta.appKey} platform=${meta.platform} renderer=${meta.renderer} version=${meta.version}`,
);

const response = await fetch(`${serverUrl}/admin/releases`, {
  method: 'POST',
  headers,
  body: form,
});
const text = await response.text();
if (!response.ok) {
  console.error(`✗ 发布失败（HTTP ${response.status}）：${text}`);
  process.exit(1);
}

const payload = JSON.parse(text);
console.log('\n✅ 发布成功');
console.log(`   versionCode : ${payload.release.versionCode}`);
console.log(`   md5         : ${payload.release.md5}`);
console.log(`   manifestUrl : ${payload.manifestUrl}`);
console.log('\n客户端检查更新（原生 versionCode 落在兼容区间内时）：');
console.log(`   ${payload.manifestUrl}`);
