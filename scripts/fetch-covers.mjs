import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIBRARY_FILE = path.join(ROOT, 'library.html');
const COVERS_FILE = path.join(ROOT, 'content', 'covers.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

const hashText = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};
const itemId = (item) => `i-${hashText(`${item.title}|${item.date}|${item.period}|${item.cat}`)}`;

const decode = (value) => String(value || '')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

const findImage = (html, pageUrl) => {
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metas) {
    if (!/(og:image|og:image:secure_url|twitter:image)/i.test(tag)) continue;
    const content = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!content) continue;
    try {
      const src = new URL(decode(content), pageUrl).href;
      if (/^https?:\/\//i.test(src)) return src;
    } catch {}
  }
  return '';
};

const parseItems = () => {
  const html = fs.readFileSync(LIBRARY_FILE, 'utf8');
  const itemsMatch = html.match(/var ITEMS=(\[[\s\S]*?\n\]);/);
  const subMatch = html.match(/var SUBCAT=\{([\s\S]*?)\n\};/);
  const fallbackMatch = html.match(/var SUB_FALLBACK=(\{.*?\});/);
  if (!itemsMatch || !subMatch || !fallbackMatch) throw new Error('无法解析 ITEMS');
  const raw = vm.runInNewContext(itemsMatch[1]);
  const subMap = vm.runInNewContext(`({${subMatch[1]}})`);
  const fallbackMap = vm.runInNewContext(`(${fallbackMatch[1]})`);
  return raw.map((item) => ({
    id: itemId({ title: String(item[0] || ''), date: String(item[2] || ''), period: String(item[3] || ''), cat: String(item[1] || '') }),
    title: String(item[0] || ''),
    cat: String(item[1] || ''),
    sub: String(subMap[item[0]] || fallbackMap[item[1]] || '其他'),
    url: String(item[7] || ''),
  })).filter((item) => item.url);
};

const existing = fs.existsSync(COVERS_FILE) ? JSON.parse(fs.readFileSync(COVERS_FILE, 'utf8')) : {};
const items = parseItems();
const limit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 0);
const targets = (limit ? items.slice(0, limit) : items).filter((item) => !existing[item.id]?.src);
const results = { ...existing };
let cursor = 0;
let ok = 0;
let failed = 0;

const worker = async () => {
  while (cursor < targets.length) {
    const item = targets[cursor++];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(item.url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const src = findImage(html, item.url);
      if (src) {
        results[item.id] = {
          src,
          alt: `${item.title} 的官方预览图`,
          credit: new URL(item.url).hostname.replace(/^www\./, ''),
        };
        ok += 1;
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;
    }
    if ((ok + failed) % 25 === 0) console.log(`covers ${ok + failed}/${targets.length} · ok ${ok} · skip ${failed}`);
  }
};

await Promise.all(Array.from({ length: 10 }, worker));
fs.mkdirSync(path.dirname(COVERS_FILE), { recursive: true });
fs.writeFileSync(COVERS_FILE, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
console.log(`covers done: ${ok} found / ${failed} skipped / ${Object.keys(results).length} total`);
