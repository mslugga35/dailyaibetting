/** safeNext: the post-login return path can never become an open redirect. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { safeNext } = await import('../../src/lib/auth/safe-next.ts');

test('same-site paths are kept (with query)', () => {
  assert.equal(safeNext('/admin/grading'), '/admin/grading');
  assert.equal(safeNext('/account?tab=billing'), '/account?tab=billing');
});

test('anything off-site or malformed falls back to /', () => {
  for (const bad of [null, undefined, '', 'https://evil.com', '//evil.com', '/\\evil.com', '\\\\evil.com', 'javascript:alert(1)', '/ok\nSet-Cookie:x', 'evil.com/x', '/' + 'a'.repeat(600)]) {
    assert.equal(safeNext(bad), '/', String(bad));
  }
});

test('dot-segments cannot collapse into a protocol-relative off-site URL (QA 2026-11-19)', () => {
  for (const bad of ['/..//evil.com', '/.//evil.com', '/a/../..//evil.com', '/./..//evil.com/x?y=1', '/%2e%2e//evil.com']) {
    assert.equal(safeNext(bad), '/', bad);
  }
  assert.equal(safeNext('/a/../account'), '/account');
});
