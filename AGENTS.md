# Personal-site agent instructions

## Image generation

When the user asks for a blog or project card image in the site's established visual style:

1. Read `prompts/torn-paper-collage/STYLE.md` before generating.
2. Use `prompts/torn-paper-collage/references/panda-collage.png` as the visual reference unless the user supplies a newer reference or asks for a different style.
3. Replace the template variables with the requested subject, scene, and position. Preserve the remaining style constraints unless the user explicitly overrides them.
4. Default to a square `1:1` composition for the current blog and project media slots.
5. Save approved final assets under `assets/blog/` or `assets/projects/` with descriptive lowercase filenames.

