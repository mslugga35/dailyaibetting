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

function recent(ip: string, now: number, windowMs: number): number[] {
  const list = (holds.get(ip) || []).filter((t) => now - t < windowMs);
  if (list.length) holds.set(ip, list); else holds.delete(ip);
  return list;
}

/** True when this IP already created its allowance of new holds inside the window. */
export function holdLimitReached(ip: string, now = Date.now()): boolean {
  const { max, windowMs } = holdLimitConfig();
  return recent(ip, now, windowMs).length >= max;
}

/** Count one new hold against the IP. */
export function recordHold(ip: string, now = Date.now()): void {
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
