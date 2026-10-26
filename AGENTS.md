# Personal-site agent instructions

## Image generation

When the user asks for a blog or project card image in the site's established visual style:

1. Read `prompts/torn-paper-collage/STYLE.md` before generating.
2. Use `prompts/torn-paper-collage/references/panda-collage.png` as the visual reference unless the user supplies a newer reference or asks for a different style.
3. Replace the template variables with the requested subject, scene, and position. Preserve the remaining style constraints unless the user explicitly overrides them.
4. Default to a square `1:1` composition for the current blog and project media slots.
5. Save approved final assets under `assets/blog/` or `assets/projects/` with descriptive lowercase filenames.

## Approved site design

The approved SuperMimic-inspired preview has been promoted into the root static site.

- Edit root `templates/`, `static/`, `data/`, and `posts/`; production must not depend on `design-samples/supermimic-preview/`.
- The user has removed the entire top header, including its brand and theme button. Do not restore it without a request.
- Keep all media in original color. Support image, GIF, and native video in blog and publication media slots; use contain sizing.
- Keep the approved split-layout article carousel, responsive stacked cards, and full-width text-only cards when media is absent.
- Keep canonical `/posts/<slug>/`, `/blog/`, `/tags/<tag>/`, RSS, and sitemap functional without JavaScript. Reader dialogs are progressive enhancements.
- The hero subtitle `Reserch in AI and Memory` is the user's exact requested copy; do not silently correct it.
- Research copy is “交互式视频生成，视频生成物理真实性”; SeMo's `presentation: "Oral"` lives in `data/publications.json` and is red in both themes.
- The About section was intentionally removed. Do not restore it without a request.
- Keep changes local until the user explicitly authorizes pushing.
