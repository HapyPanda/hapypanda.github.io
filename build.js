#!/usr/bin/env node
// Static site generator. Single source of truth: posts/*.md front matter + data/*.json.
// Every page, feed and tag index below is derived from those — never duplicated by hand.
//
//   node build.js              production build
//   node build.js --drafts     include draft:true posts
//   node build.js --watch      rebuild on change

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import { render, escapeHtml } from './lib/template.js';
import { getMedia } from './lib/media.js';
import { renderMarkdown } from './lib/markdown.js';
import { renderRss, renderSitemap } from './lib/feed.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const p = (...s) => path.join(ROOT, ...s);

const ARGS = new Set(process.argv.slice(2));
const INCLUDE_DRAFTS = ARGS.has('--drafts');
const WATCH = ARGS.has('--watch');

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
};

class BuildError extends Error {}

// ── helpers ───────────────────────────────────────────────────────────────────
const readJson = (rel) => JSON.parse(fs.readFileSync(p(rel), 'utf8'));

function writeFile(rel, content) {
  const dest = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      copyDir(src, dst);
    } else {
      fs.copyFileSync(src, dst);
    }
  }
}

const normalizeTag = (t) => String(t).trim().toLowerCase().replace(/\s+/g, '-');
const iso = (d) => new Date(d).toISOString().slice(0, 10);

/** Add a content hash to local media URLs so replacing a same-named file refreshes it. */
function versionLocalAsset(url) {
  if (typeof url !== 'string' || !url.startsWith('/assets/')) return url;
  const pathname = url.split(/[?#]/, 1)[0];
  const source = p(pathname.replace(/^\/+/, ''));
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) return url;
  const version = createHash('sha1')
    .update(fs.readFileSync(source))
    .digest('hex')
    .slice(0, 10);
  return `${pathname}?v=${version}`;
}

/** Normalize image / GIF / video fields once for every template. */
function mediaFields(item) {
  const media = getMedia(item);
  if (!media || media.src.includes('generic-torn-paper-placeholder')) return {
    hasMedia: false, mediaClass: 'text-only', mediaHtml: '', readerMediaHtml: '',
  };
  const src = escapeHtml(versionLocalAsset(media.src));
  const alt = escapeHtml(media.alt);
  const isVideo = media.type === 'video';
  const markup = (className = '') => isVideo
    ? `<video class="${className}" src="${src}"${media.poster ? ` poster="${escapeHtml(versionLocalAsset(media.poster))}"` : ''} aria-label="${alt}" controls playsinline muted loop preload="metadata"></video>`
    : `<img class="${className}" src="${src}" alt="${alt}" loading="lazy" decoding="async" draggable="false">`;
  return { hasMedia: true, mediaClass: 'has-media', mediaType: media.type, isVideo,
    mediaHtml: markup(), readerMediaHtml: markup('reader-cover') };
}

/** Bold the site owner inside an author string. Returns HTML. */
function highlightAuthor(authors, aliases) {
  let out = authors.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  for (const alias of aliases || []) {
    out = out.split(alias).join(`<strong>${alias}</strong>`);
    if (out.includes('<strong>')) break;
  }
  return out;
}

// ── 3+4. load and validate posts ──────────────────────────────────────────────
function loadPosts() {
  const dir = p('posts');
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
    : [];

  const posts = [];
  const drafts = [];
  const slugs = new Map();

  for (const file of files) {
    const { data: meta, content: body } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
    const where = `posts/${file}`;

    for (const field of ['title', 'date', 'summary']) {
      if (meta[field] === undefined || meta[field] === null || meta[field] === '') {
        throw new BuildError(`${where}: front matter is missing required field "${field}"`);
      }
    }
    const date = new Date(meta.date);
    if (Number.isNaN(date.getTime())) {
      throw new BuildError(`${where}: date "${meta.date}" is not a valid date (use YYYY-MM-DD)`);
    }

    const slug = normalizeTag(meta.slug || file.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''));
    if (slugs.has(slug)) {
      throw new BuildError(`${where}: slug "${slug}" already used by ${slugs.get(slug)}`);
    }
    slugs.set(slug, where);

    const tags = [...new Set((meta.tags || []).map(normalizeTag))].filter(Boolean);
    const isDraft = meta.draft === true;
    const rendered = renderMarkdown(body);

    const sourceImage = meta.image ? String(meta.image) : '';
    const hasCover = Boolean(sourceImage && !sourceImage.includes('generic-torn-paper-placeholder'));
    const post = {
      ...mediaFields(meta),
      slug,
      url: `/posts/${slug}/`,
      file: where,
      title: String(meta.title),
      summary: String(meta.summary),
      image: hasCover ? versionLocalAsset(sourceImage) : '',
      hasCover,
      imageAlt: meta.imageAlt ? String(meta.imageAlt) : String(meta.title),
      heroWide: meta.heroWide === true,
      date: date.toISOString(),
      dateISO: iso(date),
      year: date.getUTCFullYear(),
      draft: isDraft,
      math: meta.math === undefined ? true : meta.math === true,
      tags: tags.map((name) => ({ name, url: `/tags/${name}/` })),
      tagNames: tags,
      firstTag: tags[0],
      tagString: tags.join(" "),
      content: rendered.html,
      toc: rendered.toc,
      readingTime: rendered.readingTime,
    };
    (isDraft ? drafts : posts).push(post);
  }

  posts.sort((a, b) => new Date(b.date) - new Date(a.date) || a.slug.localeCompare(b.slug));

  return { posts, drafts };
}

// ── build ─────────────────────────────────────────────────────────────────────
function build() {
  const started = Date.now();
  const site = readJson('data/site.json');
  const assetVersion = createHash('sha1')
    .update(fs.readFileSync(p('static/css/style.css')))
    .update(fs.readFileSync(p('static/js/main.js')))
    .update(fs.readFileSync(p('static/js/theme.js')))
    .digest('hex')
    .slice(0, 10);
  const icons = Object.fromEntries(fs.readdirSync(p('static/img/icons')).filter(name => name.endsWith('.svg'))
    .map(name => [name.slice(0, -4), fs.readFileSync(p('static/img/icons', name), 'utf8')]));
  const publications = readJson('data/publications.json').map((pub, index) => ({
    ...pub, ...mediaFields(pub), indexPadded: String(index + 1).padStart(2, '0'),
    authorsHtml: highlightAuthor(pub.authors, site.authorAliases),
    primaryHref: pub.links?.[0]?.href || '#research',
  }));
  const projects = readJson('data/projects.json').map((project, index) => ({
    ...project, indexPadded: String(index + 1).padStart(2, '0'), tagLabel: project.tags.join(' / '),
  }));

  const all = loadPosts();
  const posts = INCLUDE_DRAFTS ? [...all.posts, ...all.drafts].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  ) : all.posts;

  posts.forEach((post, index) => {
    post.newer = posts[index - 1] ? { title: posts[index - 1].title, url: posts[index - 1].url } : null;
    post.older = posts[index + 1] ? { title: posts[index + 1].title, url: posts[index + 1].url } : null;
  });
  const tagFilters = [...new Set(posts.flatMap(post => post.tagNames))].sort()
    .map(name => ({ name, url: `/tags/${name}/` }));

  const tpl = (name) => fs.readFileSync(p('templates', name), 'utf8');
  const base = tpl('base.html');

  // 1. clean dist
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const page = (bodyTpl, ctx, meta) => render(base, {
    site, icons,
    ogType: meta.isPost ? 'article' : 'website',
    assetVersion,
    ...ctx,
    ...meta,
    canonicalAbs: `${site.baseURL.replace(/\/$/, '')}${meta.canonical}`,
    nav: site.nav.map((item) => ({
      ...item,
      active: item.href === '/' ? meta.canonical === '/' : meta.canonical.startsWith(item.href),
    })),
    body: render(bodyTpl, { site, icons, ...ctx }),
  });

  // 7a. home
  writeFile('index.html', page(tpl('home.html'), {
    archiveHtml: render(tpl('archive.html'), { icons, allPosts: posts, tagFilters, postCount: posts.length, listTitle: '所有想法，都在这里。', allTags: true }),
    featuredCount: Math.min(posts.length, site.homeBlogCount || 5),
    featuredCountPadded: String(Math.min(posts.length, site.homeBlogCount || 5)).padStart(2, '0'),
    publications: publications.slice(0, site.homePublicationCount || publications.length),
    projects,
    posts: posts.slice(0, site.homeBlogCount || 5).map((post, index) => ({
      ...post,
      index: index + 1,
    })),
    allPosts: posts,
    morePosts: posts.length > (site.homeBlogCount || 5),
    experience: [...(site.experience || [])].reverse(),
  }, {
    pageTitle: site.title,
    metaDescription: site.description,
    canonical: '/',
    isHome: true,
    math: false,
  }));

  // 7b. one page per post
  const postTpl = tpl('post.html');
  for (const post of posts) {
    writeFile(`posts/${post.slug}/index.html`, page(postTpl, { post, toc: post.toc }, {
      pageTitle: `${post.title} · ${site.title}`,
      metaDescription: post.summary,
      canonical: post.url,
      math: post.math,
      isPost: true,
    }));
  }

  // 7c. blog list and tag pages share list.html
  const listTpl = tpl('list.html');
  const list = (rel, ctx, meta) => writeFile(rel, page(listTpl, { ...ctx,
    archiveHtml: render(tpl('archive.html'), { icons, ...ctx, postCount: ctx.allPosts.length }),
  }, meta));

  list('blog/index.html', {
    tagFilters,
    allTags: true,
    listTitle: '所有想法，都在这里。',
    allPosts: posts,
    listSubtitle: `共 ${posts.length} 篇`,
  }, {
    pageTitle: `博客 · ${site.title}`,
    metaDescription: `${site.title} 的全部文章`,
    canonical: '/blog/',
    math: false,
  });

  const tagCounts = new Map();
  for (const post of posts) for (const t of post.tagNames) {
    tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  }
  for (const tag of [...tagCounts.keys()].sort()) {
    const tagged = posts.filter((post) => post.tagNames.includes(tag));
    list(`tags/${tag}/index.html`, {
      listTitle: `#${tag}`,
      tagFilters: tagFilters.map((item) => ({ ...item, active: item.name === tag })),
      listSubtitle: `${tagged.length} 篇文章`,
      allPosts: tagged,
    }, {
      pageTitle: `#${tag} · ${site.title}`,
      metaDescription: `标签 ${tag} 下的文章`,
      canonical: `/tags/${tag}/`,
      math: false,
    });
  }

  // 7d. feeds, 404, static
  writeFile('rss.xml', renderRss(site, posts));
  writeFile('sitemap.xml', renderSitemap(site, [
    { loc: '/', lastmod: posts[0]?.date },
    { loc: '/blog/', lastmod: posts[0]?.date },
    ...[...tagCounts.keys()].sort().map((t) => ({ loc: `/tags/${t}/` })),
    ...posts.map((post) => ({ loc: post.url, lastmod: post.date })),
  ]));
  writeFile('404.html', page(tpl('404.html'), {}, {
    pageTitle: `404 · ${site.title}`,
    metaDescription: 'Page not found',
    canonical: '/404.html',
    math: false,
  }));
  writeFile('.nojekyll', '');
  writeFile('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.baseURL}/sitemap.xml\n`);
  if (fs.existsSync(p('static'))) copyDir(p('static'), DIST);
  if (fs.existsSync(p('assets'))) copyDir(p('assets'), p('dist', 'assets'));
  copyDir(p('node_modules/katex/dist'), p('dist/vendor/katex'));

  // 8. summary
  const singles = [...tagCounts.entries()].filter(([, n]) => n === 1).map(([t]) => t);
  console.log(`\n${C.bold('build')} ${C.dim(`→ dist/`)}`);
  console.log(`  posts      ${posts.length}${INCLUDE_DRAFTS && all.drafts.length ? C.dim(` (incl. ${all.drafts.length} draft)`) : ''}`);
  console.log(`  drafts     ${all.drafts.length}${!INCLUDE_DRAFTS && all.drafts.length ? C.dim(' (skipped)') : ''}`);
  console.log(`  tags       ${tagCounts.size}`);
  for (const [tag, n] of [...tagCounts.entries()].sort()) {
    const line = `    ${tag.padEnd(18)} ${n}`;
    console.log(n === 1 ? C.yellow(`${line}  ← only 1 post, typo?`) : line);
  }
  if (singles.length) console.log(C.yellow(`  ${singles.length} tag(s) used once — check spelling.`));
  console.log(`  pages      ${1 + posts.length + 1 + tagCounts.size + 1}`);
  console.log(`  ${C.green('done')} in ${Date.now() - started}ms\n`);
}

function safeBuild() {
  try {
    build();
    return true;
  } catch (err) {
    if (err instanceof BuildError) {
      console.error(`\n${C.red('build failed')}  ${err.message}\n`);
    } else {
      console.error(`\n${C.red('build failed')}`, err);
    }
    if (!WATCH) process.exit(1);
    return false;
  }
}

safeBuild();

if (WATCH) {
  const watched = ['posts', 'templates', 'static', 'assets', 'data', 'lib', 'build.js']
    .filter((d) => fs.existsSync(p(d)));
  let timer = null;
  for (const dir of watched) {
    fs.watch(p(dir), { recursive: true }, (_e, file) => {
      if (file && (file.includes('.DS_Store') || file.startsWith('.'))) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        console.log(C.dim(`\n· changed: ${dir}/${file || ''}`));
        safeBuild();
      }, 60);
    });
  }
  console.log(C.dim(`watching ${watched.join(', ')} — ctrl-c to stop`));
}
