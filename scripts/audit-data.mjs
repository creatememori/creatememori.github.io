#!/usr/bin/env node
/**
 * 创忆录资源库数据巡检（唯一事实源：library.html）
 *
 * 用法：
 *   node scripts/audit-data.mjs
 *   node scripts/audit-data.mjs --links
 *
 * --links 会并发检查 ITEMS 外链，默认只做本地检查。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'library.html');
const DETAILS_DIR = path.join(ROOT, 'content', 'items');
const ITEMS_DIR = path.join(ROOT, 'items');
const html = fs.readFileSync(FILE, 'utf8');

const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

const itemsMatch = html.match(/var ITEMS=(\[[\s\S]*?\n\]);/);
const catMatch = html.match(/var CAT_ORDER=(\[[^\]]*\]);/);
const subMatch = html.match(/var SUBCAT=\{([\s\S]*?)\n\};/);
const fallbackMatch = html.match(/var SUB_FALLBACK=(\{.*?\});/);
if (!itemsMatch || !catMatch || !subMatch || !fallbackMatch) {
  console.error('无法解析 ITEMS / CAT_ORDER / SUBCAT / SUB_FALLBACK；请确认 library.html 的结构。');
  process.exit(1);
}

let items;
let categories;
let subMap;
let fallbackMap;
try {
  items = vm.runInNewContext(itemsMatch[1]);
  categories = vm.runInNewContext(catMatch[1]);
  subMap = vm.runInNewContext(`({${subMatch[1]}})`);
  fallbackMap = vm.runInNewContext(`(${fallbackMatch[1]})`);
} catch (error) {
  console.error(`数据解析失败：${error.message}`);
  process.exit(1);
}

if (!Array.isArray(items) || !items.length) fail('ITEMS 为空');
if (!Array.isArray(categories) || categories.length !== 12) fail(`CAT_ORDER 应为 12 类，当前 ${categories?.length}`);
if (items.length !== categories.reduce((sum, name) => sum + items.filter((item) => item[1] === name).length, 0)) fail('存在不在 CAT_ORDER 中的分类');

const staticCards = (html.match(/<article class="card">/g) || []).length;
if (staticCards !== items.length) fail(`静态卡片 ${staticCards} 条，与 ITEMS ${items.length} 条不一致；JS 不可用时会缺内容`);

const hashText = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};
const itemId = (item) => `i-${hashText(`${String(item[0])}|${String(item[2])}|${String(item[3])}|${String(item[1])}`)}`;
const DETAIL_TYPES = new Set(['lead', 'paragraph', 'highlights', 'steps', 'callout', 'quote', 'image', 'gallery']);
const countChinese = (value) => (String(value).match(/[\u4e00-\u9fff]/g) || []).length;
const detailFiles = fs.existsSync(DETAILS_DIR) ? fs.readdirSync(DETAILS_DIR).filter((name) => name.endsWith('.json')) : [];
const detailPageFiles = fs.existsSync(ITEMS_DIR) ? fs.readdirSync(ITEMS_DIR).filter((name) => name.endsWith('.html')) : [];
let thinDetails = 0;
let badDetailShape = 0;
let missingDetailPages = 0;
let missingDetails = 0;
let detailImageIssues = 0;
let minDetailChars = Infinity;
const detailIds = new Set();

for (const item of items) {
  const id = itemId(item);
  const detailPath = path.join(DETAILS_DIR, `${id}.json`);
  const pagePath = path.join(ITEMS_DIR, `${id}.html`);
  if (!fs.existsSync(detailPath)) {
    missingDetails += 1;
    continue;
  }
  if (!fs.existsSync(pagePath)) missingDetailPages += 1;
  if (detailIds.has(id)) fail(`详情 ID 重复：${id}`);
  detailIds.add(id);
  let detail;
  try {
    detail = JSON.parse(fs.readFileSync(detailPath, 'utf8'));
  } catch (error) {
    fail(`详情 JSON 解析失败：${id} / ${error.message}`);
    continue;
  }
  if (!detail.summary || String(detail.summary).length < 8) {
    badDetailShape += 1;
    fail(`详情摘要过短：${id}`);
  }
  if (!Array.isArray(detail.blocks) || detail.blocks.length < 3) {
    badDetailShape += 1;
    fail(`详情内容块不足 3 个：${id}`);
  }
  const text = (detail.blocks || []).flatMap((block) => {
    if (block.type === 'highlights' || block.type === 'steps') return [block.title || '', ...(block.items || [])];
    if (block.type === 'gallery') return (block.images || []).flatMap((image) => [image.alt || '', image.caption || '']);
    return [block.title || '', block.text || '', block.source || '', block.caption || ''];
  }).join(' ');
  if (countChinese(text) < 350) {
    thinDetails += 1;
    fail(`详情正文不足 350 个中文字符：${id}（${countChinese(text)}）`);
  }
  minDetailChars = Math.min(minDetailChars, countChinese(text));
  const raw = fs.readFileSync(detailPath, 'utf8');
  if (/<script|<style|<iframe|javascript:/i.test(raw)) {
    badDetailShape += 1;
    fail(`详情 JSON 包含不允许的 HTML/JavaScript：${id}`);
  }
  for (const block of detail.blocks || []) {
    if (!DETAIL_TYPES.has(block.type)) {
      badDetailShape += 1;
      fail(`详情块类型不允许：${id} / ${block.type}`);
    }
    if ((block.type === 'image' || block.type === 'gallery') && block.src === undefined && !block.images) {
      detailImageIssues += 1;
    }
  }
  if (detail.cover && (!detail.cover.src || !detail.cover.alt)) {
    detailImageIssues += 1;
    fail(`详情封面缺少 src/alt：${id}`);
  }
}

if (detailFiles.length !== items.length) fail(`详情 JSON ${detailFiles.length} 个，与 ITEMS ${items.length} 条不一致`);
if (detailPageFiles.length !== items.length) fail(`详情 HTML ${detailPageFiles.length} 个，与 ITEMS ${items.length} 条不一致`);
if (missingDetails) fail(`${missingDetails} 条没有详情 JSON`);
if (missingDetailPages) fail(`${missingDetailPages} 条没有详情 HTML`);
if (thinDetails) fail(`${thinDetails} 条详情正文不满足 350 字`);
if (badDetailShape) fail(`${badDetailShape} 条详情结构不符合 block 规范`);
if (detailImageIssues) fail(`${detailImageIssues} 条详情图片字段不完整`);

const titleKeys = new Set();
let duplicateTitles = 0;
let emptyUrls = 0;
let invalidDates = 0;
let invalidCats = 0;
const subKeys = new Set();

for (const [index, item] of items.entries()) {
  if (!item[0] || !item[1] || !item[2] || !item[3] || !item[6]) fail(`第 ${index + 1} 条缺少标题/分类/日期/时段/说明`);
  if (!categories.includes(item[1])) invalidCats += 1;
  if (!/^\d{1,2}-\d{1,2}$/.test(String(item[2]))) invalidDates += 1;
  if (!item[7]) emptyUrls += 1;
  const key = String(item[0]).toLowerCase().replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').replace(/[\s\-—_·:：,，.。\/\\]/g, '');
  if (titleKeys.has(key)) duplicateTitles += 1;
  titleKeys.add(key);
  const sub = subMap[item[0]] || fallbackMap[item[1]] || '其他';
  subKeys.add(`${item[1]}/${sub}`);
}

if (invalidCats) fail(`有 ${invalidCats} 条使用了 CAT_ORDER 之外的分类`);
if (invalidDates) fail(`有 ${invalidDates} 条日期格式不是 MM-DD`);
if (emptyUrls) warn(`有 ${emptyUrls} 条没有原始链接，资源库会回退到列表页`);
if (duplicateTitles) warn(`有 ${duplicateTitles} 条重复标题（可能跨分类复用，保留即可）`);

const dated = [];
for (const item of items) {
  const match = String(item[2]).match(/^(\d{1,2})-(\d{1,2})$/);
  if (!match) continue;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = new Date().getFullYear();
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) continue;
  dated.push({ item, date });
}
dated.sort((a, b) => b.date - a.date);
const latest = dated[0];
const earliest = dated[dated.length - 1];

const urlCount = items.filter((item) => item[7]).length;
console.log(`library.html：${items.length} 条，${categories.length} 类，${subKeys.size} 个子分类，${staticCards} 张静态卡片。`);
console.log(`详情页：${detailFiles.length} 个 JSON / ${detailPageFiles.length} 个 HTML；正文最短 ${Number.isFinite(minDetailChars) ? minDetailChars : 0} 字。`);
console.log(`日期范围：${earliest ? earliest.item[2] : '—'} → ${latest ? latest.item[2] : '—'}；带原始链接 ${urlCount} 条。`);

if (warnings.length) {
  console.log('\n提示：');
  warnings.forEach((warning) => console.log(`- ${warning}`));
}
if (errors.length) {
  console.error('\n错误：');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

if (process.argv.includes('--links')) {
  const unique = [...new Set(items.map((item) => item[7]).filter(Boolean))];
  console.log(`\n检查 ${unique.length} 个唯一外链（并发 8，超时 8 秒）…`);
  const results = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < unique.length) {
      const url = unique[cursor++];
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'MEMORI-link-check/1.0' } });
        clearTimeout(timer);
        results.push({ url, status: response.status, ok: response.ok });
      } catch (error) {
        results.push({ url, status: 0, ok: false, error: error.name });
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  const bad = results.filter((entry) => !entry.ok);
  console.log(`外链检查完成：${results.length - bad.length} 正常 / ${bad.length} 异常。`);
  bad.slice(0, 30).forEach((entry) => console.log(`- ${entry.status || entry.error} ${entry.url}`));
  if (bad.length) process.exitCode = 2;
}
