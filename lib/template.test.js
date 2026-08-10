// Self-test for lib/template.js — run: node lib/template.test.js
import assert from 'node:assert/strict';
import { render } from './template.js';

let pass = 0;
const check = (name, actual, expected) => {
  assert.equal(actual, expected, `${name}\n  got:      ${actual}\n  expected: ${expected}`);
  console.log(`  ok  ${name}`);
  pass += 1;
};

check('variable + escaping',
  render('<h1>{{ title }}</h1>', { title: 'a<b & "c"' }),
  '<h1>a&lt;b &amp; &quot;c&quot;</h1>');

check('triple-stash passes html through',
  render('{{{ body }}}', { body: '<p>hi</p>' }),
  '<p>hi</p>');

check('missing var renders empty',
  render('[{{ nope }}]', {}),
  '[]');

check('each with this.field',
  render('{{#each posts}}<li>{{ this.title }}</li>{{/each}}', {
    posts: [{ title: 'A' }, { title: 'B' }],
  }),
  '<li>A</li><li>B</li>');

check('each over scalars, @index',
  render('{{#each tags}}{{ @index }}:{{ this }} {{/each}}', { tags: ['x', 'y'] }),
  '0:x 1:y ');

check('if / unless',
  render('{{#if math}}K{{/if}}{{#unless math}}N{{/unless}}', { math: true }),
  'K');

check('empty array is falsy for if',
  render('{{#if tags}}T{{/if}}-', { tags: [] }),
  '-');

check('nested each inside each, outer scope visible',
  render('{{#each groups}}[{{ this.year }}{{#each this.posts}}<{{ this.title }}@{{ site }}>{{/each}}]{{/each}}', {
    site: 'S',
    groups: [
      { year: 2026, posts: [{ title: 'p1' }, { title: 'p2' }] },
      { year: 2025, posts: [{ title: 'p3' }] },
    ],
  }),
  '[2026<p1@S><p2@S>][2025<p3@S>]');

check('if nested inside each',
  render('{{#each posts}}{{ this.title }}{{#if this.draft}}(draft){{/if}};{{/each}}', {
    posts: [{ title: 'A', draft: true }, { title: 'B', draft: false }],
  }),
  'A(draft);B;');

check('each nested inside if',
  render('{{#if show}}{{#each xs}}{{ this }}{{/each}}{{/if}}', { show: 1, xs: [1, 2, 3] }),
  '123');

assert.throws(() => render('{{#each xs}}oops', { xs: [] }), /unclosed/);
console.log('  ok  unclosed block throws');
pass += 1;

console.log(`\ntemplate.js: ${pass}/${pass} passed`);
