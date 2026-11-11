/**
 * Environment ALLOW-list for test processes. Anything not named here is removed,
 * so a credential with an unexpected name (GOOGLE_SHEET_ID, VERCEL_*, GH_*,
 * npm_config_*authToken…) can never reach a test. Used by run.mjs (the child is
 * spawned with this env, so secrets never enter it) and by register.mjs (a second
 * layer for direct `node --test --import` runs).
 */
const EXACT = new Set([
  'PATH', 'Path', 'PATHEXT', 'SystemRoot', 'SYSTEMROOT', 'windir', 'WINDIR', 'ComSpec', 'COMSPEC',
  'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA',
  'OS', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'LANG', 'TZ', 'TERM', 'CI', 'FORCE_COLOR', 'NO_COLOR',
  'NODE_TEST_CONTEXT', 'NODE_V8_COVERAGE',
]);
const PREFIXES = ['LC_'];

export function isAllowedEnvName(k) {
  return EXACT.has(k) || PREFIXES.some((p) => k.startsWith(p));
}

/** A copy of `env` with only allow-listed names. */
export function allowListedEnv(env = process.env) {
  return Object.fromEntries(Object.entries(env).filter(([k]) => isAllowedEnvName(k)));
}

/** Fake values every test starts from. Obviously fake; none is accepted by a real service. */
export const TEST_ENV = Object.freeze({
  NEXT_PUBLIC_SUPABASE_URL: 'https://harness.supabase.invalid',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-harness',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-harness',
  STRIPE_SECRET_KEY: 'sk_test_harness_offline_never_sent',
  STRIPE_WEBHOOK_SECRET: 'whsec_harness_test_secret',
  STRIPE_PRICE_ID: 'price_test_dailyai_pro_monthly',
  NEXT_PUBLIC_SITE_URL: 'https://dailyai.test',
  NEXT_PUBLIC_BASE_URL: 'https://dailyai.test',
  RESEND_API_KEY: 're_test_harness',
  CRON_SECRET: 'cron-secret-harness',
});
