#!/usr/bin/env node
/**
 * 把 sitemap 里的 URL 提交给 IndexNow（Bing / Yandex / Seznam / Naver 等）。
 * Google 不使用 IndexNow，仍需在 Search Console 提交 sitemap。
 *
 * 用法：node scripts/indexnow.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://creatememori.blog';
const keyName = 'a3d282fd8fba43b3967247aa12d24f33';
const keyFile = `${keyName}.txt`;
const key = fs.readFileSync(path.join(ROOT, keyFile), 'utf8').trim();
const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());

if (key !== keyName) throw new Error('IndexNow key 内容不匹配');
if (!urls.length) throw new Error('sitemap 没有 URL');

const payload = {
  host: 'creatememori.blog',
  key,
  keyLocation: `${SITE}/${keyFile}`,
  urlList: urls,
};

try {
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });
  console.log(`IndexNow: ${response.status} ${urls.length} URLs`);
  if (![200, 202].includes(response.status)) console.warn(`IndexNow 返回 ${response.status}，不阻断构建`);
} catch (error) {
  console.warn(`IndexNow 请求失败（不阻断构建）：${error.message}`);
}
