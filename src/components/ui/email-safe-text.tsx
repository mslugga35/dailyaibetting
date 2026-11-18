import { createElement, Fragment } from 'react';

/**
 * Text that may contain an email address. Cloudflare's Email Obfuscation rewrites any
 * "name@domain" it finds in the HTML into a script-decoded link, so the browser's DOM no
 * longer matches what React rendered (hydration error #418). Rendering each "@" as its own
 * text node makes React separate the pieces with <!-- --> in the server HTML, so Cloudflare
 * sees no email address and the page hydrates cleanly. Visually identical.
 */
export function EmailSafeText({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  const parts = text.split('@');
  const nodes = parts.flatMap((p, i) => (i === 0 ? [p] : ['@', p]));
  return createElement(Fragment, null, ...nodes);
}
