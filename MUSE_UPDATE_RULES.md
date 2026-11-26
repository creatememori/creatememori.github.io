# Muse 更新守则（统一站点版）

> 本文件约束 `https://creatememori.blog/` 的日常内容更新。Muse 或任何自动更新在改文件前必须先读本文件。
>
> 站点已合并：`index.html` 是介绍页，`library.html` 是资源库与**唯一事实源**；分类页、更新日志、每日页、RSS、sitemap 与 `demo-data.js` 都是构建产物，不要手改。

## 允许的动作

1. **只追加数据**：在 `library.html` 的 `ITEMS` 顶部追加当天条目，保持 9 字段顺序：标题、分类、日期、时段、热度、状态、说明、链接、截止日。
2. **同步子分类**：在 `library.html` 的 `SUBCAT` 顶部为新标题追加映射；没有新子分类时不要重排整张表。缺失时构建会回退到 `SUB_FALLBACK`，但显式映射更准确。
3. **同步静态卡片**：`#viewRoot` 内是供搜索引擎和无 JS 环境读取的静态 HTML 卡片，数量必须与 `ITEMS` 一致。追加条目后，按相同顺序在顶部追加对应卡片；不要只改数据不改静态卡片。
4. **重建派生页面**：每次数据变更后运行 `node scripts/build-seo.mjs`，由脚本重新生成 `c/`、`updates/`、`feed.xml`、`sitemap.xml`、`demo-data.js`、`404.html`，并刷新主题索引、范围标签与更新时间。
5. **保留历史**：不删除、不改写已有条目；重复标题保留，页面会显示“跨类收录”。允许新增日期/子分类，不得把旧日期、旧子分类从数据里删掉。
6. **内容局部修正**：可以修条目的标题、说明、链接、分类；不要借“优化”重写整页模板。

## 静态 HTML 架构

- `ITEMS` 是唯一事实来源；`#viewRoot` 静态卡片是发布快照，只读，不参与筛选/搜索/分页。
- 卡片格式：`<article class="card"><h3><a href="链接">标题</a></h3><p>说明</p><p class="meta">分类 · 子分类 · 日期 · 时段 · 热度 · 状态（· 截止日）</p></article>`；无链接条目标题为纯文本。
- 静态卡片里的状态与剩余天数按构建日换算；JS 加载后会按访问当天重算，静态快照不影响运行时正确性。
- 文件体积上限 3 MB；当前约 1.25 MB。接近上限时先讨论架构，不要直接删静态卡片。

## 绝对不要做

- 不要整份重写 `library.html` 或 `index.html`，不要“重构”“统一格式”“精简模板”“重排代码”。
- 不要把分类页、每日页、`feed.xml`、`sitemap.xml` 当成源文件手改；它们会被下一次构建覆盖。
- 不要改 canonical 到 `creatememori.github.io`，不要再引入第二个规范域。唯一 canonical 是 `https://creatememori.blog/`。
- 不要删除 `index.html` 的介绍页定位、`library.html` 的资源库定位、分类页、更新日志、RSS、sitemap、404、CNAME 或 `.nojekyll`。
- 不要把 `var TODAY=new Date(); TODAY.setHours(0,0,0,0);` 改成固定日期；日期筛选、日历“今天”、到期状态必须运行时计算。
- 不要把 `memori-dimensions.css` / `memori-dimensions.js` 内联成 `data:` 或 base64；不要移除外部 CSS/JS 引用。
- 不要删除关于、FAQ、12 类范围、skip link、筛选面板焦点管理、aria 属性、`scroll-margin-top`。
- 不要改 12 个一级分类；新增分类需要同时补 `CATEGORY_META`、导航和 guard，属于结构性变更，先讨论。
- 不要替换 `logo.png`、`logo-light.png`、`og-cover.png`、`robots.txt`、IndexNow key 的语义。
- 不要把历史数据整体替换成“当天 20 条”；只追加，不覆盖。

## 提交前门禁

```bash
node scripts/build-seo.mjs
node scripts/audit-data.mjs
node scripts/guard-site.mjs
```

`guard-site.mjs` 必须输出 `PASS`；CI 也会在 push / PR 时跑同样的构建与门禁。若 FAIL，按提示修正，不要强行提交。

## 可直接贴给 Muse 的短提示

> 只追加：在 `library.html` 的 `ITEMS` 顶部追加当天条目，同步 `SUBCAT`，并在 `#viewRoot` 顶部追加同序静态卡片（卡片数须与 ITEMS 一致）。然后运行 `node scripts/build-seo.mjs && node scripts/audit-data.mjs && node scripts/guard-site.mjs`。不要重写模板、不要手改生成页、不要把 canonical 改回 github.io、不要固定 TODAY、不要删介绍页/分类页/更新日志/RSS。
