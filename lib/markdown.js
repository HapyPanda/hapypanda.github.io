// markdown → html, with TeX protected from marked's inline parser.
//
// Pipeline: mask code (fenced + inline) → mask $$…$$ then $…$ → unmask code
//        → marked → restore math as .math-block / .math-inline (KaTeX renders in-browser).
// Masking code first is what keeps a `$` inside a Python snippet from being read as math.

import { Marked } from 'marked';
import GithubSlugger from 'github-slugger';

const CODE_PH = (i) => `%%CODE_${i}%%`;
const MATH_BLOCK_PH = (i) => `%%MATHBLOCK_${i}%%`;
const MATH_INLINE_PH = (i) => `%%MATHINLINE_${i}%%`;

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

/** Replace fenced blocks and inline code spans with inert placeholders. */
function maskCode(src) {
  const store = [];
  const keep = (text) => {
    store.push(text);
    return CODE_PH(store.length - 1);
  };

  const out = [];
  let fence = null;
  let buf = [];
  for (const line of src.split('\n')) {
    const m = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      buf.push(line);
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) {
        out.push(keep(buf.join('\n')));
        fence = null;
        buf = [];
      }
    } else if (m) {
      fence = m[1];
      buf = [line];
    } else {
      out.push(line);
    }
  }
  if (fence) out.push(keep(buf.join('\n'))); // unterminated fence: leave verbatim

  const text = out.join('\n').replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (m0) => keep(m0));
  return { text, store };
}

function unmaskCode(text, store) {
  return text.replace(/%%CODE_(\d+)%%/g, (_, i) => store[Number(i)]);
}

/** Pull $$…$$ (display, matched first) and $…$ (inline) out of the markdown. */
function maskMath(src) {
  const blocks = [];
  const inlines = [];
  let text = src.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    blocks.push(tex);
    return MATH_BLOCK_PH(blocks.length - 1);
  });
  // No `$` or newline inside, and no space right after the opener — keeps "$5 and $10" as prose.
  text = text.replace(/(^|[^\\$])\$(?![\s$])((?:\\\$|[^\n$])*?)\$(?!\d)/g, (_, pre, tex) => {
    inlines.push(tex);
    return pre + MATH_INLINE_PH(inlines.length - 1);
  });
  return { text, blocks, inlines };
}

/** Put the TeX back, delimiters intact so KaTeX auto-render can find it. */
function restoreMath(html, blocks, inlines) {
  const block = (i) => `$$${escapeHtml(blocks[Number(i)])}$$`;
  return html
    // A display equation on its own line becomes a lone paragraph — promote it to a div.
    .replace(/<p>\s*%%MATHBLOCK_(\d+)%%\s*<\/p>/g,
      (_, i) => `<div class="math-block">${block(i)}</div>`)
    // Anywhere else (inside a list item, a table cell…) a span keeps the HTML valid.
    .replace(/%%MATHBLOCK_(\d+)%%/g,
      (_, i) => `<span class="math-block">${block(i)}</span>`)
    .replace(/%%MATHINLINE_(\d+)%%/g,
      (_, i) => `<span class="math-inline">$${escapeHtml(inlines[Number(i)])}$</span>`);
}

/** Minutes to read, for mixed zh/en text. */
export function readingTime(src) {
  const cjk = (src.match(/[㐀-鿿぀-ヿ]/g) || []).length;
  const words = (src.replace(/[㐀-鿿぀-ヿ]/g, ' ').match(/[A-Za-z0-9''-]+/g) || []).length;
  return Math.max(1, Math.ceil(words / 220 + cjk / 400));
}

/** Flat h2/h3 list → nested { id, text, children }. */
function nestToc(flat) {
  const toc = [];
  for (const h of flat) {
    if (h.level === 2 || toc.length === 0) toc.push({ ...h, children: [] });
    else toc[toc.length - 1].children.push(h);
  }
  return toc;
}

export function renderMarkdown(body) {
  const slugger = new GithubSlugger();
  const headings = [];

  const masked = maskCode(body);
  const math = maskMath(masked.text);

  // Heading text is captured mid-parse, while math is still masked — put the TeX back
  // before slugging so anchors read `#为什么要除以-sqrtd`, not `#...-mathinline_3`.
  const restorePlain = (s) => s
    .replace(/%%MATHBLOCK_(\d+)%%/g, (_, i) => `$$${math.blocks[Number(i)]}$$`)
    .replace(/%%MATHINLINE_(\d+)%%/g, (_, i) => `$${math.inlines[Number(i)]}$`);

  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({
    renderer: {
      heading(text, level) {
        const plain = restorePlain(text.replace(/<[^>]*>/g, '')).trim();
        const id = slugger.slug(plain);
        if (level === 2 || level === 3) headings.push({ id, text: plain, level });
        const link = level <= 3
          ? `<a class="heading-anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>`
          : '';
        return `<h${level} id="${id}">${text}${link}</h${level}>\n`;
      },
      // Wrappers are emitted at build time: horizontal overflow must work with JS off.
      code(text, infostring) {
        const lang = (infostring || '').trim().split(/\s+/)[0];
        const cls = lang ? ` class="language-${lang}"` : '';
        return `<div class="code-block"><pre><code${cls}>${escapeHtml(text)}\n</code></pre></div>\n`;
      },
      table(header, body) {
        return `<div class="table-scroll"><table>\n<thead>\n${header}</thead>\n<tbody>${body}</tbody>\n</table></div>\n`;
      },
      image(href, title, text) {
        const t = title ? ` title="${title}"` : '';
        return `<img src="${href}" alt="${text || ''}"${t} loading="lazy" decoding="async">`;
      },
      link(href, title, text) {
        const external = /^https?:\/\//.test(href);
        const t = title ? ` title="${title}"` : '';
        const rel = external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${href}"${t}${rel}>${text}</a>`;
      },
    },
  });

  const html = marked.parse(unmaskCode(math.text, masked.store));

  return {
    html: restoreMath(html, math.blocks, math.inlines),
    toc: nestToc(headings),
    hasMath: math.blocks.length + math.inlines.length > 0,
    readingTime: readingTime(body),
  };
}
