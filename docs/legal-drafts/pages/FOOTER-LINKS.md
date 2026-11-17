# Footer links (NOT APPLIED)

After publishing the pages, add inside the links `<div>` of `src/components/layout/Footer.tsx`, using the same className as the existing links:

    <Link href="/terms" ...>Terms</Link>
    <Link href="/privacy" ...>Privacy</Link>
    <Link href="/responsible-gambling" ...>Responsible Gambling</Link>
    <Link href="/about" ...>About</Link>
    <Link href="/affiliate-disclosure" ...>Affiliate Disclosure</Link>

Also add the five routes to `src/app/sitemap.ts` and add "21+ | 1-800-GAMBLER" to the footer disclaimer line.
