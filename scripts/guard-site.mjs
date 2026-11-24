#!/usr/bin/env node
/**
 * 创忆录资源站更新门禁。
 * 目的：防止 Muse 或其他自动更新在追加 ITEMS 时重写模板、固定日期、
 * 内联 CSS/JS、删除 SEO/无障碍/静态介绍。
 *
 * 运行：node scripts/guard-site.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const filePath = (name) => path.join(root, name);
const exists = (name) => fs.existsSync(filePath(name));
const read = (name) => fs.readFileSync(filePath(name), 'utf8');
const size = (name) => fs.statSync(filePath(name)).size;
const has = (haystack, needle) => haystack.indexOf(needle) !== -1;
const count = (text, re) => (text.match(re) || []).length;

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });

const required = [
  'index.html',
  'memori-dimensions.css',
  'memori-dimensions.js',
  'logo.png',
  'og-cover.png',
  'robots.txt',
  'sitemap.xml',
  '.nojekyll',
  'README.md',
  'MUSE_UPDATE_RULES.md',
  'scripts/audit-data.mjs',
  'a3d282fd8fba43b3967247aa12d24f33.txt'
];
required.forEach((name) => check(`必需文件：${name}`, exists(name)));

const html = read('index.html');
const css = read('memori-dimensions.css');
const js = read('memori-dimensions.js');
const robots = read('robots.txt');
const sitemap = read('sitemap.xml');
const readme = read('README.md');
const rules = read('MUSE_UPDATE_RULES.md');
const keyName = 'a3d282fd8fba43b3967247aa12d24f33.txt';
const key = read(keyName).trim();

const title = '创忆录 MEMORI｜免费资源、信息差与创作灵感每日更新';
const description = '创忆录是每日更新的免费资源与信息差情报库，收录免费额度、限时机会、前沿工具、AI 实战、网页动效与设计素材，按分类、状态、热度筛选，帮你快速找到仍然有效的好东西。';

check('MUSE:APPEND-ONLY 标记至少 2 处', count(html, /MUSE:APPEND-ONLY/g) >= 2, `count=${count(html, /MUSE:APPEND-ONLY/g)}`);
check('HTML lang', has(html, '<html lang="zh-CN"'));
check('title 未变', has(html, `<title>${title}</title>`));
check('description 未变', has(html, `<meta name="description" content="${description}">`));
check('canonical 未变', has(html, '<link rel="canonical" href="https://creatememori.github.io/">'));
check('OG 封面未变', has(html, '<meta property="og:image" content="https://creatememori.github.io/og-cover.png">'));
check('JSON-LD @graph', has(html, '<script type="application/ld+json">') && has(html, '"@graph"'));
check('JSON-LD FAQPage', has(html, '"@type": "FAQPage"'));
check('外部 CSS 引用', has(html, '<link rel="stylesheet" href="memori-dimensions.css'));
check('外部 JS 引用', has(html, '<script src="memori-dimensions.js'));

const dataImages = [html, css, js].reduce((n, text) => n + count(text, /data:image/g), 0);
check('无 data:image / base64 内联', dataImages === 0, `count=${dataImages}`);

const dynamicToday = count(html, /var TODAY=new Date\(\); TODAY\.setHours\(0,0,0,0\);/g);
check('TODAY 运行时动态（至少 2 处）', dynamicToday >= 2, `count=${dynamicToday}`);
check('TODAY 未被固定为年份', !/var TODAY=new Date\(20\d{2}/.test(html));
check('未写死 2026-10-22 基准日', !/new Date\(2026,\s*10,\s*22\)/.test(html));

check('syncDateMeta 存在', has(html, 'function syncDateMeta('));
check('calendarHtml 存在', has(html, 'function calendarHtml('));
check('statsHtml 存在', has(html, 'function statsHtml('));
check('taxonomySubCount 存在', has(html, 'function taxonomySubCount('));
check('subsFor 存在', has(html, 'function subsFor('));
check('热度面板使用 DATE_LIST', has(html, 'var days=DATE_LIST.slice();'));

const expectedCats = ['免费资源', '网页动效', '排版网站', 'YouTube 选题', '前端·AI', 'AI 实战', '黑科技工具', '视频创作', '科学可视化', '学习成长', '设计素材', '前沿追踪'];
const catMatch = html.match(/var CAT_ORDER=\[([^\]]*)\];/);
const categories = catMatch ? [...catMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
check('12 个一级分类未变', categories.length === 12 && expectedCats.every((cat) => categories.includes(cat)), `count=${categories.length}`);

const itemsStart = html.indexOf('var ITEMS=[');
const itemsEnd = html.indexOf('var SUBCAT={');
const itemsRegion = itemsStart !== -1 && itemsEnd > itemsStart ? html.slice(itemsStart, itemsEnd) : '';
const itemCount = count(itemsRegion, /^\s*\["/gm);
check('ITEMS 条目数不少于 618', itemCount >= 618, `count=${itemCount}`);

const visibleText = html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z#0-9]+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();
check('静态可见文字不少于 1200 字符', visibleText.length >= 1200, `chars=${visibleText.length}`);

check('HTML 体积未超 2MB（静态 HTML 架构，见 MUSE_UPDATE_RULES.md）', size('index.html') <= 2000000, `bytes=${size('index.html')}`);

const staticCards = count(html, /<article class="card">/g);
check('静态 HTML 卡片数与 ITEMS 一致（Bing SEO）', staticCards >= itemCount, `cards=${staticCards} items=${itemCount}`);

check('viewTabs 为 group', /id="viewTabs"[^>]*role="group"/.test(html));
check('筛选面板为 dialog', /id="deckFilters"[^>]*role="dialog"/.test(html));
check('panelClose 存在', has(html, 'id="panelClose"'));
check('aboutHeading 存在', has(html, 'id="aboutHeading"'));
check('skip link 存在', has(html, 'class="skip-link"'));
check('可见 FAQ 存在', has(html, '创忆录是什么？'));
check('aria-pressed 逻辑存在', has(js, 'aria-pressed') || has(html, 'aria-pressed'));
check('未回退为 tablist', !has(html, 'role="tablist"'));
check('logo 使用外部文件', has(html, 'src="logo.png"') || has(html, 'href="logo.png"'));

check('robots 指向 sitemap', has(robots, 'User-agent: *') && has(robots, 'Sitemap: https://creatememori.github.io/sitemap.xml'));
check('sitemap 含首页', has(sitemap, '<urlset') && has(sitemap, '<loc>https://creatememori.github.io/</loc>'));
check('sitemap 含 OG 图', has(sitemap, 'og-cover.png'));
check('IndexNow key 内容正确', key === keyName.replace(/\.txt$/, ''), `content=${key}`);
check('logo 尺寸合理', size('logo.png') > 1000 && size('logo.png') < 20000, `bytes=${size('logo.png')}`);
check('OG 封面尺寸合理', size('og-cover.png') > 50000 && size('og-cover.png') < 400000, `bytes=${size('og-cover.png')}`);
check('CSS 未被异常放大', size('memori-dimensions.css') < 100000, `bytes=${size('memori-dimensions.css')}`);
check('JS 未被异常放大', size('memori-dimensions.js') < 100000, `bytes=${size('memori-dimensions.js')}`);
check('README 指向更新守则', has(readme, 'MUSE_UPDATE_RULES.md') && has(readme, 'guard-site.mjs'));
check('更新守则包含 APPEND-ONLY', has(rules, 'APPEND-ONLY') && has(rules, 'guard-site.mjs'));
check('CSS 粉色强调未变', has(css, '#db2777') || has(css, 'var(--accent)'));

const failed = checks.filter((c) => !c.ok);
const passed = checks.length - failed.length;
console.log(`\nSite guard: ${passed} passed, ${failed.length} failed`);
console.log(`items=${itemCount}  staticText=${visibleText.length}  htmlBytes=${size('index.html')}`);
checks.forEach((c) => {
  if (!c.ok || process.argv.includes('--verbose')) {
    console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` (${c.detail})` : ''}`);
  }
});

if (failed.length) {
  console.error(`\nFAIL: ${failed.length} 项更新边界被破坏。请按 MUSE_UPDATE_RULES.md 恢复后再提交。`);
  process.exitCode = 1;
} else {
  console.log('\nPASS: 更新边界完整。');
}
