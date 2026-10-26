# Approved preview migration

2026-10-26. Promoted the approved `design-samples/supermimic-preview/` design into the original root static generator. Local preview: http://localhost:3000/. Initial migration was kept local for user review.

## Visual checks

- Desktop at 1440 × 1000 and mobile at 390 × 844: approved black/white interface, original-color cover media, split desktop card, stacked mobile card, readable text-only cards, no horizontal document overflow.
- The entire top header, including brand and theme button, was removed after user review. The hero starts at the top of the page. Social/experience spacing and approved copy retained. About remains removed.
- Both themes checked; image filters are `none`. SeMo's Oral badge is rendered from the root publication data with theme-specific red; the final user-approved size is 18px with font-weight 700.
- Screenshots: `review/migration/desktop-blog.png`, `mobile-blog.png`, and `desktop-reader.png`. Local side-by-side reference comparisons: `desktop-comparison.png`, `mobile-comparison.png`. Source captures are in the retained preview's `review/revision-2/` directory. Captures differ slightly in vertical scroll position; card sizing, typography, spacing within cards, and media behavior match.

## Functional checks

- Browser: next-card control updates selected card/caption; opening an article changes to its canonical URL and opens the reader; closing returns to the originating page; archive search for “Claude” returns one article; refreshing that article opens its standalone route. Embedded Claude Memory flow SVG loads.
- Browser: Self-Attention article renders 28 KaTeX elements from local resources, code-copy control appears, and mobile document has no horizontal overflow. No captured browser console errors.
- Static integration test builds an isolated production site and verifies 24 HTML routes, local asset links, 8 RSS entries, 5 featured articles, all 5 publications, one Oral badge, and local KaTeX files. All article bodies and archive links exist in the generated HTML without JavaScript.
- A disposable draft fixture verifies native video markup/poster/alt text, draft exclusion in production, inclusion in preview, and correct newer/older navigation. No fake media was added to the real site. Actual playback was checked in the earlier approved prototype; the migration test checks generated video markup.
- Existing 11 template and 7 Markdown tests pass, as does the new integration suite. Production build and JavaScript syntax check pass.

## Maintenance

Root content remains the source of truth. Local fonts, icons and KaTeX ship with the static output. The original GitHub Pages workflow still deploys root `dist/`. The old standalone preview is retained locally for comparison and ignored by Git; production has no dependency on it.

Result: checks passed. The user reviewed the final version and explicitly authorized committing and pushing on 2026-10-26.
