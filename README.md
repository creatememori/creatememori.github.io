# 创忆录 MEMORI · 统一站点

`https://creatememori.blog/` 是创忆录唯一对外站点：首页是介绍页，`/library.html` 是可检索的每日资源库；12 个分类页、更新日志与每日页、RSS、sitemap 由同一份数据自动构建。

## 目录

- `index.html`：介绍页（品牌、产品预览、分类入口、FAQ、进入资源库）
- `library.html`：资源库，**唯一事实源**；`ITEMS` / `CAT_ORDER` / `SUBCAT` / `SUB_FALLBACK` 都在这里
- `c/`：12 个分类页 + 分类索引，构建产物，不要手改
- `updates/`：更新日志总览 + 每个更新日的每日页，构建产物，不要手改
- `feed.xml`、`sitemap.xml`、`robots.txt`、`404.html`、`demo-data.js`：构建产物
- `seo.css`：分类页/更新页样式
- `memori-dimensions.js` / `memori-dimensions.css`：资源库三维筛选
- `logo.png`、`logo-light.png`、`og-cover.png`：Logo 与社交分享封面
- `scripts/build-seo.mjs`：读取 `library.html`，重建分类页、每日页、RSS、sitemap、demo 数据
- `scripts/audit-data.mjs`：数据巡检与外链健康检查
- `scripts/guard-site.mjs`：发布门禁
- `MUSE_UPDATE_RULES.md`：内容更新边界
- `CNAME`：`creatememori.blog`

## 日常更新

在 `library.html` 的 `ITEMS` 顶部追加当天条目，同步 `SUBCAT`，并同步 `#viewRoot` 静态卡片；然后运行：

```bash
node scripts/build-seo.mjs
node scripts/audit-data.mjs
node scripts/guard-site.mjs
```

`build-seo.mjs` 会重新计算有效/即将过期/已过期、分类计数、更新日页、sitemap、RSS 和 `demo-data.js`。页面日期、日历“今天”、到期状态均在运行时按访问当天计算，不需要手动改 `TODAY`。

## 数据巡检

```bash
node scripts/audit-data.mjs
node scripts/audit-data.mjs --links
```

第一条只检查条目数、日期范围、子分类、静态卡片一致性、标题重复与格式；第二条会并发请求外链，检查 4xx/5xx 与超时。

## 发布

推送到 `main` 后由 GitHub Pages 发布；`.github/workflows/site-guard.yml` 会在 push / PR / 每日定时任务中执行构建、巡检与门禁。资源库更新被合并后，派生页面会随同一提交一起生成。

发布后建议：

1. 打开 `https://creatememori.blog/sitemap.xml`、`robots.txt`、`feed.xml` 确认 200；
2. 在 Google Search Console / Bing Webmaster 重新提交 sitemap，并对首页、资源库、更新日志请求抓取；
3. 需要时用 IndexNow 推送 `https://creatememori.blog/` 与 `/library.html`。

## 域名说明

`creatememori.github.io` 是 GitHub 用户站点仓库；自定义域绑定后，Pages 会把 `creatememori.github.io` 的请求统一跳到 `creatememori.blog`，不要在两个域各放一套 canonical。旧的 `creatememori-landing` 仓库只作为历史备份，不再承担发布。
