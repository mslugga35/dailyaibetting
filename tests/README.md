# Offline test harness (P4a)

```
npm test
```

Runs every suite under `tests/` plus `src/lib/consensus/*.test.ts`, fully offline. No new dependencies.
It uses `node:test`, the repo's own `typescript` (transpile only), and the real `stripe` package, but
only for its offline webhook-signature helpers.

## Guarantees

| Guarantee | How |
|---|---|
| No production calls | `tests/harness/register.mjs` replaces `fetch`, `http` and `https` with blockers. Every refused attempt is listed on stderr as `[harness] refused outbound: …` |
| No real credentials | Every inherited env var that looks like a secret is deleted, then fake values are set (`sk_test_harness…`, `*.supabase.invalid`) |
| Faithful Supabase | `fake-db.mjs` caps every select at **1000 rows** (PostgREST `max_rows`), errors `.single()` on 0 or 2+ rows, treats zero-row UPDATEs as success, and enforces the `user_subscriptions` CHECK/UNIQUE constraints from `supabase/subscriptions.sql` |
| Genuine webhook signatures | Events are signed and verified with stripe-node's own HMAC code |
| Outage simulation | `harness().db.outage()` / `.fail({table, op, times})`, `harness().stripe.fail({method})`, `harness().authOutage = true` |

## Open-defect tests (`todo`)

A test marked `{ todo: 'OPEN <id> — <task>' }` asserts the **target** behaviour for a defect found in
the 2026-11-09 P0 audit. It fails today, and node reports it as TODO rather than as a failure.

`run.mjs` turns the run **red if a todo test starts passing**. The task that fixes a defect must
remove its `todo` marker, which turns it into a regression test. It must also delete any matching
`PINNED current behaviour` test.

## Redirected modules

These are listed explicitly in `tests/harness/hooks.mjs`, and nothing else is mocked:
- `@supabase/supabase-js`
- `@supabase/ssr`
- `next/headers`
- `src/lib/stripe.ts`
- `src/lib/ai-picks/engine.ts`
- `src/lib/daily-ai-picks/generate.ts`
