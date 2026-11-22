/**
 * Per-IP limit on NEW Founding Member seat holds (DAI-14). A hold reserves one of the
 * limited seats before any card is entered, so one network must not be able to park many.
 * In-memory: the app runs as one pm2 fork process; a restart simply resets the window.
 * Env: FOUNDING_HOLDS_PER_IP (default 3), FOUNDING_HOLD_IP_WINDOW_MIN (default 30).
 */
const holds = new Map<string, number[]>();

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const n = parseInt(process.env[name] ?? '', 10);
  return Number.isNaN(n) ? fallback : Math.min(Math.max(n, min), max);
}

export function holdLimitConfig() {
  return {
    max: intEnv('FOUNDING_HOLDS_PER_IP', 3, 1, 1000),
    windowMs: intEnv('FOUNDING_HOLD_IP_WINDOW_MIN', 30, 1, 24 * 60) * 60_000,
  };
}

/**
 * The bucket for an address: IPv4 as is; IPv6 by its /64 (one subscriber gets a whole /64, so
 * per-address limits are trivially dodged); IPv4-mapped IPv6 as the IPv4. Unknown -> null (no limit).
 */
export function ipKey(raw: string): string | null {
  const ip = (raw || '').trim().toLowerCase();
  if (!ip || ip === 'unknown') return null;
  if (ip.startsWith('::ffff:') && ip.includes('.')) return ip.slice(7);
  if (!ip.includes(':')) return ip;
  const [head, tail] = ip.split('::');
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  const groups = ip.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h;
  return groups.slice(0, 4).map((g) => g.padStart(4, '0')).join(':') + '::/64';
}

function recent(ip: string, now: number, windowMs: number): number[] {
  const list = (holds.get(ip) || []).filter((t) => now - t < windowMs);
  if (list.length) holds.set(ip, list); else holds.delete(ip);
  return list;
}

/** True when this IP already created its allowance of new holds inside the window. */
export function holdLimitReached(rawIp: string, now = Date.now()): boolean {
  const ip = ipKey(rawIp);
  if (!ip) return false;
  const { max, windowMs } = holdLimitConfig();
  return recent(ip, now, windowMs).length >= max;
}

/** Count one new hold against the IP. */
export function recordHold(rawIp: string, now = Date.now()): void {
  const ip = ipKey(rawIp);
  if (!ip) return;
  const { windowMs } = holdLimitConfig();
  const list = recent(ip, now, windowMs);
  list.push(now);
  holds.set(ip, list);
  if (holds.size > 5000) { // bound memory: drop the oldest entries
    for (const k of holds.keys()) { holds.delete(k); if (holds.size <= 4000) break; }
  }
}

/** For tests. */
export function resetFoundingHoldLimiter(): void {
  holds.clear();
}
