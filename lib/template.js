// Minimal template engine: {{ var }} {{{ raw }}} {{#each xs}}…{{/each}} {{#if x}}…{{/if}}
// Blocks may nest arbitrarily; inside #each use {{ this.field }} (plus @index/@first/@last).

const OPEN = /\{\{#(each|if|unless)\s+([\w.@$-]+)\s*\}\}/;

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function resolve(path, ctx) {
  return path.split('.').reduce((cur, key) => {
    if (cur === null || cur === undefined) return undefined;
    if (key === 'this') return cur && cur.this !== undefined ? cur.this : cur;
    return cur[key];
  }, ctx);
}

// Given the text right after an opening tag, return the block body and what follows it.
function splitBlock(text, type) {
  const re = new RegExp(`\\{\\{#${type}\\s+[\\w.@$-]+\\s*\\}\\}|\\{\\{/${type}\\}\\}`, 'g');
  let depth = 1;
  let m;
  while ((m = re.exec(text))) {
    if (m[0][2] === '#') depth += 1;
    else if ((depth -= 1) === 0) {
      return { body: text.slice(0, m.index), rest: text.slice(m.index + m[0].length) };
    }
  }
  throw new Error(`template: unclosed {{#${type}}} block`);
}

function interpolate(text, ctx) {
  return text
    .replace(/\{\{\{\s*([\w.@$-]+)\s*\}\}\}/g, (_, p) => {
      const v = resolve(p, ctx);
      return v === undefined || v === null ? '' : String(v);
    })
    .replace(/\{\{\s*([\w.@$-]+)\s*\}\}/g, (_, p) => {
      const v = resolve(p, ctx);
      return v === undefined || v === null ? '' : escapeHtml(v);
    });
}

export function render(template, ctx = {}) {
  let out = '';
  let rest = template;
  for (;;) {
    const m = OPEN.exec(rest);
    if (!m) return out + interpolate(rest, ctx);
    out += interpolate(rest.slice(0, m.index), ctx);
    const [tag, type, key] = m;
    const { body, rest: tail } = splitBlock(rest.slice(m.index + tag.length), type);
    const value = resolve(key, ctx);
    if (type === 'each') {
      const items = Array.isArray(value) ? value : [];
      items.forEach((item, i) => {
        const scope = item && typeof item === 'object' ? { ...ctx, ...item } : { ...ctx };
        scope.this = item;
        scope['@index'] = i;
        scope['@first'] = i === 0;
        scope['@last'] = i === items.length - 1;
        out += render(body, scope);
      });
    } else {
      const truthy = Array.isArray(value) ? value.length > 0 : Boolean(value);
      if (truthy === (type === 'if')) out += render(body, ctx);
    }
    rest = tail;
  }
}
