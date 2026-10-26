import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { getMedia } from './media.js';

// Build a disposable project using the production generator, templates and content.
// Extra drafts exercise media that the real homepage does not yet contain.
const root = path.resolve(import.meta.dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-site-test-'));
try {
  for (const name of ['build.js', 'package.json', 'lib', 'templates', 'data', 'posts']) fs.cpSync(path.join(root, name), path.join(tmp, name), { recursive: true });
  for (const name of ['static', 'assets', 'node_modules']) fs.symlinkSync(path.join(root, name), path.join(tmp, name), 'dir');
  const draft = path.join(tmp, 'posts/2099-01-01-video-fixture.md');
  fs.writeFileSync(draft, `---\ntitle: Video fixture\ndate: 2099-01-01\nsummary: A draft with native video controls\nvideo:\n  src: /assets/example.webm\n  poster: /assets/example.png\n  alt: A motion example\ntags: [notes]\ndraft: true\n---\nFixture body.\n`);
  const build = (...args) => execFileSync(process.execPath, ['build.js', ...args], { cwd: tmp, stdio: 'pipe' });
  const read = name => fs.readFileSync(path.join(tmp, 'dist', name), 'utf8');
  build();
  assert.ok(!fs.existsSync(path.join(tmp, 'dist/posts/video-fixture/index.html')), 'production excludes drafts');
  const home = read('index.html');
  assert.equal((home.match(/class="highlight-card /g) || []).length, 5);
  assert.equal((home.match(/class="research-item"/g) || []).length, 5);
  assert.equal((home.match(/class="presentation-badge"/g) || []).length, 1);
  assert.match(home, /presentation-badge">Oral<\/strong>/);
  assert.match(home, /Reserch in AI and Memory/);
  assert.ok(!home.includes('?post='), 'links use static canonical routes');
  const sitemap = read('sitemap.xml');
  const routes = [...sitemap.matchAll(/<loc>https:\/\/hapypanda.github.io([^<]*)<\/loc>/g)].map(m => m[1]);
  assert.equal(routes.length, 23, 'home, archive, eight articles, thirteen tag pages');
  for (const route of [...routes, '/404.html']) {
    const file = route.endsWith('/') ? route + 'index.html' : route;
    const html = read(file.replace(/^\//, ''));
    assert.ok(!html.includes('{{'), `no unresolved templates in ${route}`);
    assert.ok(html.includes('<body id="top">') && html.includes('<main id="main">'), `shared layout and top anchor in ${route}`);
    assert.ok(!html.includes('class="site-header"'), `top bar removed in ${route}`);
    for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
      const target = match[1];
      const local = path.join(tmp, 'dist', target.endsWith('/') ? target + 'index.html' : target);
      assert.ok(fs.existsSync(local), `${route} references missing ${target}`);
    }
  }
  const article = read('posts/claude-memory-system/index.html');
  assert.match(article, /class="reader-article"/);
  assert.match(article, /Claude Memory 的预填、写入与检索流程/);
  assert.match(article, /\/assets\/blog\/claude-memory-flow.svg/);
  assert.equal((read('rss.xml').match(/<item>/g) || []).length, 8);
  assert.ok(fs.existsSync(path.join(tmp, 'dist/vendor/katex/contrib/auto-render.min.js')));
  assert.ok(fs.existsSync(path.join(tmp, 'dist/vendor/katex/fonts/KaTeX_Main-Regular.woff2')));
  build('--drafts');
  const draftHome = read('index.html');
  assert.match(draftHome, /<video[^>]+aria-label="A motion example"[^>]+controls playsinline muted loop preload="metadata"/);
  assert.match(draftHome, /poster="\/assets\/example.png"/);
  const draftArticle = read('posts/video-fixture/index.html');
  assert.match(draftArticle, /class="reader-cover"[^>]+example.webm/);
  assert.match(draftArticle, /更早的文章<strong>注意力的发展历史/);
  assert.match(read('posts/attention-history/index.html'), /更新的文章<strong>Video fixture/);
  assert.equal(getMedia({ image: '/example.gif' }).type, 'image');
  assert.equal(getMedia({ media: { src: '/example.MP4?v=3' } }).type, 'video');
  assert.equal(getMedia({ video: { src: '/movie.webm', poster: '/poster.png' }, image: '/fallback.png' }).poster, '/poster.png');
  assert.equal(getMedia({ title: 'Text only' }), null);
  console.log('site: static routes, content, assets, feeds, draft navigation and media passed');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
