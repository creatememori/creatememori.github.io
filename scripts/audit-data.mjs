#!/usr/bin/env node
/**
 * 创忆录资源站数据巡检
 *
 * 用法：
 *   node scripts/audit-data.mjs
 *   node scripts/audit-data.mjs --links
 *
 * --links 会并发请求 ITEMS 里的外链，检查 4xx/5xx 与超时。
 * 默认只做本地数据检查，不访问网络。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

const itemsMatch = html.match(/var ITEMS=([\s\S]*?);\s*\n\s*\/\* -- 子节：基础映射表/);
if (!itemsMatch) {
  console.error('未找到 ITEMS 数据块，请确认 index.html 结构未被整体重写。');
  process.exit(1);
}

let items;
try {
  items = Function(`return (${itemsMatch[1]});`)();
} catch (error) {
  console.error('ITEMS 解析失败：' + error.message);
  process.exit(1);
}

const today = new Date();
today.setHours(0, 0, 0, 0);

function parseDeadline(value) {
  if (!value) return null;
  let match = String(value).match(/(202\d)-(\d{1,2})-(\d{1,2})/);
  if (match) return new Date(+match[1], +match[2] - 1, +match[3]);
  match = String(value).match(/(\d{1,2}) 月 (\d{1,2}) 日/);
  if (match) return new Date(2026, +match[1] - 1, +match[2]);
  return null;
}

function daysLeft(deadline) {
  if (!deadline) return null;
  return Math.round((deadline - today) / 86400000);
}

function titleKey(title) {
  return String(title)
    .toLowerCase()
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[\s\-—_·:：,，.。\/\\]/g, '');
}

const subcatMatch = html.match(/var SUBCAT=([\s\S]*?);\s*\n\s*var SUB_FALLBACK/);
const fallbackMatch = html.match(/var SUB_FALLBACK=([\s\S]*?);\s*\n/);
let subcat = {};
let fallback = {};
try {
  if (subcatMatch) subcat = Function(`return (${subcatMatch[1]});`)();
  if (fallbackMatch) fallback = Function(`return (${fallbackMatch[1]});`)();
} catch (error) {
  console.error('子分类映射解析失败：' + error.message);
  process.exit(1);
}

const rows = items.map((item, index) => ({
  index,
  title: item[0],
  category: item[1],
  sub: subcat[item[0]] || fallback[item[1]] || '其他',
  date: item[2],
  period: item[3],
  heat: item[4],
  status: item[5],
  url: item[7],
  deadline: item[8],
  dl: parseDeadline(item[8]),
  left: daysLeft(parseDeadline(item[8])),
}));

const dates = [...new Set(rows.map((row) => row.date))].sort();
const categories = [...new Set(rows.map((row) => row.category))];
const subPairs = new Set(rows.map((row) => `${row.category}/${row.sub}`));

const titleGroups = new Map();
for (const row of rows) {
  const key = titleKey(row.title);
  if (!titleGroups.has(key)) titleGroups.set(key, []);
  titleGroups.get(key).push(row);
}
const duplicateGroups = [...titleGroups.values()].filter((group) => group.length > 1);

const expiredConflicts = rows.filter((row) => row.left !== null && row.left < 0 && ['有效', '即将过期'].includes(row.status));

const missingUrl = rows.filter((row) => !row.url);
const duplicateUrls = [...rows.reduce((map, row) => {
  if (!row.url) return map;
  map.set(row.url, (map.get(row.url) || 0) + 1);
  return map;
}, new Map()).entries()].filter(([, count]) => count > 1);

console.log('创忆录数据巡检');
console.log('─'.repeat(48));
console.log(`条目：${rows.length} 条`);
console.log(`日期：${dates[0]} ～ ${dates[dates.length - 1]}（${dates.length} 个有数据日期）`);
console.log(`大类：${categories.length} 个`);
console.log(`子分类组合：${subPairs.size} 个`);
console.log(`标题重复组：${duplicateGroups.length} 组（${duplicateGroups.reduce((sum, group) => sum + group.length, 0)} 条）`);
console.log(`源数据状态与截止日冲突：${expiredConflicts.length} 条（页面运行时已自动归正为“已过期”）`);
console.log(`缺少链接：${missingUrl.length} 条；链接重复：${duplicateUrls.length} 个`);
console.log(`今天：${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);

if (duplicateGroups.length) {
  console.log('\n标题重复组：');
  for (const group of duplicateGroups) {
    console.log(`- ${group[0].title}`);
    console.log(`  ${group.map((row) => `${row.category}（${row.date}）`).join(' / ')}`);
  }
}

if (expiredConflicts.length) {
  console.log('\n源数据待清理状态：');
  for (const row of expiredConflicts) {
    console.log(`- ${row.title}：源状态「${row.status}」，截止 ${row.deadline}，已过 ${Math.abs(row.left)} 天；页面显示为「已过期」`);
  }
}

if (missingUrl.length) {
  console.log('\n缺少链接：');
  for (const row of missingUrl) console.log(`- ${row.title}（${row.category}）`);
}

if (process.argv.includes('--links')) {
  const unique = [...new Set(rows.map((row) => row.url).filter(Boolean))];
  const results = [];
  const concurrency = 6;
  let cursor = 0;

  async function check(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; MEMORI data audit)' },
      });
      results.push({ url, status: response.status, ok: response.ok });
    } catch (error) {
      results.push({ url, status: 0, ok: false, error: error.name === 'AbortError' ? 'timeout' : error.message });
    } finally {
      clearTimeout(timer);
    }
  }

  async function worker() {
    while (cursor < unique.length) {
      const index = cursor++;
      await check(unique[index]);
      if ((index + 1) % 50 === 0) console.log(`  已检查 ${index + 1}/${unique.length}`);
    }
  }

  console.log(`\n外链检查：${unique.length} 个 URL（并发 ${concurrency}，超时 10s）`);
  await Promise.all(Array.from({ length: concurrency }, worker));
  const bad = results.filter((result) => !result.ok);
  console.log(`\n外链结果：${unique.length - bad.length} 正常，${bad.length} 异常`);
  for (const result of bad) {
    console.log(`- ${result.status || result.error} ${result.url}`);
  }
}

console.log('\n完成。');
