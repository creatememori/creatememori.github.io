#!/usr/bin/env node
/**
 * 创忆录统一站点发布门禁。
 *
 * 检查范围：
 *   - library.html 是唯一数据源，静态卡片与 ITEMS 数量一致
 *   - 首页、资源库、分类页、更新页、RSS、sitemap 的 canonical / 内链 / 文件齐全
 *   - 不允许回到 github.io 双 canonical
 *
 * 运行：node scripts/guard-site.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://creatememori.blog';
const filePath = (name) => path.join(ROOT, name);
const exists = (name) => fs.existsSync(filePath(name));
const read = (name) => fs.readFileSync(filePath(name), 'utf8');
const count = (text, re) => (text.match(re) || []).length;

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const fail = (name, detail = '') => check(name, false, detail);

const required = [
  'index.html',
  'library.html',
  'seo.css',
  'logo.png',
  'logo-light.png',
  'og-cover.png',
  'robots.txt',
  'sitemap.xml',
  'feed.xml',
  '404.html',
  'CNAME',
  'demo-data.js',
  '.nojekyll',
  'README.md',
  'MUSE_UPDATE_RULES.md',
  'scripts/build-seo.mjs',
  'scripts/audit-data.mjs',
  'scripts/guard-site.mjs',
  'scripts/indexnow.mjs',
  'c/index.html',
  'updates/index.html',
  'a3d282fd8fba43b3967247aa12d24f33.txt',
];
required.forEach((name) => check(`必需文件：${name}`, exists(name)));

const library = read('library.html');
const landing = read('index.html');
const robots = read('robots.txt');
const sitemap = read('sitemap.xml');
const feed = read('feed.xml');
const demo = read('demo-data.js');
const cname = read('CNAME').trim();
const readme = read('README.md');
const rules = read('MUSE_UPDATE_RULES.md');

const itemsMatch = library.match(/var ITEMS=(\[[\s\S]*?\n\]);/);
const catMatch = library.match(/var CAT_ORDER=(\[[^\]]*\]);/);
const subMatch = library.match(/var SUBCAT=\{([\s\S]*?)\n\};/);
const fallbackMatch = library.match(/var SUB_FALLBACK=(\{.*?\});/);
if (!itemsMatch || !catMatch || !subMatch) {
  fail('数据源结构', 'library.html 缺少 ITEMS / CAT_ORDER / SUBCAT');
}
let items = [];
let categories = [];
let subMap = {};
let fallbackMap = {};
try {
  if (itemsMatch) items = vm.runInNewContext(itemsMatch[1]);
  if (catMatch) categories = vm.runInNewContext(catMatch[1]);
  if (subMatch) subMap = vm.runInNewContext(`({${subMatch[1]}})`);
  if (fallbackMatch) fallbackMap = vm.runInNewContext(`(${fallbackMatch[1]})`);
} catch (error) {
  fail('数据源解析', error.message);
}
const total = items.length;
const staticCards = count(library, /<article class="card">/g);
const subCount = new Set(items.map((item) => `${item[1]}/${subMap[item[0]] || fallbackMap[item[1]] || '其他'}`)).size;

check('数据源：至少 900 条', total >= 900, `items=${total}`);
check('数据源：12 个一级分类', categories.length === 12, `categories=${categories.length}`);
check('数据源：静态卡片与 ITEMS 一致', staticCards === total, `cards=${staticCards} items=${total}`);
check('数据源：唯一事实源标记', library.includes('MUSE:DATA-SOURCE'), 'MUSE:DATA-SOURCE');
check('数据源：使用 DATA-ONLY 边界', library.includes('MUSE:DATA-ONLY'), 'MUSE:DATA-ONLY');

check('资源库 canonical', library.includes('<link rel="canonical" href="https://creatememori.blog/library.html">'));
check('资源库 H1 含创忆录', /<h1 class="brand-name">创忆录/.test(library));
check('资源库标题含资源库', /<title>创忆录资源库｜\d+ 条/.test(library), 'title');
check('资源库主题索引', library.includes('id="topicIndex"') && library.includes('BUILD:TOPIC-GRID:START'));
check('资源库分类入口 12 个', count(library, /<a class="topic-card"/g) === 12, `count=${count(library, /<a class="topic-card"/g)}`);
check('资源库 RSS 发现链接', library.includes('rel="alternate" type="application/rss+xml"'));

check('介绍页 canonical', landing.includes('<link rel="canonical" href="https://creatememori.blog/">'));
check('介绍页标题', /<title>创忆录 MEMORI｜免费资源、AI 工具与设计灵感库<\/title>/.test(landing));
check('介绍页类别入口 12 个', count(landing, /<div class="feature-proof category-proof"[\s\S]*?<\/div>/g) === 1 && count(landing, /<a href="\/c\/[^"]+">/g) >= 12, `count=${count(landing, /<a href="\/c\/[^"]+">/g)}`);
check('介绍页不把 github.io 当入口', !landing.includes('href="https://creatememori.github.io/'), 'old entry link');
check('介绍页 RSS 发现链接', landing.includes('rel="alternate" type="application/rss+xml"'));

const categoryFiles = categories.map((name) => {
  const slug = {
    '免费资源': 'free-resources', '网页动效': 'web-motion', '排版网站': 'typography',
    'YouTube 选题': 'youtube-topics', '前端·AI': 'frontend-ai', 'AI 实战': 'ai-workflows',
    '黑科技工具': 'tools', '视频创作': 'video-creation', '科学可视化': 'sci-vis',
    '学习成长': 'learning', '设计素材': 'design-assets', '前沿追踪': 'frontier',
  }[name];
  return slug ? `c/${slug}.html` : null;
});
categoryFiles.forEach((name) => {
  if (!name) return;
  check(`分类页：${name}`, exists(name));
  if (exists(name)) {
    const page = read(name);
    check(`分类页 canonical：${name}`, page.includes('<link rel="canonical" href="https://creatememori.blog/'));
  }
});
check('分类索引页', exists('c/index.html'));

const updateFiles = [...new Set(items.map((item) => {
  const match = String(item[2]).match(/^(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  return `updates/${new Date().getFullYear()}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}.html`;
}).filter(Boolean))];
updateFiles.forEach((name) => check(`更新日页：${name}`, exists(name)));
check('更新日志索引', exists('updates/index.html'));

check('CNAME', cname === 'creatememori.blog', `value=${cname}`);
check('robots 指向 blog sitemap', robots.includes('Sitemap: https://creatememori.blog/sitemap.xml'));
check('robots 不再指向 github.io', !robots.includes('creatememori.github.io'));
check('sitemap 是 urlset', sitemap.includes('<urlset') && sitemap.includes('</urlset>'));
check('sitemap 含首页和资源库', sitemap.includes('<loc>https://creatememori.blog/</loc>') && sitemap.includes('<loc>https://creatememori.blog/library.html</loc>'));
check('sitemap 含分类索引和更新日志', sitemap.includes('<loc>https://creatememori.blog/c/</loc>') && sitemap.includes('<loc>https://creatememori.blog/updates/</loc>'));
check('sitemap 含 12 个分类', categoryFiles.filter(Boolean).every((name) => sitemap.includes(`<loc>https://creatememori.blog/${name}</loc>`)), `files=${categoryFiles.length}`);
check('sitemap 含全部更新日', updateFiles.every((name) => sitemap.includes(`<loc>https://creatememori.blog/${name}</loc>`)), `days=${updateFiles.length}`);
check('sitemap URL 数 >= 27', count(sitemap, /<url>/g) >= 27, `count=${count(sitemap, /<url>/g)}`);
const latestDate = items.reduce((latest, item) => {
  const match = String(item[2]).match(/^(\d{1,2})-(\d{1,2})$/);
  if (!match) return latest;
  const iso = `${new Date().getFullYear()}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
  return iso > latest ? iso : latest;
}, '');
check('sitemap 含最新数据日期', sitemap.includes(`<lastmod>${latestDate}</lastmod>`), `latest=${latestDate}`);

check('RSS 根节点', feed.startsWith('<?xml') && feed.includes('<rss version="2.0"'));
check('RSS 条目 50 条', count(feed, /<item>/g) === Math.min(50, total), `count=${count(feed, /<item>/g)}`);
check('RSS 指向更新日志', feed.includes('<link>https://creatememori.blog/updates/</link>'));
check('RSS 含 atom:self', feed.includes('rel="self"'));

let demoMeta = null;
try {
  const match = demo.match(/window\.MEMORI_DEMO = ([\s\S]*);/);
  demoMeta = JSON.parse(match[1]);
} catch (error) {
  fail('demo-data 解析', error.message);
}
check('demo-data 条数', demoMeta?.meta?.total === total, `demo=${demoMeta?.meta?.total} total=${total}`);
check('demo-data 演示 96 条', demoMeta?.items?.length === 96, `demoItems=${demoMeta?.items?.length}`);
check('demo-data 分类带 slug', demoMeta?.meta?.categories?.every((entry) => entry.slug), 'categories');

check('IndexNow key 内容正确', read('a3d282fd8fba43b3967247aa12d24f33.txt').trim() === 'a3d282fd8fba43b3967247aa12d24f33');
check('logo 外部文件', library.includes('src="logo.png"') || library.includes('href="logo.png"'));
check('OG 封面存在尺寸', exists('og-cover.png'));
check('seo.css 可读', exists('seo.css') && read('seo.css').length > 1000);
check('README 指向新构建流程', readme.includes('build-seo.mjs') && readme.includes('guard-site.mjs'));
check('更新守则指向新构建流程', rules.includes('build-seo.mjs') && rules.includes('guard-site.mjs'));
check('更新守则说明唯一事实源', rules.includes('library.html') && rules.includes('唯一事实源'));
check('资源库体积合理', library.length > 500000 && library.length < 3000000, `chars=${library.length}`);
check('介绍页体积合理', landing.length > 50000 && landing.length < 300000, `chars=${landing.length}`);
check('404 为 noindex', read('404.html').includes('name="robots" content="noindex,follow"'));

const failed = checks.filter((entry) => !entry.ok);
const passed = checks.length - failed.length;
console.log(`\nSite guard: ${passed} passed, ${failed.length} failed`);
console.log(`items=${total} categories=${categories.length} subcategories=${subCount} staticCards=${staticCards} sitemapUrls=${count(sitemap, /<url>/g)}`);
checks.forEach((entry) => {
  if (!entry.ok || process.argv.includes('--verbose')) {
    console.log(`${entry.ok ? 'PASS' : 'FAIL'} ${entry.name}${entry.detail ? ` (${entry.detail})` : ''}`);
  }
});
if (failed.length) {
  console.error(`\nFAIL: ${failed.length} 项发布门禁未通过。先运行 node scripts/build-seo.mjs，再按 MUSE_UPDATE_RULES.md 修正。`);
  process.exitCode = 1;
} else {
  console.log('\nPASS: 统一站点结构完整，可以发布。');
}
