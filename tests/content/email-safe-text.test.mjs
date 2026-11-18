/** EmailSafeText: server HTML never contains a contiguous email (Cloudflare would rewrite it). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

const { EmailSafeText } = await import('../../src/components/ui/email-safe-text.tsx');
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;

test('no contiguous email in server HTML; visible text unchanged', () => {
  for (const text of ['mpm.morales+daipaid@gmail.com', 'Email support@dailyaibetting.com and we will review your request.']) {
    const html = renderToString(createElement('p', null, createElement(EmailSafeText, { text })));
    assert.ok(!EMAIL.test(html), html);
    assert.equal(html.replace(/<!-- -->/g, '').replace(/<\/?p>/g, ''), text.replace(/&/g, '&amp;'));
  }
  assert.equal(renderToString(createElement(EmailSafeText, { text: null })), '');
});
