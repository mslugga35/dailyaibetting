import { test } from 'node:test';
import assert from 'node:assert/strict';

const m = await import('../../src/lib/blog-content.ts');

test('plain HTML content passes through untouched', () => {
  const r = m.resolveBlogContent('<p>Hello</p>');
  assert.equal(r.kind, 'ok');
  assert.equal(r.content, '<p>Hello</p>');
});

test('JSON-wrapped content is extracted', () => {
  const r = m.resolveBlogContent(JSON.stringify({ title: 'T', content: '<h2>Real</h2><p>body</p>' }));
  assert.equal(r.kind, 'extracted');
  assert.equal(r.content, '<h2>Real</h2><p>body</p>');
  assert.equal(r.title, 'T');
});

test('code-fenced JSON is extracted', () => {
  const r = m.resolveBlogContent('```json\n{"title":"x","content":"Paragraph one.\\n\\nParagraph two."}\n```');
  assert.equal(r.kind, 'extracted');
  assert.match(m.toDisplayHtml(r.content), /<p>Paragraph one\.<\/p>\n<p>Paragraph two\.<\/p>/);
});

test('truncated / unparseable JSON is broken (hidden, never shown raw)', () => {
  assert.equal(m.resolveBlogContent('{ "title": "x", "content": "<p>cut off').kind, 'broken');
});

test('JSON without a content string is broken', () => {
  assert.equal(m.resolveBlogContent('{"title":"only a title"}').kind, 'broken');
  assert.equal(m.resolveBlogContent('[1,2,3]').kind, 'broken');
});

test('empty / non-string content is broken', () => {
  assert.equal(m.resolveBlogContent('').kind, 'broken');
  assert.equal(m.resolveBlogContent(null).kind, 'broken');
});

test('toDisplayHtml escapes plain text and keeps real HTML', () => {
  assert.equal(m.toDisplayHtml('a < b & c'), '<p>a &lt; b &amp; c</p>');
  assert.equal(m.toDisplayHtml('<p>ok</p>'), '<p>ok</p>');
});

test('consistent-profits post gets a safe display title; others unchanged', () => {
  assert.doesNotMatch(m.displayTitle('how-to-use-ai-betting-picks-for-consistent-profits-2026-guide', 'x'), /profit/i);
  assert.equal(m.displayTitle('other', 'Keep'), 'Keep');
});

test('attribution never names a model or promises results', () => {
  assert.doesNotMatch(m.AI_ATTRIBUTION, /gpt|claude|openai/i);
  assert.match(m.AI_ATTRIBUTION, /not betting advice/i);
});
