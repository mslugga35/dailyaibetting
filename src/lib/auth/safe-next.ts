/**
 * Where to send a visitor after sign-in. Only a same-site path is accepted
 * ("/account", "/admin/grading?x=1"); anything else (absolute URLs, "//evil.com",
 * backslashes, control characters) falls back to "/" so the login flow can never
 * be used as an open redirect.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value || typeof value !== 'string' || value.length > 512) return '/';
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  if (value.includes(String.fromCharCode(92)) || [...value].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return '/';
  try {
    const u = new URL(value, 'https://dailyaibetting.com');
    if (u.origin !== 'https://dailyaibetting.com') return '/';
    return u.pathname + u.search;
  } catch {
    return '/';
  }
}
