# Muse 更新守则（硬约束）

> 本文件是 `https://creatememori.github.io/` 的自动更新边界。Muse 或任何自动更新在修改 `index.html` 前必须先读本文件。违反以下任一条，`node scripts/guard-site.mjs` 会 FAIL，禁止推送。
>
> `index.html` 内的 `MUSE:APPEND-ONLY` 标记是模板级提醒；不要删除或改写该标记。

## 允许的动作

1. **只追加**：在 `index.html` 的 `ITEMS` 数组顶部追加当天的新条目，保持现有 9 字段顺序：标题、分类、日期、时段、热度、状态、说明、链接、截止日。
2. **同步追加**：在 `SUBCAT` 顶部为当天新标题追加子分类映射；没有新子分类时，不要重排整张表。
3. **保留历史**：不删除、不改写已有条目；重复标题保留，并依赖页面自动加“跨类收录”标签。
4. **新增日期/子分类**：允许因为当天数据新增日期或子分类，但不得把旧日期、旧子分类从数据里删掉。
5. **静态 HTML 同步（2026-11-24 起，Bing SEO）**：`#viewRoot` 内含与 `ITEMS` 一一对应的静态 HTML 卡片（`<article class="card">`，标题带链接、说明、分类/日期/时段/热度/状态），供搜索引擎索引；JS 加载后 `render()` 会接管为交互视图。**每次追加条目后，必须同步更新静态 HTML**（重新生成全部卡片，或按相同顺序在顶部追加新卡片），保持卡片数与 `ITEMS` 条目数一致；`guard-site.mjs` 会校验两者数量。只改 `ITEMS` 不改静态 HTML 会导致新条目搜不到，视为未完成同步。

## 静态 HTML 架构（2026-11-24，用户要求 Bing 能索引）

- 条目数据仍以 `ITEMS` JS 数组为唯一事实来源；静态 HTML 是它在构建时生成的快照，只读，不参与筛选/搜索/分页逻辑。
- 静态卡片格式：`<article class="card"><h3><a href="链接">标题</a></h3><p>说明</p><p class="meta">分类 · 子分类 · 日期 · 时段 · 热度 · 状态（· 截止日）</p></article>`；无链接条目标题为纯文本。
- 静态卡片内的状态/剩余天数按构建日换算（与运行时逻辑一致）；JS 加载后会按访问当天重新计算并渲染，静态快照不影响运行时正确性。
- 体积上限：静态 HTML 使文件增至约 0.9MB，`guard-site.mjs` 的体积上限已放宽至 2MB；若文件逼近 2MB，需先做单源重构（静态 HTML 为唯一数据源、JS 改读 DOM）再继续追加，不要直接删静态 HTML。
- 同步工具：`~/workspace/board-live/convert.py`（读暂存板导出、追加 ITEMS+SUBCAT、重生成静态 HTML、写出新 index.html）；每次同步后按 guard 逐项核对再推送。

## 绝对不要做

- 不要整份重写 `index.html`，不要“重构”“统一格式”“精简模板”“重排代码”。
- 不要改 `<head>` 的 title、description、canonical、OG/Twitter、JSON-LD、robots、theme-color、favicon。
- 不要把 `var TODAY=new Date(); TODAY.setHours(0,0,0,0);` 改成固定日期（例如 `new Date(2026,10,23)`）。
- 不要改日期筛选、日历“今天”、统计图柱和状态派生逻辑；它们必须运行时按访问当天计算。
- 不要把 `memori-dimensions.css` / `memori-dimensions.js` 内联成 `data:` 或 base64；不要移除外部 CSS/JS 引用。
- 不要删除“关于这个看板”、FAQ、12 类范围、介绍站回链、skip link、筛选面板焦点管理、aria 属性、`scroll-margin-top`。
- 不要改 12 个一级分类、内容类型/使用场景/角色三维筛选、黑白极简 + 粉色强调的视觉。
- 不要替换 `logo.png`、`og-cover.png`、`robots.txt`、`sitemap.xml`、IndexNow key 的语义；更新 sitemap 时只改 `lastmod`，不要删 URL。
- 不要把 706 条历史数据整体替换成“当天 20 条”；只追加，不覆盖。
- 不要删除 `#viewRoot` 内的静态 HTML 卡片（Bing SEO 依赖它）；不要把静态卡片改回空容器。

## 关键词：允许与禁止

允许词：`追加`、`append`、`ITEMS.unshift`、`SUBCAT`、`当天条目`、`数据巡检`、`guard`。

禁止词：`重写`、`重构`、`统一`、`整理全页`、`精简`、`优化模板`、`inline`、`base64`、`data URI`、`固定日期`、`日期基准改为`、`删除关于`、`移除 FAQ`、`替换 head`、`合并 CSS`、`全量替换 ITEMS`。

判断口径：

- “优化”只允许指条目的文案、链接、分类局部修正，不允许指模板、head、CSS/JS、日期逻辑。
- “统一日期”是危险词；日期由 `TODAY` 和 `DATE_LIST` 运行时生成，不做全局替换。
- “精简”是危险词；页面注释、空行、无障碍属性、静态介绍都应保留。

## 提交前门禁

```bash
node scripts/guard-site.mjs
node scripts/audit-data.mjs
```

`guard-site.mjs` 必须输出 `PASS`；若 FAIL，按提示恢复，不要强行提交。

## 可直接贴给 Muse 的短提示

> 只追加：在 `ITEMS` 顶部追加当天条目，并同步 `SUBCAT`，同时同步更新 `#viewRoot` 内的静态 HTML 卡片（卡片数须与 ITEMS 一致）。不要重写/重构/精简/统一/内联模板；不要改 head、SEO、JSON-LD、TODAY、日期状态逻辑、关于/FAQ、CSS/JS、无障碍与移动端规则；不要删静态 HTML 卡片。保留 12 分类、三维筛选、黑白极简 + 粉色强调。提交前必须运行 `node scripts/guard-site.mjs`，PASS 才能推送。
