# 创忆录 · 每日资源看板

`https://creatememori.github.io/` 是创忆录的资源检索站：每天把免费额度、限时机会、前沿工具、AI 实战、网页动效与设计素材按日期、分类、热度、到期状态整理成可搜索、可筛选的看板。

介绍站：`https://creatememori.blog/`

## 文件

- `index.html`：页面、ITEMS 数据、筛选与视图逻辑
- `memori-dimensions.js` / `memori-dimensions.css`：内容类型 / 使用场景 / 角色三维筛选
- `logo.png`、`og-cover.png`：站点 Logo 与社交分享封面
- `robots.txt`、`sitemap.xml`：搜索引擎抓取入口
- `a3d282fd8fba43b3967247aa12d24f33.txt`：IndexNow 验证文件
- `scripts/audit-data.mjs`：数据巡检与外链健康检查

## 日常更新

Muse 的日常更新通常只向 `index.html` 的 `ITEMS` 顶部追加新条目，并同步追加 `SUBCAT` 映射；不要整份重写模板，否则会丢失 SEO、可访问性和筛选相关的自定义代码。

页面日期、日期筛选、日历“今天”、到期状态与剩余天数均在运行时按访问当天计算，不需要手动改 `TODAY`。

## Muse 更新边界（重要）

Muse 只允许在 `ITEMS` 顶部追加当天条目，并同步在 `SUBCAT` 追加映射；**禁止**重写模板、改 head/SEO/JSON-LD、固定 `TODAY`、内联 CSS/JS、删除关于/FAQ/无障碍规则。完整边界与可直接粘贴给 Muse 的短提示见 [`MUSE_UPDATE_RULES.md`](MUSE_UPDATE_RULES.md)。

提交前必须运行：

```bash
node scripts/guard-site.mjs
node scripts/audit-data.mjs
```

`guard-site.mjs` 输出 `PASS` 才能推送；CI 也会在 push / PR 时跑同一门禁。

## 数据巡检

```bash
node scripts/audit-data.mjs
node scripts/audit-data.mjs --links
```

第一条只检查条目数、日期范围、子分类、标题重复与状态冲突；第二条会并发请求外链，检查 4xx/5xx 与超时。巡检若提示“源数据状态与截止日冲突”，是历史条目原始状态未改，页面运行时已按截止日自动归正为“已过期”；下次编辑时可顺手更新源数据。

## 发布

推送到 `main` 后由 GitHub Pages 自动发布。发布后建议：

1. 打开 `https://creatememori.github.io/sitemap.xml` 与 `robots.txt` 确认 200；
2. 用 Bing Webmaster / Google Search Console 重新提交 sitemap；
3. 需要时用 IndexNow 推送首页 URL。
