# personal-site

张启元的个人主页与博客。采用黑白界面、彩色媒体、文章轮播、独立文章页与阅读弹窗。内容继续由 `posts/*.md` 和 `data/*.json` 维护，构建输出完整静态 HTML。

```sh
npm ci
npm run build                       # 生成 dist/
npm run serve -- --listen 3000       # 本地预览
npm run dev                         # 监听文件并重建，包含草稿；另开终端运行 serve
npm test                            # 模板、Markdown 和整站构建检查
```

## 维护内容

| 内容 | 位置 |
|---|---|
| 首页姓名、介绍、社交链接、经历、域名 | `data/site.json` |
| 论文、作者、会议、链接、Oral 标记 | `data/publications.json` |
| 项目卡片 | `data/projects.json` |
| 文章 | `posts/YYYY-MM-DD-slug.md` |
| 页面结构 | `templates/*.html` |
| 字体、颜色、间距、响应式规则 | `static/css/style.css` |
| 轮播、主题、搜索、阅读弹窗 | `static/js/main.js` |

新增文章示例：

```markdown
---
title: "文章标题"
date: 2026-08-01
summary: "首页、归档和 RSS 使用的摘要。"
tags: ["research", "notes"]
image: "/assets/blog/article-cover.png"
imageAlt: "图片内容说明"
draft: false
math: true
---

正文。行内公式 $a_i * b_j$，块级公式用两个美元符号包裹。
```

`title`、`date`、`summary` 必填；`slug` 默认取去掉日期前缀后的文件名，必须唯一。标签自动转为小写、空格转连字符。`draft: true` 在生产构建中排除。`math` 默认开启，文章中有公式时才加载本地 KaTeX。

首页展示最新 5 篇文章；`/blog/` 展示全部文章；`/tags/<tag>/` 展示标签文章。独立文章网址仍是 `/posts/<slug>/`，刷新、分享和关闭 JavaScript 后均能阅读。首页点击文章时增强为阅读弹窗，地址栏同步为独立文章网址。旧预览的 `/?post=<slug>` 链接也可打开对应文章。

## 图片、GIF 与视频

博客封面和论文媒体都保持原色，使用 `object-fit: contain` 完整展示。没有媒体的文章显示文字卡片。图片和 GIF 使用 `image`；视频使用以下字段，亦可用于文章 front matter：

```yaml
video:
  src: /assets/blog/example.mp4
  poster: /assets/blog/example-poster.png
  alt: 视频内容说明
```

也可使用 `video: /assets/blog/example.webm` 配合顶层 `poster`、`imageAlt`，或 `media: {src, type, poster, alt}`。视频使用浏览器原生控件、静音、行内播放；视频播放、阅读弹窗打开、页面隐藏或用户操作轮播时，自动切换会暂停。系统开启减少动态效果时禁用自动切换。

论文的 `presentation: "Oral"` 会显示红色标记。论文和项目数据仍在原来的 JSON 文件中维护，无需修改预览副本。

配图生成规范：[`prompts/torn-paper-collage/STYLE.md`](prompts/torn-paper-collage/STYLE.md)，参考图：[`prompts/torn-paper-collage/references/panda-collage.png`](prompts/torn-paper-collage/references/panda-collage.png)。默认方形素材；保存在 `assets/blog/` 或 `assets/projects/`。

## 构建与部署

`build.js` 生成首页、文章、归档、标签、RSS、sitemap 与 404；静态资源及本地 KaTeX 自动复制到 `dist/`。字体与数学渲染不依赖 CDN。Inter、Inter Tight 的许可保存在 `static/fonts/`；界面图标来自 Phosphor。

GitHub Actions 保持原流程：`npm ci` → `npm test` → `npm run build`，部署根目录 `dist/`。更新 `data/site.json` 的 `baseURL` 可调整 canonical、RSS 和 sitemap 的绝对域名。`dist/` 不提交 Git。

视觉检查记录见 `design-qa.md`。

推送到 `main` 会触发 GitHub Pages 自动构建与部署。
