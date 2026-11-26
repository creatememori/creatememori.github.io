# 创忆录详情页写作规则

> 本文件是 `https://creatememori.blog/` 的内容写作标准。你的角色是内容编辑，不是网页开发者。
> 不要直接写 HTML、CSS、JavaScript，也不要新建页面模板。你只负责条目数据和结构化详情内容，页面由 `scripts/build-seo.mjs` 统一生成。

## 一、每条资源必须有独立详情页

- 路径：`/items/<id>.html`
- 卡片标题、卡片主体、更新日志标题都链接到详情页
- 原始外链放到详情页的“原始来源”，不要替代详情页

## 二、详情内容写入

- `content/items/<id>.json`
- 禁止把详情内容直接塞进 `library.html`
- 禁止手写 `/items/` 下的 HTML
- 禁止修改 `index.html`、`c/`、`updates/`、`feed.xml`、`sitemap.xml`、`demo-data.js`、`CNAME`、workflow

## 三、详情 JSON 只允许以下结构

```json
{
  "summary": "一句到两句摘要，不重复标题",
  "cover": {
    "src": "官方图或用户提供图 URL",
    "alt": "具体描述图片内容",
    "credit": "来源说明；没有就写 创忆录整理"
  },
  "blocks": [
    { "type": "lead", "text": "开场段落" },
    { "type": "paragraph", "text": "正文段落" },
    { "type": "highlights", "title": "先看这几点", "items": ["要点一", "要点二"] },
    { "type": "steps", "title": "怎么用", "items": ["步骤一", "步骤二"] },
    { "type": "callout", "tone": "tip", "title": "提示", "text": "补充说明" },
    { "type": "quote", "text": "值得保留的一句", "source": "来源" },
    { "type": "image", "src": "图片 URL", "alt": "图片描述", "caption": "图注" },
    { "type": "gallery", "images": [{ "src": "...", "alt": "...", "caption": "..." }] }
  ]
}
```

不允许出现：

- 任意自定义 CSS
- `<script>`、`<style>`、`iframe`
- 随机十六进制颜色
- 伪造截图、伪造数据、伪造来源
- 从原站整段复制

## 四、内容标准

- 正文至少 350 个中文字符，建议 500–800 字
- 至少 3 个内容块，建议 4–6 个
- 有可靠图片时至少 1 张相关图片；没有可靠图片时宁可不放，不要凑图，不得伪造截图
- 至少回答：这是什么、为什么值得看、适合谁、怎么用、有什么坑
- 每段只讲一个点，多用小标题、列表、步骤、引用和提示块
- 语气保持创忆录现有风格：克制、具体、有判断，不写营销腔
- 标题不夸大，不写“最强”“全网第一”这类无法验证的话

## 五、颜色与排版

- 详情页主色自动取所属分类的主题色，不要每条单独指定颜色
- `callout` 只允许三种 `tone`：`info`、`tip`、`warn`
- 图片使用模板的 16:9 封面或 4:3 内文图，不自定义尺寸
- 排版只用模板支持的块类型，不自由拼版

## 六、每天更新流程

1. 在 `library.html` 的 `ITEMS` 顶部追加条目
2. 同步 `SUBCAT`
3. 运行 `node scripts/seed-details.mjs`，为缺少详情的条目生成骨架
4. 逐条改写新条目的 `content/items/<id>.json`；自动骨架不能直接当成品
5. 运行 `node scripts/build-seo.mjs`（会自动重写 `#viewRoot` 静态卡片）
6. 运行 `node scripts/audit-data.mjs`
7. 运行 `node scripts/guard-site.mjs`
8. 只有 guard 输出 `PASS` 才允许 commit / push

> 不要手动同步 `#viewRoot` 静态卡片，也不要手写 `items/` 下的页面；构建脚本会统一生成。

## 七、失败处理

- guard FAIL：停止，不要绕过，不要手改生成页
- 没有详情内容：不要生成空详情页，先保留原站链接
- 不确定图片版权：不要用
- 不确定事实：不要写进详情页

## 八、可直接贴给自动更新智能体的短提示

> 你是内容编辑，不是网页开发者。先读 `MUSE_UPDATE_RULES.md` 和本文件。只追加 `library.html` 的 `ITEMS` 与 `SUBCAT`；运行 `node scripts/seed-details.mjs` 后，逐条改写新条目的 `content/items/<id>.json`，不要手写 `items/` HTML，不要改 `c/`、`updates/`、`feed.xml`、`sitemap.xml`、`demo-data.js`、`CNAME` 或 workflow。正文至少 350 个中文字符、至少 3 个 block，回答“是什么/为什么看/适合谁/怎么用/有什么坑”；`callout` 只用 `info`、`tip`、`warn`；没有可靠图片宁可不放。最后运行 `node scripts/build-seo.mjs && node scripts/audit-data.mjs && node scripts/guard-site.mjs`，只有 guard 输出 PASS 才 commit/push。
