// RSS 2.0 + sitemap. Both are byte-stable: no build timestamps, only content dates.

const xml = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]
));

const abs = (base, path) => `${base.replace(/\/$/, '')}${path}`;

export function renderRss(site, posts) {
  const latest = posts.length ? new Date(posts[0].date) : new Date(0);
  const items = posts.map((p) => `    <item>
      <title>${xml(p.title)}</title>
      <link>${xml(abs(site.baseURL, p.url))}</link>
      <guid isPermaLink="true">${xml(abs(site.baseURL, p.url))}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${xml(p.summary)}</description>
${p.tags.map((t) => `      <category>${xml(t.name)}</category>`).join('\n')}
    </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(site.title)}</title>
    <link>${xml(site.baseURL)}</link>
    <description>${xml(site.description)}</description>
    <language>${xml(site.lang)}</language>
    <lastBuildDate>${latest.toUTCString()}</lastBuildDate>
    <atom:link href="${xml(abs(site.baseURL, '/rss.xml'))}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

export function renderSitemap(site, urls) {
  const entries = urls.map(({ loc, lastmod }) => `  <url>
    <loc>${xml(abs(site.baseURL, loc))}</loc>${lastmod ? `
    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}
