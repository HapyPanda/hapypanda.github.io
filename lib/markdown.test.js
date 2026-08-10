// Self-test for lib/markdown.js — run: node lib/markdown.test.js
import assert from 'node:assert/strict';
import { renderMarkdown, readingTime } from './markdown.js';

let n = 0;
const show = (name, html) => {
  console.log(`\n[case ${++n}] ${name}\n${html.trim()}`);
};

// ---- case 1: inline math whose contents look like markdown emphasis ------------
{
  const { html } = renderMarkdown('Let $a_i * b_j$ and $x_1*x_2$ be given.');
  show('inline math with _ and *', html);
  assert.ok(html.includes('$a_i * b_j$'), 'underscore/asterisk must survive verbatim');
  assert.ok(html.includes('$x_1*x_2$'));
  assert.ok(!html.includes('<em>'), 'marked must not turn _…_ into <em>');
  assert.equal((html.match(/class="math-inline"/g) || []).length, 2);
}

// ---- case 2: a Python code block containing $ ---------------------------------
{
  const src = [
    'Shell interpolation in Python:',
    '',
    '```python',
    'cost = f"${price:.2f} for {n} tokens"  # $ is not math',
    'pattern = r"^\\$\\d+$"',
    '```',
    '',
    'And inline `echo $PATH` too.',
  ].join('\n');
  const { html } = renderMarkdown(src);
  show('$ inside python fence and inline code', html);
  assert.ok(!html.includes('math-inline'), 'no math may be detected inside code');
  assert.ok(html.includes('<code class="language-python">'));
  assert.ok(html.includes('${price:.2f}'), 'code content untouched');
  assert.ok(html.includes('<code>echo $PATH</code>'));
}

// ---- case 3: display math adjacent to a list ---------------------------------
{
  const src = [
    'Steps:',
    '',
    '- normalise the scores',
    '$$\\mathrm{softmax}(z)_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}$$',
    '- take the argmax',
    '',
    '$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$',
  ].join('\n');
  const { html } = renderMarkdown(src);
  show('$$ block touching a list, and standing alone', html);
  assert.ok(html.includes('<div class="math-block">$$\\int_0^1'), 'own-paragraph → div');
  assert.ok(/<li>[\s\S]*<span class="math-block">\$\$\\mathrm\{softmax\}/.test(html),
    'inside a list item → span, so the HTML stays valid');
  assert.ok(!html.includes('<div class="math-block">$$\\mathrm{softmax}'), 'no <div> inside <li><p>');
  assert.ok(html.includes('\\frac{e^{z_i}}'), 'braces survive');
}

// ---- extras -------------------------------------------------------------------
{
  const { toc, readingTime: rt, hasMath } = renderMarkdown(
    '## First Section\n\ntext\n\n### Sub A\n\n### Sub B\n\n## Second Section\n'
  );
  assert.deepEqual(
    toc.map((h) => [h.id, h.children.map((c) => c.id)]),
    [['first-section', ['sub-a', 'sub-b']], ['second-section', []]]
  );
  console.log(`\n[case ${++n}] nested TOC + slugs: ok  (${JSON.stringify(toc.map(h => h.id))})`);
  assert.equal(hasMath, false);
  assert.equal(rt, 1);
  assert.equal(readingTime('word '.repeat(440)), 2);
  assert.equal(readingTime('注意力机制'.repeat(160)), 2); // 800 cjk chars
  console.log(`[case ${++n}] reading time (en 440w → 2min, zh 800字 → 2min): ok`);
  const mathHead = renderMarkdown('## 为什么要除以 $\\sqrt{d}$\n\ntext\n');
  assert.deepEqual(mathHead.toc.map((h) => [h.id, h.text]),
    [['为什么要除以-sqrtd', '为什么要除以 $\\sqrt{d}$']]);
  assert.ok(mathHead.html.includes('id="为什么要除以-sqrtd"'));
  assert.ok(!mathHead.toc[0].text.includes('MATHINLINE'), 'no placeholder may leak into the TOC');
  console.log(`[case ${++n}] math in a heading → clean slug + TeX kept in TOC: ok`);

  const money = renderMarkdown('It costs $5 and $10 total.');
  assert.ok(!money.html.includes('math-inline'), 'prose dollars are not math');
  console.log(`[case ${++n}] "$5 and $10" not treated as math: ok`);
}

console.log(`\nmarkdown.js: ${n}/${n} passed`);
