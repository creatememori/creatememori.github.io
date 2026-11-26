import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIBRARY_FILE = path.join(ROOT, 'library.html');
const BUILD_FILE = path.join(ROOT, 'scripts', 'build-seo.mjs');
const DETAILS_DIR = path.join(ROOT, 'content', 'items');
const COVERS_FILE = path.join(ROOT, 'content', 'covers.json');

const hashText = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const itemId = (item) => `i-${hashText(`${item.title}|${item.date}|${item.period}|${item.cat}`)}`;

const cleanText = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .replace(/[\u200b-\u200d\ufeff]/g, '')
  .trim();

const splitSentences = (value) => cleanText(value)
  .split(/(?<=[。！？；;!?])/)
  .map((entry) => entry.trim())
  .filter((entry) => entry.length >= 3);

const firstSentence = (value, max = 96) => {
  const sentence = splitSentences(value)[0] || cleanText(value);
  return sentence.length > max ? `${sentence.slice(0, max - 1)}…` : sentence;
};

const domainOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const parseData = () => {
  const html = fs.readFileSync(LIBRARY_FILE, 'utf8');
  const itemsMatch = html.match(/var ITEMS=(\[[\s\S]*?\n\]);/);
  const catMatch = html.match(/var CAT_ORDER=(\[[^\]]*\]);/);
  const subMatch = html.match(/var SUBCAT=\{([\s\S]*?)\n\};/);
  const fallbackMatch = html.match(/var SUB_FALLBACK=(\{.*?\});/);
  if (!itemsMatch || !catMatch || !subMatch || !fallbackMatch) throw new Error('无法解析 library.html');
  const rawItems = vm.runInNewContext(itemsMatch[1]);
  const categories = vm.runInNewContext(catMatch[1]);
  const subMap = vm.runInNewContext(`({${subMatch[1]}})`);
  const fallbackMap = vm.runInNewContext(`(${fallbackMatch[1]})`);
  return rawItems.map((raw, index) => ({
    index,
    title: cleanText(raw[0]),
    cat: cleanText(raw[1]),
    sub: cleanText(subMap[raw[0]] || fallbackMap[raw[1]] || '其他'),
    date: cleanText(raw[2]),
    period: cleanText(raw[3]),
    heat: cleanText(raw[4]),
    status: cleanText(raw[5] || '有效'),
    desc: cleanText(raw[6]),
    url: cleanText(raw[7]),
    deadline: cleanText(raw[8]),
    id: itemId({ title: cleanText(raw[0]), date: cleanText(raw[2]), period: cleanText(raw[3]), cat: cleanText(raw[1]) }),
  })).filter((item) => item.title && item.cat && item.desc).map((item, index) => ({ ...item, index, categories }));
};

const parseCategoryMeta = () => {
  const text = fs.readFileSync(BUILD_FILE, 'utf8');
  const match = text.match(/const CATEGORY_META = (\{[\s\S]*?\n\});/);
  if (!match) throw new Error('无法解析 CATEGORY_META');
  return vm.runInNewContext(`(${match[1]})`);
};

const countChinese = (value) => (String(value).match(/[\u4e00-\u9fff]/g) || []).length;

const covers = fs.existsSync(COVERS_FILE) ? JSON.parse(fs.readFileSync(COVERS_FILE, 'utf8')) : {};

const buildDetail = (item, meta) => {
  const category = meta[item.cat] || {};
  const intro = category.intro || [];
  const notes = category.notes || [];
  const sentences = splitSentences(item.desc);
  const host = domainOf(item.url);
  const summary = firstSentence(item.desc, 96);
  const sourceLine = item.url
    ? `原始入口在 ${host || '原站'}，收录时标记为「${item.status}」。`
    : `这条目前没有可用的原始链接，收录时标记为「${item.status}」。`;
  const lead = /[。！？!?]$/.test(item.desc) ? item.desc : `${item.desc}。`;
  const highlightItems = [];
  for (const sentence of sentences.slice(1, 3)) {
    if (sentence && sentence !== summary) highlightItems.push(sentence);
  }
  highlightItems.push(`归类在「${item.cat} / ${item.sub}」，${item.date} ${item.period}收录。`);
  highlightItems.push(sourceLine);
  if (highlightItems.length < 3) {
    highlightItems.push(`这条适合先做小范围验证，再决定是否放进长期工作流。`);
  }

  const blocks = [
    { type: 'lead', text: lead },
    {
      type: 'highlights',
      title: '先看这几点',
      items: highlightItems.slice(0, 4),
    },
    {
      type: 'paragraph',
      text: `${intro[0] || `「${item.cat}」是创忆录持续维护的一个主题。`} 这条具体落在「${item.sub}」，不是单独的一条链接，而是放回主题脉络里一起看。`,
    },
    {
      type: 'paragraph',
      text: `${intro[1] || '先判断它和你的当前任务是否匹配，再决定是否花时间深入。'}`,
    },
    {
      type: 'steps',
      title: '怎么用',
      items: notes.length
        ? notes.slice(0, 3).map((note) => `${note[0]} ${note[1]}`)
        : ['01 先打开原始来源，确认页面仍然可访问', '02 核对额度、期限、授权与地区限制', '03 只取当前任务需要的一部分，先做最小验证'],
    },
    {
      type: 'callout',
      tone: 'warn',
      title: '别忽略这一条',
      text: '原站的额度、截止时间、可用地区或授权条款可能随时变化。收录状态只能代表整理时的判断，正式使用前请再核对一次原始页面。',
    },
    {
      type: 'paragraph',
      text: `如果这条和你的项目相关，建议先把它放进「${item.cat}」的待验证清单：先确认原始入口能打开，再用最小成本试一次。需要继续找同类资源时，从详情页右侧的同主题推荐或分类页继续浏览。`,
    },
  ];

  let total = blocks.reduce((sum, block) => {
    if (block.type === 'highlights' || block.type === 'steps') return sum + countChinese([block.title, ...(block.items || [])].join(''));
    return sum + countChinese([block.title, block.text, block.source].join(''));
  }, 0);
  if (total < 350) {
    blocks.push({
      type: 'paragraph',
      text: `这条内容的价值不在于多一个收藏，而在于它能不能进入你现在的流程：先判断是否用得上，再核对来源与限制，最后把真正有用的部分落到项目里。创忆录会继续按主题整理同类资源，方便你回看和比较。`,
    });
    total = blocks.reduce((sum, block) => {
      if (block.type === 'highlights' || block.type === 'steps') return sum + countChinese([block.title, ...(block.items || [])].join(''));
      return sum + countChinese([block.title, block.text, block.source].join(''));
    }, 0);
  }

  const cover = covers[item.id];
  return {
    summary,
    ...(cover?.src ? {
      cover: {
        src: cover.src,
        alt: cover.alt || `${item.title} 的预览图`,
        credit: cover.credit || '创忆录整理',
      },
    } : {}),
    blocks,
  };
};

const main = () => {
  const force = process.argv.includes('--force');
  const items = parseData();
  const meta = parseCategoryMeta();
  fs.mkdirSync(DETAILS_DIR, { recursive: true });
  let created = 0;
  let skipped = 0;
  const seen = new Map();
  for (const item of items) {
    if (seen.has(item.id)) throw new Error(`详情 ID 冲突：${item.id} / ${seen.get(item.id)} / ${item.title}`);
    seen.set(item.id, item.title);
    const file = path.join(DETAILS_DIR, `${item.id}.json`);
    if (!force && fs.existsSync(file)) {
      skipped += 1;
      continue;
    }
    fs.writeFileSync(file, `${JSON.stringify(buildDetail(item, meta), null, 2)}\n`, 'utf8');
    created += 1;
  }
  console.log(`详情内容：新建 ${created}，保留 ${skipped}，总计 ${items.length}。`);
};

main();
