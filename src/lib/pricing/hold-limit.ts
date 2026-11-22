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

const V4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function v4Key(ip: string): string {
  if (ip.startsWith('127.')) return 'loopback';
  if (ip === '0.0.0.0') return 'unspecified';
  return ip;
}

/** Eight 16-bit groups of an IPv6 address (an embedded dotted IPv4 tail becomes two groups), or null. */
function v6Groups(ip: string): number[] | null {
  let s = ip;
  const dotted = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(s);
  let tailV4: number[] = [];
  if (dotted) {
    const o = dotted[1].split('.').map(Number);
    if (o.some((n) => n > 255)) return null;
    tailV4 = [(o[0] << 8) | o[1], (o[2] << 8) | o[3]];
    s = s.slice(0, -dotted[1].length);
    if (s.endsWith(':') && !s.endsWith('::')) s = s.slice(0, -1);
  }
  const parts = s.split('::');
  if (parts.length > 2) return null;
  const parse = (x: string) => (x ? x.split(':') : []).map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  const h = parse(parts[0]);
  const t = parts.length === 2 ? parse(parts[1]) : [];
  const fill = 8 - h.length - t.length - tailV4.length;
  if (fill < 0 || (parts.length === 1 && fill !== 0)) return null;
  const g = [...h, ...Array(parts.length === 2 ? fill : 0).fill(0), ...t, ...tailV4];
  return g.length === 8 && g.every((n) => Number.isInteger(n)) ? g : null;
}

/**
 * The bucket for an address: IPv4 as is; IPv6 by its /64 (one subscriber gets a whole /64, so
 * per-address limits are trivially dodged); IPv4-mapped IPv6 (dotted or hex form) as the IPv4.
 * [brackets], a :port and a %zone are stripped. Loopback and unspecified addresses get their own
 * keys ('loopback', 'unspecified') so they never share a bucket with a real /64. Unknown -> null (no limit).
 */
export function ipKey(raw: string): string | null {
  let ip = (raw || '').trim().toLowerCase();
  if (!ip || ip === 'unknown') return null;
  const bracket = /^\[([^\]]+)\](?::\d+)?$/.exec(ip);
  if (bracket) ip = bracket[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(':'));
  ip = ip.replace(/%.*$/, '');
  if (V4.test(ip)) return v4Key(ip);
  if (!ip.includes(':')) return ip;
  const g = v6Groups(ip);
  if (!g) return ip; // unparseable: its own bucket, as given
  if (g.slice(0, 5).every((n) => n === 0) && g[5] === 0xffff) {
    return v4Key([g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255].join('.'));
  }
  if (g.every((n) => n === 0)) return 'unspecified';
  if (g.slice(0, 7).every((n) => n === 0) && g[7] === 1) return 'loopback';
  return g.slice(0, 4).map((n) => n.toString(16).padStart(4, '0')).join(':') + '::/64';
}

function recent(ip: string, now: number, windowMs: number): number[] {
  const list = (holds.get(ip) || []).filter((t) => now - t < windowMs);
  if (list.length) holds.set(ip, list); else holds.delete(ip);
  return list;
}

export type HoldSlot = { ok: true; release(): void } | { ok: false };

/**
 * Atomically check the IP's allowance and, if there is room, take one slot NOW (F2). Synchronous on
 * purpose: no await between the check and the record, so a parallel burst from one IP cannot all pass
 * the check before any of them is counted. The slot is provisional: call release() if the hold does not
 * materialise (Checkout Session not created). Unknown IP: always ok, nothing recorded.
 */
export function tryReserveHold(rawIp: string, now = Date.now()): HoldSlot {
  const ip = ipKey(rawIp);
  if (!ip) return { ok: true, release() {} };
  const { max, windowMs } = holdLimitConfig();
  const list = recent(ip, now, windowMs);
  if (list.length >= max) return { ok: false };
  list.push(now);
  holds.set(ip, list);
  if (holds.size > 5000) { // bound memory: drop the oldest entries
    for (const k of holds.keys()) { if (k === ip) continue; holds.delete(k); if (holds.size <= 4000) break; }
  }
  let released = false;
  return {
    ok: true,
    release() {
      if (released) return;
      released = true;
      const cur = holds.get(ip);
      const i = cur ? cur.indexOf(now) : -1;
      if (cur && i >= 0) { cur.splice(i, 1); if (!cur.length) holds.delete(ip); }
    },
  };
}

/** For tests. */
export function resetFoundingHoldLimiter(): void {
  holds.clear();
}
