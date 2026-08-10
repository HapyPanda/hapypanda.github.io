# personal-site

个人学术主页 + 博客。原生 HTML/CSS，加一个约 600 行的 Node 静态生成器。没有前端框架，没有前端路由，没有客户端取数——所有 HTML 在构建时就是完整的。

```
npm install        # 只有 3 个依赖：gray-matter / marked / github-slugger
npm run dev        # 含草稿 + 文件监听
npm run build      # 生产构建，产物在 dist/
npm run serve      # 本地预览 dist/
npm test           # 模板引擎与 markdown 渲染的自测
```

---

## 新增一篇文章（就三步）

1. 在 `posts/` 新建 `YYYY-MM-DD-slug.md`
2. 填 front matter（`title` / `date` / `summary` 必填）
3. `git push`

```markdown
---
title: "文章标题"
date: 2026-08-01
summary: "一句话摘要，会出现在首页卡片、列表页和 RSS 里。"
tags: ["deep-learning", "notes"]
image: "/assets/blog/article-cover.jpg"
draft: false
math: true
---

正文从这里开始。行内公式 $a_i * b_j$，块级公式：

$$\int_0^1 x^2\,dx = \frac{1}{3}$$
```

**没有第四步。** 首页卡片、`/blog/`、`/tags/<tag>/`、`rss.xml`、`sitemap.xml`、上下篇链接、阅读时长、目录，全部由 `build.js` 从这份 front matter 算出来。文章元数据只存在于这一个地方。

字段说明：

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | ✅ | 缺失则构建报错退出 |
| `date` | ✅ | `YYYY-MM-DD`，不能被 `new Date()` 解析则报错 |
| `summary` | ✅ | 卡片与 RSS 描述 |
| `tags` | | 自动规范化（小写、空格转 `-`）；只出现 1 次的 tag 会在构建输出里黄色告警，用来抓拼写错误 |
| `image` | | 首页与博客列表卡片的方形封面图；不填时显示统一占位图 |
| `imageAlt` | | 封面图替代文本；缺省使用文章标题 |
| `draft` | | `true` 时生产构建跳过，`npm run dev` 会包含 |
| `math` | | 缺省 `true`；`false` 时该页不加载 KaTeX |
| `slug` | | 缺省时由文件名去掉日期前缀生成；全站唯一，冲突则报错 |

## 改主页内容

| 想改什么 | 改哪里 |
|---|---|
| 姓名、简介、导航、社交链接、`baseURL` | `data/site.json` |
| 论文列表 | `data/publications.json`（可选 `image`，支持静态图/GIF；或用 `video` 放 MP4、`poster` 放视频封面；`authorAliases` 里的名字会自动加粗） |
| 项目卡片 | `data/projects.json`（可选 `image`） |
| 配色 / 字体 / 间距 | `static/css/style.css` 顶部的 `:root` token 区 |
| PDF、CV | 放进 `static/files/`，用 `/files/xxx.pdf` 引用 |

> `data/publications.json` 里目前有 `TODO` 占位（作者列表、会议名、arXiv 链接），发布前记得补全。

## 生成博客 / 项目配图

统一的撕纸拼贴风格规范放在 [`prompts/torn-paper-collage/STYLE.md`](prompts/torn-paper-collage/STYLE.md)，参考图放在 [`prompts/torn-paper-collage/references/panda-collage.png`](prompts/torn-paper-collage/references/panda-collage.png)。

以后可以直接说：“使用 personal-site 的 torn-paper collage 标准，生成……”。Codex 会读取模板、替换主题与位置变量，并默认按照当前博客和项目卡片使用的 `1:1` 比例生成。

## 目录结构

```
build.js              生成器主程序：清空 dist → 读数据 → 校验 → 渲染 → 写文件
lib/template.js       ~70 行模板引擎：{{ var }} {{{ raw }}} {{#each}} {{#if}}
lib/markdown.js       markdown → html，公式保护 + TOC + 阅读时长
lib/feed.js           RSS + sitemap
data/*.json           站点配置、论文、项目
templates/*.html      base / home / post / list / 404
posts/*.md            文章（唯一的文章数据源）
prompts/              Image Generator 的可复用提示词与参考图
assets/blog/           博客卡片与文章封面
assets/projects/       项目卡片配图
assets/publications/   论文预览图、GIF 与视频素材
static/               直接拷进 dist 的资源
dist/                 构建产物，不提交 git（由 Actions 部署）
```

## 部署

推到 `main` 就会自动部署：`.github/workflows/deploy.yml` 跑 `npm ci` → `npm test` → `npm run build`，再把 `dist/` 交给 GitHub Pages。

仓库上首次设置：

1. 仓库名建议 `<用户名>.github.io`（否则站点在 `/<repo>/` 子路径下，需要把模板里的根相对路径改成带前缀的）
2. Settings → Pages → **Source: GitHub Actions**
3. 改 `data/site.json` 的 `baseURL` 为真实域名（RSS/sitemap 的绝对链接靠它）

`dist/` 不进 git，`dist/.nojekyll` 由构建生成（防止 GitHub 再用 Jekyll 处理一遍）。
PR 会跑 `.github/workflows/ci.yml`，构建失败就不能合——front matter 校验因此是有牙齿的。

## 一些实现上的选择

- **公式保护**：`marked` 会把 `$a_i * b_j$` 里的 `_`、`*` 当成 markdown 语法。渲染前先把 fenced code 和行内 code 挡掉（代码里的 `$` 不是公式），再把 `$$…$$` / `$…$` 换成占位符，跑完 `marked` 再还原成 `.math-block` / `.math-inline`，交给浏览器端 KaTeX。见 `lib/markdown.js` 与 `lib/markdown.test.js` 的三个用例。
- **代码高亮**在浏览器端（highlight.js CDN）。做构建时高亮需要多装一个包，按约定没有自己加——想要的话说一声。
- **构建幂等**：连跑两次 `npm run build` 产物字节一致（RSS 的 `lastBuildDate` 用最新文章日期而非当前时间）。构建过程不联网。
- **无 JS 也完整可读**：`static/js/main.js` 只做主题切换、TOC 高亮、代码复制按钮；目录是默认展开的 `<details>`，表格与代码块的横向滚动容器在构建时就写好了。

## 迁移到 Hugo 的话

front matter 字段可以直接复用：`title` / `date` / `summary` / `tags` / `draft` / `slug` 在 Hugo 里都是内置字段，语义一致（Hugo 用 `summary` 覆盖自动摘要，`slug` 同名同义）。唯一要处理的是 `math: true`——Hugo 没有内置这个开关，得在主题模板里自己读 `.Params.math`；另外 Hugo 默认按目录组织内容，`posts/*.md` 平铺结构要放到 `content/posts/` 下。
