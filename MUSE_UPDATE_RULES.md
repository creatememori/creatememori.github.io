# Muse 更新守则（统一站点 + 详情页版）

> 本文件约束 `https://creatememori.blog/` 的日常内容更新。Muse 或任何自动更新在改文件前必须先读本文件，并同时读 `DETAILS_WRITING_RULES.md`。
>
> 站点结构：`index.html` 是介绍页，`library.html` 是资源库与**唯一事实源**；`content/items/<id>.json` 是每条资源的详情内容；`items/<id>.html`、`c/`、`updates/`、`feed.xml`、`sitemap.xml`、`demo-data.js`、`#viewRoot` 静态卡片全部由 `scripts/build-seo.mjs` 生成，不要手改。

## 每次新增资源的完整流程

1. **只追加数据**：在 `library.html` 的 `ITEMS` 顶部追加当天条目，保持 9 字段顺序：标题、分类、日期、时段、热度、状态、说明、链接、截止日。
2. **同步子分类**：在 `library.html` 的 `SUBCAT` 顶部为新标题追加映射；没有新子分类时不要重排整张表。
3. **生成详情骨架并改写**：在仓库根目录运行 `node scripts/seed-details.mjs`，它会为缺少详情的条目创建 `content/items/<id>.json`。找到刚新增条目的 JSON，按 `DETAILS_WRITING_RULES.md` 逐条改写；自动骨架只是占位，不能直接当成品提交。
4. **不要手写详情 HTML**：不要新建或编辑 `items/` 下的任何文件；构建脚本会根据 JSON 统一生成。
5. **重建全部派生页面**：运行 `node scripts/build-seo.mjs`。它会重新生成 `items/`、`c/`、`updates/`、`feed.xml`、`sitemap.xml`、`demo-data.js`、`404.html`，并重写 `library.html` 的 `#viewRoot` 静态卡片。
6. **跑巡检与门禁**：运行 `node scripts/audit-data.mjs` 与 `node scripts/guard-site.mjs`。只有 `guard-site.mjs` 输出 `PASS` 才允许 commit / push。
7. **保留历史**：不删除、不改写已有条目；重复标题保留，页面会显示“跨类收录”。允许新增日期/子分类，不得把旧日期、旧子分类从数据里删掉。

## 详情内容硬约束（摘要）

- 每条资源必须有独立详情页 `/items/<id>.html`；卡片标题、卡片主体、更新日志标题都链接到详情页。
- 原始外链只放在详情页的“原始来源 / 打开原站”，不要替代详情页。
- 详情内容只写 `content/items/<id>.json`；禁止把正文直接塞进 `library.html`；禁止手写 `/items/` 下的 HTML。
- JSON 只允许 `summary`、可选 `cover`、`blocks`；block 类型只允许 `lead`、`paragraph`、`highlights`、`steps`、`callout`、`quote`、`image`、`gallery`。
- 正文至少 350 个中文字符（建议 500–800 字）；至少 3 个内容块（建议 4–6 个）；至少回答“这是什么、为什么值得看、适合谁、怎么用、有什么坑”。
- 至少 1 张可靠图片；没有可靠图片时宁可不放，不要凑图、不要伪造截图。`cover` 必须写 `src`、`alt`、`credit`。
- 详情页主色自动取所属分类的主题色；`callout` 只允许 `info`、`tip`、`warn`；不要自定义 CSS、随机十六进制色、`<script>`、`<style>`、`iframe`。
- 不夸大、不写“最强”“全网第一”这类无法验证的话；不整段复制原站；不确定事实不写。

完整写作标准见 `DETAILS_WRITING_RULES.md`。

## 绝对不要做

- 不要整份重写 `library.html` 或 `index.html`，不要“重构”“统一格式”“精简模板”“重排代码”。
- 不要手改 `items/`、`c/`、`updates/`、`feed.xml`、`sitemap.xml`、`demo-data.js`；它们会被下一次构建覆盖。
- 不要改 canonical 到 `creatememori.github.io`，不要再引入第二个规范域。唯一 canonical 是 `https://creatememori.blog/`。
- 不要删除 `index.html` 的介绍页定位、`library.html` 的资源库定位、详情页、分类页、更新日志、RSS、sitemap、404、CNAME 或 `.nojekyll`。
- 不要把 `var TODAY=new Date(); TODAY.setHours(0,0,0,0);` 改成固定日期；日期筛选、日历“今天”、到期状态必须运行时计算。
- 不要把 `memori-dimensions.css` / `memori-dimensions.js` 内联成 `data:` 或 base64；不要移除外部 CSS/JS 引用。
- 不要删除关于、FAQ、12 类范围、skip link、筛选面板焦点管理、aria 属性、`scroll-margin-top`。
- 不要改 12 个一级分类；新增分类需要同时补 `CATEGORY_META`、导航和 guard，属于结构性变更，先讨论。
- 不要替换 `logo.png`、`logo-light.png`、`og-cover.png`、`robots.txt`、IndexNow key 的语义。
- 不要把历史数据整体替换成“当天 20 条”；只追加，不覆盖。

## 提交前门禁

```bash
node scripts/seed-details.mjs       # 只为缺少详情的新条目生成骨架，然后逐条改写
node scripts/build-seo.mjs
node scripts/audit-data.mjs
node scripts/guard-site.mjs
```

`guard-site.mjs` 必须输出 `PASS`；CI 也会在 push / PR 时跑同样的构建与门禁。若 FAIL，按提示修正，不要强行提交。

## 可直接贴给 Muse 的短提示

> 先读 `MUSE_UPDATE_RULES.md` 和 `DETAILS_WRITING_RULES.md`。只追加：在 `library.html` 的 `ITEMS` 顶部追加当天条目，同步 `SUBCAT`；运行 `node scripts/seed-details.mjs` 后，逐条改写新条目的 `content/items/<id>.json`，不要手写 `items/` HTML，不要改 `c/`、`updates/`、`feed.xml`、`sitemap.xml`、`demo-data.js`。然后运行 `node scripts/build-seo.mjs && node scripts/audit-data.mjs && node scripts/guard-site.mjs`。只有 guard 输出 PASS 才 commit/push。
