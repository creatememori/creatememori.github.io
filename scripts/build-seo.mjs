#!/usr/bin/env node
/**
 * 创忆录统一站点构建脚本
 *
 * 唯一事实源：library.html 里的 ITEMS / SUBCAT
 * 生成物：
 *   /c/<slug>.html        12 个分类页
 *   /c/index.html         分类总览
 *   /updates/index.html   更新日志
 *   /updates/YYYY-MM-DD.html 每日更新页
 *   /feed.xml             RSS
 *   /sitemap.xml          多 URL sitemap
 *   /demo-data.js         介绍页演示数据
 *   /404.html
 *
 * 用法：node scripts/build-seo.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://creatememori.blog';
const LIBRARY_FILE = path.join(ROOT, 'library.html');
const LANDING_FILE = path.join(ROOT, 'index.html');
const ITEMS_DIR = path.join(ROOT, 'items');
const DETAILS_DIR = path.join(ROOT, 'content', 'items');
const DEMO_PER_CATEGORY = 8;
const DETAIL_BLOCK_TYPES = new Set(['lead', 'paragraph', 'highlights', 'steps', 'callout', 'quote', 'image', 'gallery']);

const now = new Date();
const cstToday = new Date(now.getTime() + 8 * 3600 * 1000);
const TODAY = {
  y: cstToday.getUTCFullYear(),
  m: cstToday.getUTCMonth() + 1,
  d: cstToday.getUTCDate(),
};

const PERIOD_RANK = { 晚: 3, 中午: 2, 早: 1 };
const PERIOD_TIME = { 早: '08:00:00', 中午: '12:00:00', 晚: '20:00:00' };
const PERIOD_ORDER = ['早', '中午', '晚'];
const PERIOD_LABEL = { 早: '早间批次', 中午: '午间批次', 晚: '晚间批次' };

const CATEGORY_META = {
  '免费资源': {
    slug: 'free-resources',
    kicker: 'FREE & CREDITS',
    h1: '免费资源与限时额度｜{count} 条现在还能用的机会',
    title: '免费资源｜{count} 条免费额度、限时试用与开源工具 · 创忆录',
    desc: '创忆录免费资源分类收录 {count} 条免费额度、限时试用、开源工具与学生优惠；每条标注期限、状态与原始来源，先核对限制再使用。',
    lead: '免费额度、限时试用、开源工具与学生优惠。每条都尽量写清期限、限制和原始入口。',
    intro: [
      '这里收的是“现在打开还能用”的免费资源：模型额度、API 试用、开源软件、限时课程、设计工具与学生包。不是把“免费”当标题，而是把额度、期限、绑卡要求和失效状态一起写清楚。',
      '适合想低成本试新工具、做副业验证或给学生项目找资源的人。看到“限时”先看截止日；看到“免费额度”先看用量上限；重要资料先导出，别把免费当永久。',
    ],
    notes: [
      ['01', '先看截止日、是否自动续费、是否需要绑卡'],
      ['02', '核对免费额度、速率限制、商用条款与地区限制'],
      ['03', '优先选有官方定价页或文档可查的项目'],
    ],
    related: ['AI 实战', '设计素材', '学习成长'],
    accent: '#7C5CFF',
  },
  '网页动效': {
    slug: 'web-motion',
    kicker: 'WEB MOTION',
    h1: '网页动效｜{count} 条可复用的交互、滚动与 WebGL 灵感',
    title: '网页动效｜{count} 条 CSS、滚动叙事与 WebGL 交互灵感 · 创忆录',
    desc: '创忆录网页动效分类收录 {count} 条 CSS 动画、滚动叙事、SVG、Canvas 与 WebGL 实验；优先保留能拆结构、能看源码、能落到项目里的案例。',
    lead: 'CSS、滚动叙事、SVG、Canvas 与 WebGL 的交互实验，优先收能拆结构、能看源码、能落到项目里的。',
    intro: [
      '网页动效很容易停在“看起来很酷”。这个分类更关心另一件事：它能不能被拆成结构、看懂实现、放进自己的页面。包括 CSS 动画、滚动叙事、Three.js/WebGL、SVG 路径、Canvas 粒子与交互装置。',
      '适合前端、设计与创意开发一起看。先看性能与移动端降级，再决定要不要抄；商用前确认素材、字体与代码许可，别把演示当成可直接上线的成品。',
    ],
    notes: [
      ['01', '先看移动端降级、性能和减少动态效果设置'],
      ['02', '把视觉拆成层级、时间轴与触发条件，再谈复刻'],
      ['03', '商用前核对代码、字体、模型与素材授权'],
    ],
    related: ['前端·AI', '设计素材', '科学可视化'],
    accent: '#3D7BFF',
  },
  '排版网站': {
    slug: 'typography',
    kicker: 'TYPE & LAYOUT',
    h1: '排版网站｜{count} 条字体、字库与试排工具',
    title: '排版网站｜{count} 条字体、字库、试排与独立排版工具 · 创忆录',
    desc: '创忆录排版网站分类收录 {count} 条字体、字库、试排工具、独立字库与排版参考；找标题字与正文字体时，先看授权、字符集和实际试排。',
    lead: '字体、字库、试排工具与排版参考。找标题字与正文字体，不只收藏，还要能下载、能试排、能确认授权。',
    intro: [
      '这里不是一份“好看字体清单”，而是排版工作会用到的入口：独立字库、免费字体、试排工具、字符集检查、版式参考与中文排版实践。',
      '适合品牌、编辑、前端与独立开发者。标题字先看气质，正文字体先看长时间阅读；商用前确认授权范围、嵌入方式和字符覆盖，别等上线后才发现缺字。',
    ],
    notes: [
      ['01', '先用真实中英混排段落试排，不只看单字展示'],
      ['02', '检查字符集、字重、行高与移动端显示'],
      ['03', '商用前确认授权、嵌入方式与再分发限制'],
    ],
    related: ['设计素材', '网页动效', '学习成长'],
    accent: '#A6602E',
  },
  'YouTube 选题': {
    slug: 'youtube-topics',
    kicker: 'CONTENT IDEAS',
    h1: 'YouTube 选题｜{count} 个可以拍的选题与拍法',
    title: 'YouTube 选题｜{count} 个工具、模型与案例的可拍选题 · 创忆录',
    desc: '创忆录 YouTube 选题分类收录 {count} 个可拍的选题，附建议标题、拍法与注意事项；把新工具、模型和案例转成观众能看懂的内容。',
    lead: '把新工具、模型和案例转成可拍的选题，附建议标题、拍法与注意事项。',
    intro: [
      '这个分类不整理“新闻摘要”，而是把一条资源翻译成内容：观众为什么会点开、开头怎么证明、过程中要展示什么、哪里最容易翻车。每条都尽量附一个可用的标题方向。',
      '适合做工具测评、AI 教程、设计拆解与科技解释类内容的人。先验证再拍，别把厂商口径直接念成结论；涉及价格、额度和截止日时，拍前再核对一次。',
    ],
    notes: [
      ['01', '先亲手跑通，再决定是测评、教程还是观点'],
      ['02', '开头给结果或冲突，中段展示过程与限制'],
      ['03', '价格、额度、截止日拍前复核，注明官方口径'],
    ],
    related: ['视频创作', 'AI 实战', '前沿追踪'],
    accent: '#C24B4B',
  },
  '前端·AI': {
    slug: 'frontend-ai',
    kicker: 'FRONTEND × AI',
    h1: '前端 · AI｜{count} 条前端工程与 AI 编程动态',
    title: '前端·AI｜{count} 条前端工程、Agent 与 AI 编程动态 · 创忆录',
    desc: '创忆录前端·AI 分类收录 {count} 条前端工程、构建工具、Agent、代码生成与浏览器新能力；关注能改变开发流程的更新，而不是只看发布热度。',
    lead: '前端工程与 AI 编程交叉：框架、构建、Agent、代码生成、浏览器新能力。',
    intro: [
      '前端和 AI 的交叉已经不只是在编辑器里补全一行代码。这个分类关注 Agent 如何接进构建、测试、预览和部署，也关注框架、运行时与浏览器能力的新变化。',
      '适合前端工程师、独立开发者和技术负责人。先判断它解决的是哪一段流程，再看维护成本、团队迁移代价和失败回滚；演示很顺，不等于生产可用。',
    ],
    notes: [
      ['01', '先定位它改变的是开发、构建、测试还是部署'],
      ['02', '看维护者、Issue 活跃度与最小可复现示例'],
      ['03', '生产接入前准备回滚、权限与成本边界'],
    ],
    related: ['网页动效', 'AI 实战', '黑科技工具'],
    accent: '#2F8F83',
  },
  'AI 实战': {
    slug: 'ai-workflows',
    kicker: 'AI IN PRACTICE',
    h1: 'AI 实战｜{count} 条可复现的模型、Agent 与工作流',
    title: 'AI 实战｜{count} 条可复现的模型、Agent 与自动化工作流 · 创忆录',
    desc: '创忆录 AI 实战分类收录 {count} 条模型、API、Agent 与自动化工作流；重点记录门槛、额度、部署条件与真实限制，方便判断能不能落地。',
    lead: '可复现的模型、API、Agent 与工作流，重点记录门槛、额度、部署条件与坑。',
    intro: [
      '这里收的是能动手的 AI：模型、API、Agent 框架、自动化工作流、提示词方法和本地部署方案。每一条尽量保留运行条件、额度、依赖和失败边界。',
      '适合独立开发者、内容创作者与小团队。先做最小验证，再谈规模化；涉及数据、隐私和付费调用时，先算清成本与权限，别让一次演示变成长期账单。',
    ],
    notes: [
      ['01', '先用最小任务验证输入、输出和失败情况'],
      ['02', '核对额度、速率限制、数据去向与商用条款'],
      ['03', '把提示词、模型版本和依赖固定下来再复用'],
    ],
    related: ['前沿追踪', '前端·AI', '学习成长'],
    accent: '#6B5BD6',
  },
  '黑科技工具': {
    slug: 'tools',
    kicker: 'TOOLING',
    h1: '黑科技工具｜{count} 个效率工具与自动化',
    title: '黑科技工具｜{count} 个桌面工具、浏览器插件与自动化 · 创忆录',
    desc: '创忆录黑科技工具分类收录 {count} 个桌面小工具、浏览器插件、自动化脚本与效率实验；先看平台支持、权限与免费边界，再决定要不要装。',
    lead: '桌面小工具、浏览器插件、自动化脚本与效率实验，先看平台支持，再看免费边界。',
    intro: [
      '“黑科技”不等于来路不明。这个分类收的是能解决具体小问题的工具：截图、搜索、窗口管理、文件处理、浏览器增强、快捷操作与自动化。',
      '适合愿意折腾但不想踩坑的人。安装前看平台、权限、更新频率与开源情况；涉及账号、剪贴板和本地文件时，先确认数据去哪，再决定要不要长期用。',
    ],
    notes: [
      ['01', '先确认系统、浏览器与权限要求'],
      ['02', '看更新频率、开源情况和数据是否出本机'],
      ['03', '免费版够用再考虑买断，别先绑定长期订阅'],
    ],
    related: ['AI 实战', '视频创作', '免费资源'],
    accent: '#5E6B7A',
  },
  '视频创作': {
    slug: 'video-creation',
    kicker: 'VIDEO',
    h1: '视频创作｜{count} 条生成、剪辑与配音资源',
    title: '视频创作｜{count} 条 AI 视频、剪辑、配音与后期资源 · 创忆录',
    desc: '创忆录视频创作分类收录 {count} 条视频生成、剪辑、配音、后期与素材资源；记录可用模型、额度、时长限制和商用条款，方便按项目选型。',
    lead: '视频生成、剪辑、配音、后期与素材，记录可用模型、额度、时长限制和商用条款。',
    intro: [
      '从文生视频、图生视频，到剪辑、字幕、配音、音乐与后期插件。这个分类按“项目里哪一步用得上”来收，而不是只按模型热度排。',
      '适合短视频、广告、教程与独立影像创作者。先看镜头稳定性、时长、水印和商用范围；重要项目保留原素材与工程文件，别把生成结果当成唯一母版。',
    ],
    notes: [
      ['01', '先看时长、分辨率、水印与排队时间'],
      ['02', '确认商用范围、人物肖像与音乐授权'],
      ['03', '保留原素材、工程文件与生成参数便于返工'],
    ],
    related: ['YouTube 选题', '设计素材', 'AI 实战'],
    accent: '#C04A7A',
  },
  '科学可视化': {
    slug: 'sci-vis',
    kicker: 'SCIENCE VIS',
    h1: '科学可视化｜{count} 个可玩、可学的交互模拟',
    title: '科学可视化｜{count} 个天文、物理与数据交互模拟 · 创忆录',
    desc: '创忆录科学可视化分类收录 {count} 个天文、物理、数学与数据交互模拟；既能玩，也能拆实现，适合科普、教学与视觉参考。',
    lead: '天文、物理、数学与数据的交互模拟，既能玩，也能拆实现。',
    intro: [
      '这里收的是能直接打开、拖拽、观察的模拟：行星轨道、N-body、电磁场、波动、分形、数学曲面与数据可视化。它们首先是好玩的，其次才是可拆解的实现参考。',
      '适合科普作者、教师、学生与创意开发。先看模型假设和精度，再决定能不能用于教学；别把简化模拟当成专业仿真，涉及结论时回到原始论文或教材。',
    ],
    notes: [
      ['01', '先看模型假设、精度与适用边界'],
      ['02', '检查是否开源、能否导出数据或复用实现'],
      ['03', '教学使用前用已知案例做一次对照'],
    ],
    related: ['网页动效', '学习成长', '前沿追踪'],
    accent: '#2D7FA6',
  },
  '学习成长': {
    slug: 'learning',
    kicker: 'LEARNING',
    h1: '学习成长｜{count} 门课程、教程与学习资料',
    title: '学习成长｜{count} 门免费课程、教程与公开学习资料 · 创忆录',
    desc: '创忆录学习成长分类收录 {count} 门免费课程、教程、文档与训练营；标出难度、语言、时长与注册要求，方便按目标补技能。',
    lead: '免费课程、教程、文档、训练营与公开课，标出难度、语言、时长和是否需要注册。',
    intro: [
      '不是所有“免费课”都值得花时间。这个分类优先收结构完整、能跟着做、有练习或项目产出的学习资料，并尽量标出难度、语言、时长和前置要求。',
      '适合想补一项具体技能的人。先定一个可交付的小目标，再选课；看大纲、更新时间和作业，不要只收藏标题。学完把结果做成可展示的作品，比看完进度条更重要。',
    ],
    notes: [
      ['01', '先看大纲、更新时间与是否带练习'],
      ['02', '确认语言、难度、时长和前置要求'],
      ['03', '用一个可交付的小项目检验学习结果'],
    ],
    related: ['免费资源', 'AI 实战', '设计素材'],
    accent: '#8A7A2E',
  },
  '设计素材': {
    slug: 'design-assets',
    kicker: 'DESIGN ASSETS',
    h1: '设计素材｜{count} 套图标、插画、纹理与模板',
    title: '设计素材｜{count} 套图标、插画、纹理、3D 与模板 · 创忆录',
    desc: '创忆录设计素材分类收录 {count} 套图标、插画、纹理、3D、模板与灵感库；附授权范围与使用限制，商用前再核对一次。',
    lead: '图标、插画、纹理、3D、模板与灵感库，附授权范围；商用前再核对一次。',
    intro: [
      '这里收的是能直接进入设计流程的素材：图标库、插画包、纹理、3D 模型、样机、版式模板与灵感参考。重点不是“好看”，而是拿下来之后能不能用。',
      '适合品牌、UI、电商与内容设计。先看授权、署名、再分发和商用限制；再好的素材，授权不清也不能进正式项目。用之前保留来源页和授权说明，方便后续核查。',
    ],
    notes: [
      ['01', '先确认商用、署名、再分发与改作权限'],
      ['02', '检查格式、分辨率、分层与字体是否齐全'],
      ['03', '保留来源页与授权说明，方便项目交付核查'],
    ],
    related: ['排版网站', '网页动效', '视频创作'],
    accent: '#A45C9E',
  },
  '前沿追踪': {
    slug: 'frontier',
    kicker: 'FRONTIER',
    h1: '前沿追踪｜{count} 条论文、模型与行业变化',
    title: '前沿追踪｜{count} 条论文、开源模型与产品发布 · 创忆录',
    desc: '创忆录前沿追踪分类收录 {count} 条论文、开源模型、产品发布与行业变化；保留日期与官方口径，区分已验证事实和厂商宣传。',
    lead: '论文、开源模型、产品发布与行业变化，保留日期与官方口径，不把宣传稿当结论。',
    intro: [
      '前沿更新最容易被“首发”“最强”“颠覆”带走。这个分类保留发布日期、来源和官方口径，把“已经发生的事实”和“厂商自报的数字”分开写。',
      '适合开发者、研究者与内容创作者做趋势判断。先看论文、代码和可复现实验，再看二手解读；涉及跑分、价格和可用范围时，回到原始页面核对。',
    ],
    notes: [
      ['01', '先看原始论文、仓库或官方博客，不看二手摘要'],
      ['02', '区分厂商自报、第三方复现与社区反馈'],
      ['03', '记录发布日期与版本，避免旧闻当新闻'],
    ],
    related: ['AI 实战', '科学可视化', 'YouTube 选题'],
    accent: '#4E5D78',
  },
};

const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const escXml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const truncate = (value, limit = 140) => {
  const chars = Array.from(String(value ?? '').replace(/\s+/g, ' ').trim());
  return chars.length > limit ? `${chars.slice(0, limit).join('')}…` : chars.join('');
};

const titleKey = (title) => String(title).toLowerCase()
  .replace(/（[^）]*）/g, '')
  .replace(/\([^)]*\)/g, '')
  .replace(/[\s\-—_·:：,，.。\/\\]/g, '');

const dateParts = (value) => {
  const full = String(value || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (full) return { y: Number(full[1]), m: Number(full[2]), d: Number(full[3]), full: true };
  const match = String(value || '').match(/(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  return { m: Number(match[1]), d: Number(match[2]), full: false };
};

const chooseYear = (month, day) => {
  const base = Date.UTC(TODAY.y, month - 1, day);
  const today = Date.UTC(TODAY.y, TODAY.m - 1, TODAY.d);
  return [TODAY.y - 1, TODAY.y, TODAY.y + 1]
    .map((year) => ({ year, distance: Math.abs(Date.UTC(year, month - 1, day) - today), base }))
    .sort((a, b) => a.distance - b.distance)[0].year;
};

const resolveDate = (value) => {
  const parts = dateParts(value);
  if (!parts) return null;
  const year = parts.y || chooseYear(parts.m, parts.d);
  const date = new Date(Date.UTC(year, parts.m - 1, parts.d));
  const iso = `${year}-${String(parts.m).padStart(2, '0')}-${String(parts.d).padStart(2, '0')}`;
  return {
    year,
    month: parts.m,
    day: parts.d,
    iso,
    date,
    short: `${String(parts.m).padStart(2, '0')}-${String(parts.d).padStart(2, '0')}`,
    long: `${year} 年 ${parts.m} 月 ${parts.d} 日`,
    zh: `${parts.m} 月 ${parts.d} 日`,
    weekday: new Intl.DateTimeFormat('zh-CN', { weekday: 'long', timeZone: 'UTC' }).format(date),
  };
};

const parseDeadline = (value) => {
  if (!value) return null;
  const full = String(value).match(/(202\d)-(\d{1,2})-(\d{1,2})/);
  if (full) return new Date(Date.UTC(Number(full[1]), Number(full[2]) - 1, Number(full[3])));
  const short = String(value).match(/(\d{1,2})-(\d{1,2})/);
  if (short) {
    const year = chooseYear(Number(short[1]), Number(short[2]));
    return new Date(Date.UTC(year, Number(short[1]) - 1, Number(short[2])));
  }
  const cn = String(value).match(/(\d{1,2}) 月 (\d{1,2}) 日/);
  if (cn) {
    const year = chooseYear(Number(cn[1]), Number(cn[2]));
    return new Date(Date.UTC(year, Number(cn[1]) - 1, Number(cn[2])));
  }
  return null;
};

const daysLeft = (deadline) => {
  if (!deadline) return null;
  const today = Date.UTC(TODAY.y, TODAY.m - 1, TODAY.d);
  return Math.round((deadline - today) / 86400000);
};

const effectiveStatus = (rawStatus, deadline) => {
  const days = daysLeft(deadline);
  if (days === null) return rawStatus;
  if (days < 0 && (rawStatus === '有效' || rawStatus === '即将过期')) return '已过期';
  if (days === 0 && rawStatus === '有效') return '即将过期';
  return rawStatus;
};

const statusClass = (status) => {
  if (status === '有效') return 'ok';
  if (status === '即将过期') return 'soon';
  if (status === '已过期') return 'expired';
  return 'ok';
};

const hashText = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const itemId = (item) => `i-${hashText(`${item.title}|${item.date}|${item.period}|${item.cat}`)}`;
const itemHref = (item) => `/items/${item.id}.html`;

const latestOf = (items) => [...items].sort((a, b) => (b.dateObj - a.dateObj)
  || (PERIOD_RANK[b.period] - PERIOD_RANK[a.period])
  || (a.index - b.index))[0];

const readData = () => {
  if (!fs.existsSync(LIBRARY_FILE)) throw new Error('library.html 不存在');
  const html = fs.readFileSync(LIBRARY_FILE, 'utf8');
  const itemsMatch = html.match(/var ITEMS=(\[[\s\S]*?\n\]);/);
  const catMatch = html.match(/var CAT_ORDER=(\[[^\]]*\]);/);
  const subMatch = html.match(/var SUBCAT=\{([\s\S]*?)\n\};/);
  const fallbackMatch = html.match(/var SUB_FALLBACK=(\{.*?\});/);
  if (!itemsMatch || !catMatch || !subMatch || !fallbackMatch) {
    throw new Error('无法从 library.html 解析 ITEMS / CAT_ORDER / SUBCAT / SUB_FALLBACK');
  }
  const rawItems = vm.runInNewContext(itemsMatch[1]);
  const categories = vm.runInNewContext(catMatch[1]);
  const subMap = vm.runInNewContext(`({${subMatch[1]}})`);
  const fallbackMap = vm.runInNewContext(`(${fallbackMatch[1]})`);
  if (!Array.isArray(rawItems) || !rawItems.length) throw new Error('ITEMS 为空');
  if (!categories.length) throw new Error('CAT_ORDER 为空');

  const items = rawItems.map((raw, index) => {
    const dateObj = resolveDate(raw[2]);
    if (!dateObj) throw new Error(`无法解析日期：${raw[2]} / ${raw[0]}`);
    const deadlineDate = parseDeadline(raw[8]);
    const item = {
      index,
      title: String(raw[0] || ''),
      cat: String(raw[1] || ''),
      sub: subMap[raw[0]] || fallbackMap[raw[1]] || '其他',
      date: dateObj.short,
      dateObj: dateObj.date,
      dateIso: dateObj.iso,
      dateLong: dateObj.long,
      month: dateObj.month,
      day: dateObj.day,
      period: String(raw[3] || ''),
      heat: String(raw[4] || ''),
      rawStatus: String(raw[5] || '有效'),
      status: effectiveStatus(String(raw[5] || '有效'), deadlineDate),
      desc: String(raw[6] || ''),
      url: String(raw[7] || ''),
      deadline: String(raw[8] || ''),
      deadlineDate,
      deadlineDays: daysLeft(deadlineDate),
      key: titleKey(raw[0]),
    };
    item.id = itemId(item);
    if (!item.title || !item.cat || !item.desc) throw new Error(`条目字段不完整：${raw[0] || index}`);
    if (!CATEGORY_META[item.cat]) throw new Error(`分类缺少 CATEGORY_META：${item.cat}`);
    return item;
  });

  const normalized = [...items].sort((a, b) => (b.dateObj - a.dateObj)
    || (PERIOD_RANK[b.period] - PERIOD_RANK[a.period])
    || (a.index - b.index));

  const categoryCounts = categories.map((name) => ({
    name,
    count: items.filter((item) => item.cat === name).length,
  }));
  const countsByName = new Map(categoryCounts.map((entry) => [entry.name, entry.count]));
  const subCounts = new Map();
  for (const item of items) {
    const key = `${item.cat}/${item.sub}`;
    subCounts.set(key, (subCounts.get(key) || 0) + 1);
  }

  const dates = [...new Set(items.map((item) => item.dateIso))]
    .sort((a, b) => new Date(`${b}T12:00:00+08:00`) - new Date(`${a}T12:00:00+08:00`))
    .map((iso) => {
      const dayItems = items.filter((item) => item.dateIso === iso);
      return {
        iso,
        date: resolveDate(iso),
        items: [...dayItems].sort((a, b) => (PERIOD_RANK[a.period] - PERIOD_RANK[b.period]) || (a.index - b.index)),
        count: dayItems.length,
        cats: categories.filter((name) => dayItems.some((item) => item.cat === name)),
      };
    });

  return {
    html,
    items,
    normalized,
    categories,
    categoryCounts,
    countsByName,
    subCounts,
    dates,
    total: items.length,
    active: items.filter((item) => item.status === '有效').length,
    subCount: new Set(items.map((item) => `${item.cat}/${item.sub}`)).size,
    latest: latestOf(items),
  };
};

const readDetails = () => {
  const details = new Map();
  if (!fs.existsSync(DETAILS_DIR)) return details;
  for (const name of fs.readdirSync(DETAILS_DIR)) {
    if (!name.endsWith('.json')) continue;
    const id = name.slice(0, -5);
    try {
      const detail = JSON.parse(fs.readFileSync(path.join(DETAILS_DIR, name), 'utf8'));
      if (detail && typeof detail === 'object') details.set(id, detail);
    } catch (error) {
      console.warn(`详情 JSON 解析失败：${name} / ${error.message}`);
    }
  }
  return details;
};

const fallbackDetail = (item) => ({
  summary: item.desc.slice(0, 90),
  blocks: [
    { type: 'lead', text: item.desc },
    { type: 'paragraph', text: `这条内容收录在「${item.cat} / ${item.sub}」。当前详情内容尚未补充，先保留原始来源供核对。` },
  ],
});

const detailText = (detail) => (detail?.blocks || [])
  .flatMap((block) => {
    if (block.type === 'highlights' || block.type === 'steps') return [...(block.title ? [block.title] : []), ...(block.items || [])];
    if (block.type === 'gallery') return [...(block.images || []).flatMap((image) => [image.alt || '', image.caption || ''])];
    return [block.text || '', block.title || '', block.source || '', block.caption || ''];
  })
  .join(' ');

const countChinese = (value) => (String(value).match(/[\u4e00-\u9fff]/g) || []).length;

const createdAt = (date, period = '晚') => `${date}T${PERIOD_TIME[period] || '20:00:00'}+08:00`;
const latestTimestamp = (items) => {
  const item = latestOf(items);
  return createdAt(item.dateIso, item.period);
};

const categoryHref = (name) => `/c/${CATEGORY_META[name].slug}.html`;
const fill = (template, values) => template.replace(/\{count\}/g, String(values.count));

const logo = '/logo.png';
const logoLight = '/logo-light.png';
const ogImage = `${SITE}/og-cover.png`;

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: '创忆录 MEMORI',
  alternateName: '创忆录',
  url: `${SITE}/`,
  logo: { '@type': 'ImageObject', url: `${SITE}/logo.png`, width: 128, height: 128 },
  sameAs: ['https://github.com/creatememori/creatememori.github.io'],
};

const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${SITE}/#website`,
  url: `${SITE}/`,
  name: '创忆录 MEMORI',
  alternateName: '创忆录',
  inLanguage: 'zh-CN',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/library.html?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
  publisher: { '@id': `${SITE}/#organization` },
};

const breadcrumbObject = (entries) => ({
  '@type': 'BreadcrumbList',
  itemListElement: entries.map(([name, url], index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name,
    item: url.startsWith('http') ? url : `${SITE}${url}`,
  })),
});

const breadcrumbHtml = (entries) => `<nav class="breadcrumbs" aria-label="面包屑">${entries
  .map(([name, url], index) => `${index ? '<span aria-hidden="true">/</span>' : ''}<a href="${esc(url)}">${esc(name)}</a>`)
  .join('')}</nav>`;

const pageShell = ({ title, description, canonical, body, jsonld, modified, published, ogType = 'website', robots = 'index,follow,max-image-preview:large', image = ogImage, imageAlt = '创忆录 MEMORI：免费资源、AI 工具与设计灵感库' }) => {
  const safeJson = jsonld ? JSON.stringify(jsonld).replace(/</g, '\\u003c') : '';
  const canonicalTag = canonical ? `<link rel="canonical" href="${esc(canonical)}">` : '';
  const dateTags = [
    published ? `<meta property="article:published_time" content="${esc(published)}">` : '',
    modified ? `<meta property="article:modified_time" content="${esc(modified)}">` : '',
  ].join('');
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${esc(robots)}">
<meta name="theme-color" content="#0C0B11">
${canonicalTag}
<link rel="icon" href="${logo}">
<link rel="apple-touch-icon" href="${logo}">
<link rel="alternate" type="application/rss+xml" title="创忆录更新日志" href="${SITE}/feed.xml">
<link rel="stylesheet" href="/seo.css">
<title>${esc(title)}</title>
<meta property="og:type" content="${esc(ogType)}">
<meta property="og:site_name" content="创忆录 MEMORI">
<meta property="og:locale" content="zh_CN">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical || `${SITE}/`)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(imageAlt)}">
${dateTags}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
${jsonld ? `<script type="application/ld+json">${safeJson}</script>` : ''}
</head>
<body style="--accent:${CATEGORY_META[currentCategory]?.accent || '#7C5CFF'}">
<a class="skip-link" href="#main">跳到正文</a>
<header class="site-head">
  <div class="shell head-in">
    <a class="brand" href="/" aria-label="创忆录首页">
      <img src="${logo}" alt="创忆录标志" width="30" height="30">
      <span><strong>创忆录</strong><small>MEMORI ARCHIVE</small></span>
    </a>
    <nav class="site-nav" aria-label="页面导航">
      <a href="/library.html">资源库</a>
      <a href="/c/">分类</a>
      <a href="/updates/">更新日志</a>
    </nav>
    <a class="head-cta" href="/library.html">进入资源库 <span aria-hidden="true">↗</span></a>
  </div>
</header>
<main id="main">${body}</main>
<footer class="site-foot">
  <div class="shell">
    <div class="foot-main">
      <div>
        <div class="foot-brand">
          <img src="${logoLight}" alt="创忆录标志" width="46" height="46">
          <div><strong>创忆录</strong><small>MEMORI ARCHIVE</small></div>
        </div>
        <p>把今天的好资源，存成明天还能用的记忆。免费额度、AI 工具、网页动效、排版、设计、视频与前沿情报，按主题持续归档。</p>
      </div>
      <div class="foot-links">
        <div><strong>站内</strong><a href="/">介绍页</a><a href="/library.html">资源库</a><a href="/c/">分类索引</a><a href="/updates/">更新日志</a><a href="${SITE}/feed.xml">RSS 订阅</a></div>
        <div><strong>热门分类</strong>${['网页动效', 'AI 实战', '设计素材', '免费资源', '前沿追踪', '视频创作'].map((name) => `<a href="${categoryHref(name)}">${esc(name)}</a>`).join('')}</div>
        <div><strong>关于</strong><a href="https://github.com/creatememori/creatememori.github.io" target="_blank" rel="noopener noreferrer">GitHub 仓库</a><a href="/library.html#aboutHeading">关于资源库</a><a href="/library.html#allHead">全部条目</a></div>
      </div>
    </div>
    <div class="foot-cats" aria-label="全部分类">${['免费资源', '网页动效', '排版网站', 'YouTube 选题', '前端·AI', 'AI 实战', '黑科技工具', '视频创作', '科学可视化', '学习成长', '设计素材', '前沿追踪'].map((name) => `<a href="${categoryHref(name)}">${esc(name)}</a>`).join('')}</div>
    <div class="foot-base"><span>© 2026 创忆录 · MEMORI ARCHIVE</span><span>数据来自资源库 · 分类页与更新日志由构建脚本生成</span></div>
  </div>
</footer>
</body>
</html>`;
};

let currentCategory = null;

const itemFooter = (item) => {
  const url = item.url || `${SITE}/library.html#allHead`;
  const linkLabel = item.url ? '原始来源 ↗' : '在资源库查看 ↗';
  return `<div class="item-foot"><span>${esc(item.period)} · ${esc(item.heat)}热度</span><span class="status status-${statusClass(item.status)}">${esc(item.status)}</span>${item.deadline ? `<span class="deadline">截止 ${esc(item.deadline)}</span>` : ''}<a class="source-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${linkLabel}</a></div>`;
};

const renderItem = (item, limit = 132, withId = true) => {
  const detail = itemHref(item);
  return `<article class="item-card"${withId ? ` id="${item.id}"` : ''}>
  <div class="item-head"><div class="tags"><a class="tag" href="${categoryHref(item.cat)}">${esc(item.cat)}</a><span class="tag tag-sub">${esc(item.sub)}</span></div><time datetime="${item.dateIso}">${esc(item.date)}</time></div>
  <h3><a href="${detail}">${esc(item.title)}</a></h3>
  <p><a class="item-desc-link" href="${detail}">${esc(truncate(item.desc, limit))}</a></p>
  ${itemFooter(item)}
</article>`;
};

const renderItemGrid = (items, limit = 132, withId = true) => `<div class="item-grid">${items.map((item) => renderItem(item, limit, withId)).join('')}</div>`;

const latestList = (items) => `<div class="latest-list">${items.map((item) => {
  return `<div class="latest-row"><time datetime="${item.dateIso}">${esc(item.date)}</time><a href="${itemHref(item)}">${esc(item.title)}</a><span>${esc(item.cat)}</span></div>`;
}).join('')}</div>`;

const sectionHead = (title, note = '') => `<div class="section-head"><h2>${esc(title)}</h2>${note ? `<p class="note">${note}</p>` : ''}</div>`;

const detailImage = (image, className = 'detail-figure') => {
  if (!image?.src) return '';
  const isCover = className === 'detail-cover';
  return `<figure class="${className}">
  <img src="${esc(image.src)}" alt="${esc(image.alt || '资源预览图')}" loading="${isCover ? 'eager' : 'lazy'}" fetchpriority="${isCover ? 'high' : 'auto'}" decoding="async" referrerpolicy="no-referrer">
  ${(image.caption || image.credit) ? `<figcaption>${image.caption ? esc(image.caption) : ''}${image.credit ? `<span>${esc(image.credit)}</span>` : ''}</figcaption>` : ''}
</figure>`;
};

const renderDetailBlock = (block) => {
  if (!block || !DETAIL_BLOCK_TYPES.has(block.type)) return '';
  if (block.type === 'lead') return `<p class="detail-lead">${esc(block.text)}</p>`;
  if (block.type === 'paragraph') return `<p>${esc(block.text)}</p>`;
  if (block.type === 'highlights') {
    const items = (block.items || []).filter(Boolean);
    if (!items.length) return '';
    return `<section class="detail-block detail-highlights">
      ${block.title ? `<h2>${esc(block.title)}</h2>` : ''}
      <ul>${items.map((entry) => `<li>${esc(entry)}</li>`).join('')}</ul>
    </section>`;
  }
  if (block.type === 'steps') {
    const items = (block.items || []).filter(Boolean);
    if (!items.length) return '';
    return `<section class="detail-block detail-steps">
      ${block.title ? `<h2>${esc(block.title)}</h2>` : ''}
      <ol>${items.map((entry) => `<li>${esc(entry)}</li>`).join('')}</ol>
    </section>`;
  }
  if (block.type === 'callout') {
    const tone = ['info', 'tip', 'warn'].includes(block.tone) ? block.tone : 'tip';
    return `<aside class="detail-callout callout-${tone}">
      <small>${esc(block.title || (tone === 'warn' ? '注意' : tone === 'info' ? '背景' : '提示'))}</small>
      <p>${esc(block.text)}</p>
    </aside>`;
  }
  if (block.type === 'quote') {
    return `<blockquote class="detail-quote"><p>${esc(block.text)}</p>${block.source ? `<footer>${esc(block.source)}</footer>` : ''}</blockquote>`;
  }
  if (block.type === 'image') return detailImage(block);
  if (block.type === 'gallery') {
    const images = (block.images || []).filter((image) => image?.src);
    if (!images.length) return '';
    return `<div class="detail-gallery">${images.map((image) => detailImage(image, 'detail-gallery-item')).join('')}</div>`;
  }
  return '';
};

const detailRelated = (data, item, detail) => {
  const related = data.normalized.filter((row) => row.id !== item.id && (row.sub === item.sub || row.cat === item.cat)).slice(0, 4);
  return related.map((row) => `<a class="detail-related-card" href="${itemHref(row)}">
    <small>${esc(row.cat)} · ${esc(row.sub)}</small>
    <strong>${esc(row.title)}</strong>
    <span>${esc(row.date)} · ${esc(row.heat)}热度</span>
  </a>`).join('');
};

const itemPage = (data, item, detail) => {
  const canonical = `${SITE}${itemHref(item)}`;
  const sourceUrl = item.url || `${SITE}/library.html#allHead`;
  const summary = String(detail.summary || item.desc || item.title).trim();
  const title = `${item.title}｜${item.cat} · 创忆录`;
  const cover = detail.cover?.src ? detail.cover : null;
  const coverSrc = cover?.src ? (cover.src.startsWith('http') ? cover.src : `${SITE}${cover.src}`) : `${SITE}/og-cover.png`;
  const blocks = (detail.blocks || []).map(renderDetailBlock).filter(Boolean).join('\n');
  currentCategory = item.cat;
  const body = `<div class="shell detail-shell">
${breadcrumbHtml([['首页', '/'], ['资源库', '/library.html'], [item.cat, categoryHref(item.cat)], [item.title, itemHref(item)]])}
<article class="detail-wrap">
  <header class="detail-hero">
    <div class="detail-kicker"><a href="${categoryHref(item.cat)}">${esc(item.cat)}</a><span>${esc(item.sub)}</span><em>MEMORI DETAIL / ${String(item.index + 1).padStart(3, '0')}</em></div>
    <h1>${esc(item.title)}</h1>
    <p class="detail-summary">${esc(summary)}</p>
    <div class="detail-meta">
      <span class="status status-${statusClass(item.status)}">${esc(item.status)}</span>
      <span>${esc(item.date)} · ${esc(item.period)}</span>
      <span>${esc(item.heat)}热度</span>
      ${item.deadline ? `<span>截止 ${esc(item.deadline)}</span>` : ''}
      <a href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">原始来源 ↗</a>
    </div>
  </header>
  ${cover ? detailImage(cover, 'detail-cover') : `<div class="detail-art" aria-hidden="true"><span>${esc(item.cat)}</span><b>${esc(item.sub)}</b><small>ARCHIVE / ${String(item.index + 1).padStart(3, '0')}</small></div>`}
  <div class="detail-columns">
    <div class="detail-content">${blocks || `<p class="detail-lead">${esc(item.desc)}</p>`}</div>
    <aside class="detail-aside">
      <div class="detail-aside-card">
        <small>收录信息</small>
        <strong>${esc(item.cat)} · ${esc(item.sub)}</strong>
        <p>${esc(item.date)} ${esc(item.period)}批次收录。详情页由结构化内容生成，原始入口和最新限制以来源页为准。</p>
        <a href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">打开原始来源 ↗</a>
      </div>
      <div class="detail-aside-card">
        <small>同主题继续看</small>
        <div class="detail-related">${detailRelated(data, item, detail)}</div>
        <a class="all-link" href="${categoryHref(item.cat)}">回到「${esc(item.cat)}」分类 <span aria-hidden="true">→</span></a>
      </div>
    </aside>
  </div>
  <nav class="detail-bottom" aria-label="详情页导航">
    <a href="/library.html">← 返回资源库</a>
    <a href="${categoryHref(item.cat)}">继续看 ${esc(item.cat)} →</a>
  </nav>
</article>
</div>`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      ORGANIZATION,
      WEBSITE,
      {
        '@type': 'Article',
        '@id': `${canonical}#article`,
        headline: item.title,
        description: summary,
        datePublished: createdAt(item.dateIso, item.period),
        dateModified: data.sourceUpdated,
        author: { '@id': `${SITE}/#organization` },
        publisher: { '@id': `${SITE}/#organization` },
        image: coverSrc,
        mainEntityOfPage: canonical,
        articleSection: item.cat,
        keywords: [item.cat, item.sub, item.heat].filter(Boolean),
        isPartOf: { '@id': `${SITE}/#website` },
      },
      breadcrumbObject([['首页', '/'], ['资源库', '/library.html'], [item.cat, categoryHref(item.cat)], [item.title, itemHref(item)]]),
    ],
  };
  return pageShell({
    title,
    description: truncate(summary, 150),
    canonical,
    body,
    jsonld,
    modified: data.sourceUpdated,
    published: createdAt(item.dateIso, item.period),
    ogType: 'article',
    image: coverSrc,
    imageAlt: cover?.alt || `${item.title} 预览图`,
  });
};

const renderStaticCard = (item) => {
  const detail = itemHref(item);
  const meta = [
    item.cat,
    item.sub,
    item.date,
    item.period,
    item.heat,
    item.status,
    item.deadline ? `截止 ${item.deadline}` : '',
  ].filter(Boolean).join(' · ');
  return `<article class="card"><h3><a href="${detail}">${esc(item.title)}</a></h3><p><a class="item-desc-link" href="${detail}">${esc(item.desc)}</a></p><p class="meta">${esc(meta)}</p></article>`;
};

const categoryPage = (data, meta, count) => {
  const items = data.normalized.filter((item) => item.cat === meta.name);
  const latest = items.slice(0, 8);
  const subs = [...new Map(items.map((item) => [item.sub, items.filter((row) => row.sub === item.sub).length])).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const related = meta.related.map((name) => ({
    name,
    meta: CATEGORY_META[name],
    count: data.countsByName.get(name) || 0,
  }));
  const canonical = `${SITE}${categoryHref(meta.name)}`;
  const description = fill(meta.desc, { count });
  const modified = data.sourceUpdated;
  currentCategory = meta.name;
  const breadcrumbs = [['首页', '/'], ['资源库', '/library.html'], [meta.name, categoryHref(meta.name)]];
  const body = `<div class="shell">
${breadcrumbHtml(breadcrumbs)}
<section class="page-hero">
  <span class="kicker">${esc(meta.kicker)}</span>
  <h1>${esc(fill(meta.h1, { count }))}</h1>
  <p class="lede">${esc(meta.lead)}</p>
  <div class="hero-stats">
    <div class="hero-stat"><strong>${count}</strong><span>条收录</span></div>
    <div class="hero-stat"><strong>${subs.length}</strong><span>个在用子分类</span></div>
    <div class="hero-stat"><strong>${esc(latest[0]?.date || '—')}</strong><span>最近收录</span></div>
    <div class="hero-stat"><strong>${esc(data.dates[data.dates.length - 1]?.date.short || '—')} → ${esc(data.latest.date)}</strong><span>数据范围</span></div>
  </div>
</section>
<section class="section">
  ${sectionHead('这个分类在收什么')}
  <div class="prose">${meta.intro.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}</div>
  <div class="subcloud" aria-label="子分类分布">${subs.map(([name, n]) => `<span>${esc(name)} <b>${n}</b></span>`).join('')}</div>
  <div class="note-list">${meta.notes.map(([no, text]) => `<div class="note-item"><b>${esc(no)}</b><span>${esc(text)}</span></div>`).join('')}</div>
</section>
<section class="section">
  ${sectionHead('最新收录', `<a href="/library.html#allHead">去资源库筛选 ↗</a>`)}
  ${latestList(latest)}
</section>
<section class="section">
  ${sectionHead('全部条目', `共 ${count} 条 · 按日期从新到旧`)}
  ${renderItemGrid(items, 120)}
</section>
<section class="section">
  ${sectionHead('继续按主题浏览')}
  <div class="related-grid">${related.map((entry) => `<a class="related-card" href="${categoryHref(entry.name)}"><small>${esc(entry.meta.kicker)}</small><strong>${esc(entry.name)}</strong><span>${entry.count} 条收录</span></a>`).join('')}</div>
  <p style="margin-top:18px"><a class="all-link" href="/c/">查看全部分类 <span aria-hidden="true">→</span></a></p>
</section>
</div>`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      ORGANIZATION,
      WEBSITE,
      {
        '@type': 'CollectionPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: fill(meta.title, { count }),
        description,
        isPartOf: { '@id': `${SITE}/#website` },
        inLanguage: 'zh-CN',
        dateModified: modified,
        primaryImageOfPage: { '@type': 'ImageObject', url: ogImage, width: 1200, height: 630 },
        about: [
          { '@type': 'Thing', name: meta.name },
          ...subs.slice(0, 6).map(([name]) => ({ '@type': 'Thing', name })),
        ],
        mainEntity: { '@id': `${canonical}#items` },
        isAccessibleForFree: true,
      },
      {
        '@type': 'ItemList',
        '@id': `${canonical}#items`,
        name: `${meta.name}资源列表`,
        numberOfItems: count,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: items.slice(0, 24).map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.title,
          url: `${canonical}#${item.id}`,
        })),
      },
      breadcrumbObject(breadcrumbs),
    ],
  };
  return pageShell({
    title: fill(meta.title, { count }),
    description,
    canonical,
    body,
    jsonld,
    modified,
    ogType: 'website',
  });
};

const categoryIndexPage = (data) => {
  currentCategory = null;
  const canonical = `${SITE}/c/`;
  const description = `创忆录的 12 个主题分类：免费资源、网页动效、排版网站、YouTube 选题、前端·AI、AI 实战、黑科技工具、视频创作、科学可视化、学习成长、设计素材与前沿追踪。每个分类页都保留独立介绍、完整条目与来源。`;
  const body = `<div class="shell">
${breadcrumbHtml([['首页', '/'], ['资源库', '/library.html'], ['分类索引', '/c/']])}
<section class="page-hero">
  <span class="kicker">CONTENT ATLAS</span>
  <h1>创忆录分类索引｜12 个主题方向，按需深挖</h1>
  <p class="lede">资源库按日期更新，分类页按主题沉淀。每个分类保留独立介绍、子分类分布、完整条目和原始来源；从任一页都能回到资源库继续搜索与筛选。</p>
  <div class="hero-stats">
    <div class="hero-stat"><strong>${data.categories.length}</strong><span>个主题分类</span></div>
    <div class="hero-stat"><strong>${data.total}</strong><span>条全站收录</span></div>
    <div class="hero-stat"><strong>${data.subCount}</strong><span>个在用子分类</span></div>
    <div class="hero-stat"><strong>${esc(data.latest.date)}</strong><span>最近更新</span></div>
  </div>
</section>
<section class="section">
  ${sectionHead('全部分类')}
  <div class="cat-index-grid">${data.categoryCounts.map((entry) => {
    const meta = CATEGORY_META[entry.name];
    return `<a class="cat-index-card" href="${categoryHref(entry.name)}" style="--accent:${meta.accent}"><span class="cat-kicker">${esc(meta.kicker)}</span><h2>${esc(entry.name)}</h2><p>${esc(meta.intro[0])}</p><span class="cat-bottom"><span class="cat-count">${entry.count}</span><span>条收录 →</span></span></a>`;
  }).join('')}</div>
</section>
</div>`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      ORGANIZATION,
      WEBSITE,
      {
        '@type': 'CollectionPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: '创忆录分类索引｜12 个主题方向',
        description,
        isPartOf: { '@id': `${SITE}/#website` },
        inLanguage: 'zh-CN',
        dateModified: data.sourceUpdated,
        hasPart: data.categoryCounts.map((entry) => ({ '@id': `${SITE}${categoryHref(entry.name)}#webpage` })),
      },
      breadcrumbObject([['首页', '/'], ['资源库', '/library.html'], ['分类索引', '/c/']]),
    ],
  };
  return pageShell({ title: '创忆录分类索引｜12 个主题方向 · 免费资源、AI、设计与前沿', description, canonical, body, jsonld, modified: data.sourceUpdated, ogType: 'website' });
};

const dayCard = (day) => {
  const top = day.items.slice(0, 3);
  const topCats = day.cats.slice(0, 6);
  return `<article class="day-card">
  <div class="day-top"><a class="day-date" href="/updates/${day.iso}.html"><time datetime="${day.iso}">${esc(day.date.short)}</time><span>${esc(day.date.weekday)}</span></a><b>${day.count} 条</b></div>
  <div class="day-cats">${topCats.map((name) => `<span>${esc(name)}</span>`).join('')}</div>
  <ul class="day-preview">${top.map((item) => `<li><time datetime="${item.dateIso}">${esc(item.period)}</time><a href="/updates/${day.iso}.html#${item.id}">${esc(truncate(item.title, 54))}</a></li>`).join('')}</ul>
  <a class="day-more" href="/updates/${day.iso}.html">查看当天全部 ${day.count} 条 →</a>
</article>`;
};

const updatesIndexPage = (data) => {
  currentCategory = null;
  const canonical = `${SITE}/updates/`;
  const totalDays = data.dates.length;
  const description = `创忆录更新日志：按日期记录每天新增的资源与情报，共 ${totalDays} 个更新日、${data.total} 条收录。支持 RSS 订阅，适合持续跟踪新工具、免费额度与前沿动态。`;
  const body = `<div class="shell">
${breadcrumbHtml([['首页', '/'], ['资源库', '/library.html'], ['更新日志', '/updates/']])}
<section class="page-hero">
  <span class="kicker">CHANGELOG / DAILY</span>
  <h1>更新日志｜每天新增了哪些资源</h1>
  <p class="lede">按日期回看创忆录的收录节奏。每一天独立成页，保留当天的分类、条目和原始来源；比首页更细，比资源库更好翻。</p>
  <div class="hero-stats">
    <div class="hero-stat"><strong>${totalDays}</strong><span>个更新日</span></div>
    <div class="hero-stat"><strong>${data.total}</strong><span>条累计收录</span></div>
    <div class="hero-stat"><strong>${esc(data.latest.date)}</strong><span>最近更新</span></div>
    <div class="hero-stat"><strong>${data.active}</strong><span>条当前有效</span></div>
  </div>
</section>
<section class="section">
  ${sectionHead('按日期浏览', `<a href="${SITE}/feed.xml">订阅 RSS ↗</a>`)}
  <div class="day-list">${data.dates.map(dayCard).join('')}</div>
</section>
<section class="section">
  ${sectionHead('这套更新怎么运转')}
  <div class="prose">
    <p>资源库是唯一事实源：编辑只向 <code>library.html</code> 追加条目与子分类；构建脚本读取同一份数据，自动生成分类页、每日页、RSS 与 sitemap。页面不靠手工复制，减少“首页更新了、分类页还是旧的”的情况。</p>
    <p>状态会按访问当天重新计算，带截止日的条目会自动从“有效”转为“即将过期”或“已过期”。想持续跟踪，可以直接订阅 RSS；想按主题深挖，从分类索引进入。</p>
  </div>
  <div class="note-list">
    <div class="note-item"><b>01</b><span>每天按早、中、晚三个批次追加，更新日页保留当天完整列表。</span></div>
    <div class="note-item"><b>02</b><span>每个分类页有独立介绍与子分类分布，不是简单复制资源库。</span></div>
    <div class="note-item"><b>03</b><span>canonical、sitemap、RSS 与 JSON-LD 由构建统一生成，避免重复 URL。</span></div>
  </div>
</section>
</div>`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      ORGANIZATION,
      WEBSITE,
      {
        '@type': 'CollectionPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: '创忆录更新日志',
        description,
        isPartOf: { '@id': `${SITE}/#website` },
        inLanguage: 'zh-CN',
        dateModified: data.sourceUpdated,
        mainEntity: { '@id': `${canonical}#days` },
      },
      {
        '@type': 'ItemList',
        '@id': `${canonical}#days`,
        name: '创忆录每日更新',
        numberOfItems: totalDays,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: data.dates.map((day, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: `${day.date.long}更新`,
          url: `${SITE}/updates/${day.iso}.html`,
        })),
      },
      breadcrumbObject([['首页', '/'], ['资源库', '/library.html'], ['更新日志', '/updates/']]),
    ],
  };
  return pageShell({ title: `创忆录更新日志｜${totalDays} 个更新日、${data.total} 条收录`, description, canonical, body, jsonld, modified: data.sourceUpdated, ogType: 'website' });
};

const dailyPage = (data, day, index) => {
  currentCategory = null;
  const canonical = `${SITE}/updates/${day.iso}.html`;
  const title = `${day.date.long}更新日志｜${day.count} 条新增资源 · 创忆录`;
  const description = `${day.date.long}，创忆录新增 ${day.count} 条资源，覆盖 ${day.cats.join('、')}。按早、中、晚批次整理，附原始来源与到期状态。`;
  const older = data.dates[index + 1];
  const newer = data.dates[index - 1];
  const body = `<div class="shell">
${breadcrumbHtml([['首页', '/'], ['资源库', '/library.html'], ['更新日志', '/updates/'], [day.date.short, `/updates/${day.iso}.html`]])}
<section class="page-hero">
  <span class="kicker">DAILY LOG / ${day.date.iso}</span>
  <h1>${esc(day.date.long)}，新增 ${day.count} 条</h1>
  <p class="lede">${esc(day.date.weekday)}的收录记录。当天覆盖 ${day.cats.length} 个分类，按早、中、晚三个批次整理；条目按分类聚合，方便一次看完同方向的更新。</p>
  <div class="hero-stats">
    <div class="hero-stat"><strong>${day.count}</strong><span>条新增</span></div>
    <div class="hero-stat"><strong>${day.cats.length}</strong><span>个分类</span></div>
    <div class="hero-stat"><strong>${esc(day.date.iso)}</strong><span>更新日期</span></div>
    <div class="hero-stat"><strong>${day.items.filter((item) => item.status === '有效').length}</strong><span>条当前有效</span></div>
  </div>
</section>
${PERIOD_ORDER.filter((period) => day.items.some((item) => item.period === period)).map((period) => {
  const periodItems = day.items.filter((item) => item.period === period);
  return `<section class="period">
    <div class="period-head"><h2>${esc(PERIOD_LABEL[period])}</h2><span>${esc(period)}</span><b>${periodItems.length} 条</b></div>
    ${renderItemGrid(periodItems)}
  </section>`;
}).join('')}
<nav class="day-nav" aria-label="相邻更新日">
  ${older ? `<a href="/updates/${older.iso}.html">← ${older.date.short} · ${older.count} 条</a>` : '<span></span>'}
  ${newer ? `<a href="/updates/${newer.iso}.html">${newer.date.short} · ${newer.count} 条 →</a>` : '<span></span>'}
</nav>
</div>`;
  const itemList = {
    '@type': 'ItemList',
    '@id': `${canonical}#items`,
    name: `${day.date.long}新增资源`,
    numberOfItems: day.count,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: day.items.slice(0, 36).map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.title,
      url: `${canonical}#${item.id}`,
    })),
  };
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      ORGANIZATION,
      WEBSITE,
      {
        '@type': 'Article',
        '@id': `${canonical}#article`,
        headline: title,
        description,
        datePublished: createdAt(day.iso, '早'),
        dateModified: createdAt(day.iso, '晚'),
        author: { '@id': `${SITE}/#organization` },
        publisher: { '@id': `${SITE}/#organization` },
        mainEntityOfPage: canonical,
        isPartOf: { '@id': `${SITE}/#website` },
        articleSection: '更新日志',
        about: day.cats.map((name) => ({ '@type': 'Thing', name })),
      },
      itemList,
      breadcrumbObject([['首页', '/'], ['资源库', '/library.html'], ['更新日志', '/updates/'], [day.date.short, `/updates/${day.iso}.html`]]),
    ],
  };
  return pageShell({ title, description, canonical, body, jsonld, modified: createdAt(day.iso, '晚'), published: createdAt(day.iso, '早'), ogType: 'article' });
};

const notFoundPage = (data) => {
  currentCategory = null;
  const body = `<div class="shell">
<section class="page-hero">
  <span class="kicker">404 / NOT FOUND</span>
  <h1>这个页面没有留下记忆</h1>
  <p class="lede">链接可能已经改名，或者这条记录从未存在。可以回到介绍页、资源库，或从分类索引重新找。</p>
</section>
<section class="section">
  <div class="related-grid">
    <a class="related-card" href="/"><small>HOME</small><strong>创忆录介绍页</strong><span>了解它是什么、适合谁</span></a>
    <a class="related-card" href="/library.html"><small>LIBRARY</small><strong>资源库</strong><span>搜索、筛选与到期视图</span></a>
    <a class="related-card" href="/c/"><small>TOPICS</small><strong>分类索引</strong><span>12 个主题方向</span></a>
  </div>
</section>
</div>`;
  return pageShell({ title: '页面不存在｜创忆录', description: '这个页面没有找到。返回创忆录介绍页或资源库继续浏览。', canonical: null, body, jsonld: null, robots: 'noindex,follow' });
};

const buildSitemap = (data) => {
  const latestDate = data.latest.dateIso;
  const urls = [
    { loc: '/', lastmod: latestDate, changefreq: 'daily', priority: '1.0' },
    { loc: '/library.html', lastmod: latestDate, changefreq: 'daily', priority: '0.9' },
    { loc: '/c/', lastmod: latestDate, changefreq: 'daily', priority: '0.8' },
    { loc: '/updates/', lastmod: latestDate, changefreq: 'daily', priority: '0.8' },
    ...data.categoryCounts.map((entry) => ({
      loc: categoryHref(entry.name),
      lastmod: data.normalized.find((item) => item.cat === entry.name)?.dateIso || latestDate,
      changefreq: 'weekly',
      priority: '0.8',
    })),
    ...data.dates.map((day) => ({
      loc: `/updates/${day.iso}.html`,
      lastmod: day.iso,
      changefreq: 'monthly',
      priority: '0.6',
    })),
    ...data.normalized.map((item) => ({
      loc: itemHref(item),
      lastmod: item.dateIso,
      changefreq: 'monthly',
      priority: '0.7',
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((entry) => `  <url><loc>${escXml(`${SITE}${entry.loc}`)}</loc><lastmod>${entry.lastmod}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`).join('\n')}
</urlset>
`;
};

const buildRobots = () => `User-agent: *
Allow: /
Disallow: /scripts/
Sitemap: ${SITE}/sitemap.xml
`;

const buildFeed = (data) => {
  const items = data.normalized.slice(0, 50);
  const lastBuild = createdAt(data.latest.dateIso, data.latest.period);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>创忆录更新日志</title>
  <link>${SITE}/updates/</link>
  <description>创忆录每天新增的免费资源、AI 工具、网页动效、设计素材与前沿情报。</description>
  <language>zh-CN</language>
  <lastBuildDate>${new Date(lastBuild).toUTCString()}</lastBuildDate>
  <generator>MEMORI build-seo</generator>
  <image><url>${SITE}/logo.png</url><title>创忆录 MEMORI</title><link>${SITE}/</link></image>
  <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
${items.map((item) => {
    const link = `${SITE}${itemHref(item)}`;
    const pub = new Date(createdAt(item.dateIso, item.period)).toUTCString();
    const desc = String(item.desc || '').replace(/]]>/g, ']]&gt;');
    return `  <item>
    <title>${escXml(item.title)}</title>
    <link>${escXml(link)}</link>
    <guid isPermaLink="true">${escXml(link)}</guid>
    <pubDate>${pub}</pubDate>
    <category>${escXml(item.cat)}</category>
    <description><![CDATA[${desc}]]></description>
  </item>`;
  }).join('\n')}
</channel>
</rss>
`;
};

const buildDemoData = (data) => {
  const sourceUpdated = data.sourceUpdated;
  const categoryCounts = data.categoryCounts;
  const categoriesWithSlug = categoryCounts.map((entry) => ({ ...entry, slug: CATEGORY_META[entry.name].slug }));
  const dates = [...data.dates].sort((a, b) => new Date(`${a.iso}T12:00:00+08:00`) - new Date(`${b.iso}T12:00:00+08:00`)).map((day) => ({
    date: day.date.short,
    count: day.count,
    morning: day.items.filter((item) => item.period === '早').length,
    noon: day.items.filter((item) => item.period === '中午').length,
    evening: day.items.filter((item) => item.period === '晚').length,
  }));
  const demoItems = [];
  const usedTitles = new Set();
  const pickedByCategory = new Map();
  for (const name of data.categories) {
    const candidates = data.normalized.filter((item) => item.cat === name);
    const picked = [];
    for (const item of candidates) {
      if (usedTitles.has(item.key)) continue;
      usedTitles.add(item.key);
      picked.push({
        id: item.id,
        title: item.title,
        cat: item.cat,
        sub: item.sub,
        date: item.date,
        period: item.period,
        heat: item.heat,
        status: item.status,
        desc: item.desc,
        url: item.url,
        deadline: item.deadline,
        deadlineDays: item.deadlineDays,
        detail: itemHref(item),
      });
      if (picked.length === DEMO_PER_CATEGORY) break;
    }
    pickedByCategory.set(name, picked);
  }
  const maxPicked = Math.max(...[...pickedByCategory.values()].map((picked) => picked.length));
  for (let round = 0; round < maxPicked; round += 1) {
    for (const name of data.categories) {
      const item = pickedByCategory.get(name)?.[round];
      if (item) demoItems.push(item);
    }
  }
  const payload = {
    meta: {
      sourceUrl: `${SITE}/library.html`,
      sourceUpdated,
      total: data.total,
      active: data.active,
      activePct: data.total ? Math.round((data.active / data.total) * 100) : 0,
      subCount: data.subCount,
      categoryCount: categoryCounts.length,
      categories: categoriesWithSlug,
      dates,
      statusCounts: data.items.reduce((result, item) => {
        result[item.status] = (result[item.status] || 0) + 1;
        return result;
      }, {}),
      demoCount: demoItems.length,
      demoPerCategory: DEMO_PER_CATEGORY,
      rangeStart: dates[0]?.date || '',
      rangeEnd: dates[dates.length - 1]?.date || '',
    },
    items: demoItems,
  };
  return `window.MEMORI_DEMO = ${JSON.stringify(payload, null, 2)};\n`;
};

const save = (relativePath, content, changed) => {
  const target = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === content) return;
  fs.writeFileSync(target, content, 'utf8');
  changed.push(relativePath);
};

const updateTopicGrid = (data) => {
  const source = fs.readFileSync(LIBRARY_FILE, 'utf8');
  const grid = data.categoryCounts.map((entry) => `<a class="topic-card" href="${categoryHref(entry.name)}"><span>${esc(entry.name)}</span><b>${entry.count}</b></a>`).join('\n    ');
  let updated = source
    .replace(/<!-- BUILD:TOPIC-GRID:START -->[\s\S]*?<!-- BUILD:TOPIC-GRID:END -->/, `<!-- BUILD:TOPIC-GRID:START -->\n    ${grid}\n    <!-- BUILD:TOPIC-GRID:END -->`)
    .replace(/(<span class="range-chip">)[\s\S]*?(<\/span>)/, `$1${data.dates[data.dates.length - 1]?.date.short || '—'} → ${data.latest.date} · 持续更新$2`)
    .replace(/(<span id="footRange">)[\s\S]*?(<\/span>)/, `$1数据范围：${data.dates[data.dates.length - 1]?.date.short || '—'} ～ ${data.latest.date} 的实际分享记录$2`)
    .replace(/<title>创忆录资源库｜\d+ 条/, `<title>创忆录资源库｜${data.total} 条`)
    .replace(/(<meta property="article:modified_time" content=")[^"]+(">)/, `$1${data.sourceUpdated}$2`)
    .replace(/(<meta property="og:updated_time" content=")[^"]+(">)/, `$1${data.sourceUpdated}$2`)
    .replace(/("dateModified": ")[^"]+(")/, `$1${data.sourceUpdated}$2`);

  const staticCards = data.normalized.map(renderStaticCard).join('');
  const staticBlock = /<div id="viewRoot"><div class="cards">[\s\S]*?<\/div><\/div>\s*<nav class="pager" id="pager"/;
  if (staticBlock.test(updated)) {
    updated = updated.replace(staticBlock, `<div id="viewRoot"><div class="cards">${staticCards}</div></div>\n<nav class="pager" id="pager"`);
  }
  return updated;
};

const updateLanding = (data) => {
  if (!fs.existsSync(LANDING_FILE)) return null;
  const source = fs.readFileSync(LANDING_FILE, 'utf8');
  const proof = data.categoryCounts
    .map((entry) => `<a href="${categoryHref(entry.name)}">${esc(entry.name)}<b>${entry.count}</b></a>`)
    .join('');
  return source
    .replace(/(<div class="feature-proof category-proof" id="categoryProof">)[\s\S]*?(<\/div>)/, `$1${proof}$2`)
    .replace(/(<meta property="article:modified_time" content=")[^"]+(">)/, `$1${data.sourceUpdated}$2`)
    .replace(/(<meta property="og:updated_time" content=")[^"]+(">)/, `$1${data.sourceUpdated}$2`)
    .replace(/("dateModified": ")[^"]+(")/, `$1${data.sourceUpdated}$2`);
};

const cleanGeneratedDir = (dir, keep) => {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return;
  for (const name of fs.readdirSync(full)) {
    if (!name.endsWith('.html')) continue;
    const relative = `${dir}/${name}`;
    if (!keep.has(relative)) fs.unlinkSync(path.join(full, name));
  }
};

const main = () => {
  const data = readData();
  /* 用最新一条内容的时间作为页面修改时间，避免“构建提交”本身反复触发下一次构建提交 */
  data.sourceUpdated = latestTimestamp(data.items);
  data.details = readDetails();
  const changed = [];

  const itemFiles = new Set(data.items.map((item) => `items/${item.id}.html`));
  cleanGeneratedDir('items', itemFiles);
  for (const item of data.items) {
    const detail = data.details.get(item.id) || fallbackDetail(item);
    save(`items/${item.id}.html`, itemPage(data, item, detail), changed);
  }

  const categoryFiles = new Set(data.categoryCounts.map((entry) => `c/${CATEGORY_META[entry.name].slug}.html`));
  categoryFiles.add('c/index.html');
  cleanGeneratedDir('c', categoryFiles);
  for (const entry of data.categoryCounts) {
    const meta = { ...CATEGORY_META[entry.name], name: entry.name };
    save(`c/${meta.slug}.html`, categoryPage(data, meta, entry.count), changed);
  }
  save('c/index.html', categoryIndexPage(data), changed);

  const updateFiles = new Set(data.dates.map((day) => `updates/${day.iso}.html`));
  updateFiles.add('updates/index.html');
  cleanGeneratedDir('updates', updateFiles);
  save('updates/index.html', updatesIndexPage(data), changed);
  data.dates.forEach((day, index) => save(`updates/${day.iso}.html`, dailyPage(data, day, index), changed));

  save('404.html', notFoundPage(data), changed);
  save('feed.xml', buildFeed(data), changed);
  save('sitemap.xml', buildSitemap(data), changed);
  save('robots.txt', buildRobots(), changed);
  save('demo-data.js', buildDemoData(data), changed);
  save('library.html', updateTopicGrid(data), changed);
  const landing = updateLanding(data);
  if (landing !== null) save('index.html', landing, changed);

  console.log(`Built ${data.total} items / ${data.categories.length} categories / ${data.dates.length} days / ${data.total} detail pages.`);
  console.log(`Latest ${data.latest.dateIso}; active ${data.active}; subcategories ${data.subCount}; sourceUpdated ${data.sourceUpdated}.`);
  console.log(`Detail JSON ${data.details.size}; sitemap ${data.total + data.categoryCounts.length + data.dates.length + 4} URLs.`);
  console.log(`Changed ${changed.length} files${changed.length ? `: ${changed.join(', ')}` : ''}.`);
};

main();
