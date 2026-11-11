/**
 * In-memory stand-in for the PostgREST surface the app uses through supabase-js.
 *
 * Deliberately faithful where the app's correctness depends on it:
 *   - every select is capped at MAX_ROWS (PostgREST `max_rows`, 1000 on Supabase),
 *     silently, exactly like production;
 *   - `.single()` errors (PGRST116) unless exactly one row matches;
 *   - an UPDATE that matches zero rows is a success with no error (as in PostgREST);
 *   - CHECK and UNIQUE constraints declared per table are enforced and fail the
 *     write with the Postgres error code (23514 / 23505), leaving data unchanged.
 * Failure injection simulates outages: matching calls resolve to `{ data: null,
 * error }`, the same shape supabase-js returns for a network/timeout failure.
 */

export const MAX_ROWS = 1000;

export const SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'inactive'];

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

export class FakeDb {
  constructor() {
    this.tables = new Map();
    this.schemas = new Map();
    this.failures = [];
    this.log = [];
    this.rpcHandlers = new Map();
    this.maxRows = MAX_ROWS;
    this.nextId = 1;
    // supabase/subscriptions.sql — CHECK (status IN ...), UNIQUE(user_id),
    // UNIQUE(stripe_customer_id), UNIQUE(stripe_subscription_id).
    this.defineTable('user_subscriptions', {
      check: { status: SUBSCRIPTION_STATUSES },
      unique: ['user_id', 'stripe_customer_id', 'stripe_subscription_id'],
      defaults: { status: 'inactive', cancel_at_period_end: false },
      columns: ['id', 'user_id', 'stripe_customer_id', 'stripe_subscription_id', 'status', 'price_id',
        'current_period_start', 'current_period_end', 'cancel_at_period_end', 'created_at', 'updated_at'],
    });
    // supabase/migrations/20260601_consensus_results.sql + 001_pick_results.sql
    this.defineTable('consensus_results', {
      columns: ['id', 'pick_date', 'sport', 'bet', 'bet_type', 'team', 'opponent', 'line', 'capper_count', 'is_fire',
        'rank_position', 'result', 'final_score', 'graded_at', 'graded_by', 'dedup_key', 'created_at', 'updated_at'],
    });
  }

  defineTable(name, schema) {
    this.schemas.set(name, { check: {}, unique: [], defaults: {}, ...schema });
  }

  rows(table) {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table);
  }

  seed(table, rows) {
    const t = this.rows(table);
    for (const r of rows) t.push({ id: r.id ?? `row_${this.nextId++}`, ...clone(r) });
  }

  /** Snapshot of a table, for assertions. */
  dump(table) {
    return clone(this.rows(table));
  }

  /**
   * Make matching calls fail. `match` fields are optional: table, op
   * (select|insert|upsert|update|delete|rpc). `times` = how many calls (default ∞).
   */
  fail({ table, op, times = Infinity, error = { message: 'fetch failed: connect ETIMEDOUT', code: '' } } = {}) {
    this.failures.push({ table, op, remaining: times, error });
  }

  /** Every call fails until restore(). */
  outage(error) {
    this.fail({ error: error || { message: 'TypeError: fetch failed (simulated Supabase outage)', code: '' } });
  }

  restore() {
    this.failures = [];
  }

  takeFailure(table, op) {
    for (const f of this.failures) {
      if ((f.table === undefined || f.table === table) && (f.op === undefined || f.op === op) && f.remaining > 0) {
        f.remaining -= 1;
        return clone(f.error);
      }
    }
    return null;
  }

  from(table, client) {
    return new QueryBuilder(this, table, client);
  }

  async rpc(name, args, client) {
    this.log.push({ table: null, op: 'rpc', name, args: clone(args), key: client?.kind });
    const err = this.takeFailure(name, 'rpc');
    if (err) return { data: null, error: err };
    const h = this.rpcHandlers.get(name);
    if (!h) return { data: null, error: { code: 'PGRST202', message: `function ${name} not found` } };
    return { data: clone(await h(args)), error: null };
  }

  validate(table, row) {
    const s = this.schemas.get(table);
    if (!s) return null;
    for (const [col, allowed] of Object.entries(s.check)) {
      if (row[col] !== undefined && row[col] !== null && !allowed.includes(row[col])) {
        return { code: '23514', message: `new row for relation "${table}" violates check constraint "${table}_${col}_check"` };
      }
    }
    return null;
  }

  uniqueClash(table, row, ignore) {
    const s = this.schemas.get(table);
    if (!s) return null;
    for (const col of s.unique) {
      if (row[col] === undefined || row[col] === null) continue;
      if (this.rows(table).some((r) => r !== ignore && r[col] === row[col])) {
        return { code: '23505', message: `duplicate key value violates unique constraint "${table}_${col}_key"` };
      }
    }
    return null;
  }

  withDefaults(table, row) {
    const s = this.schemas.get(table);
    return { id: `row_${this.nextId++}`, ...(s ? s.defaults : {}), ...row };
  }
}

// SQL three-valued logic: a comparison involving NULL is UNKNOWN (null here), and a
// row is kept only when its filter is TRUE. NOT(UNKNOWN) is still UNKNOWN, so a
// negated comparison never resurrects a NULL row. `eq.null` matches nothing (use is).
const isNull = (v) => v === null || v === undefined;
const cmp = (f) => (a, b) => (isNull(a) || isNull(b) ? null : f(a, b));
const OPS = {
  eq: cmp((a, b) => a === b),
  neq: cmp((a, b) => a !== b),
  gt: cmp((a, b) => a > b),
  gte: cmp((a, b) => a >= b),
  lt: cmp((a, b) => a < b),
  lte: cmp((a, b) => a <= b),
  in: (a, b) => (isNull(a) ? null : b.includes(a)),
  is: (a, b) => (b === null ? isNull(a) : a === b),
  like: (a, b) => (isNull(a) ? null : likeRegex(b, '').test(String(a))),
  ilike: (a, b) => (isNull(a) ? null : likeRegex(b, 'i').test(String(a))),
};

/**
 * LIKE → RegExp in ONE pass: `%` and `*` (PostgREST's URL-safe alias) are any run of
 * characters including none and including newlines; `_` is exactly one character.
 * Known approximations: `\%` / `\_` escapes are not honoured, and ilike folds case
 * with JS rules rather than the database collation.
 */
function likeRegex(pattern, flags) {
  let body = '';
  for (const ch of String(pattern)) {
    if (ch === '%' || ch === '*') body += '[\\s\\S]*';
    else if (ch === '_') body += '[\\s\\S]';
    else body += ch.replace(/[.+?^${}()|[\]\\/-]/g, '\\$&');
  }
  return new RegExp(`^${body}$`, flags);
}

function unsupported(kind, where) {
  return new Error(`[fake-db] unsupported filter ${kind}${where ? ` in ${where}` : ''}: add it to tests/harness/fake-db.mjs`);
}

/** Split a PostgREST logic list on top-level commas; unbalanced parentheses throw. */
function splitTop(expr, where) {
  const parts = [];
  let depth = 0; let cur = '';
  for (const ch of expr) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) throw new Error(`[fake-db] ${where}: unbalanced parentheses in "${expr}"`);
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  if (depth !== 0) throw new Error(`[fake-db] ${where}: unbalanced parentheses in "${expr}"`);
  parts.push(cur);
  return parts;
}

/**
 * PostgREST logic expression (`.or('a.eq.1,b.not.in.(x,y),and(c.is.null,d.gt.2)')`) →
 * terms. Anything PostgREST would reject (empty, a term with no operator, an unknown
 * operator) THROWS here, so a test can never pass on a filter that matched nothing.
 * Values stay TEXT, as PostgREST sends them; they are cast against the stored
 * column value at match time (as Postgres casts to the column type).
 */
function parseLogic(expr, where = '.or()') {
  const s = String(expr ?? '').trim();
  if (!s) throw new Error(`[fake-db] ${where}: empty logic expression (PostgREST rejects this)`);
  return splitTop(s, where).map((t) => parseTerm(t.trim(), where));
}

function parseTerm(t, where) {
  if (!t) throw new Error(`[fake-db] ${where}: empty term (PostgREST rejects this)`);
  const g = /^(not\.)?(and|or)\(([\s\S]*)\)$/.exec(t);
  if (g) return { group: g[2], negate: !!g[1], terms: parseLogic(g[3], `${g[2]}()`) };
  const parts = t.split('.');
  if (parts.length < 3) throw new Error(`[fake-db] ${where}: malformed term "${t}" (expected column.operator.value)`);
  let [col, kind, ...rest] = parts;
  let negate = false;
  if (kind === 'not') { negate = true; kind = rest.shift(); }
  if (!OPS[kind]) throw unsupported(kind, where);
  const raw = rest.join('.');
  return { col, kind, negate, fromString: true, val: kind === 'in' ? listOf(raw) : raw };
}

const listOf = (raw) => String(raw).replace(/^\(|\)$/g, '').split(',').map((v) => v.trim().replace(/^"(.*)"$/, '$1'));

/** Cast PostgREST text to the stored value's type, as Postgres casts to the column type. */
function castTo(raw, stored) {
  if (typeof raw !== 'string') return raw;
  if (typeof stored === 'number') { const n = Number(raw); return raw.trim() !== '' && !Number.isNaN(n) ? n : raw; }
  if (typeof stored === 'boolean') return raw === 'true' ? true : raw === 'false' ? false : raw;
  return raw;
}

function castIs(raw) {
  if (raw === null || raw === true || raw === false) return raw;
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`[fake-db] is.${raw}: PostgREST only accepts is.null / is.true / is.false`);
}

/** TRUE, FALSE or UNKNOWN (null) for one term against one row. */
function evalTerm(row, t) {
  if (t.group) {
    const r = t.group === 'and' ? t.terms.every((x) => evalTerm(row, x) === true) : t.terms.some((x) => evalTerm(row, x) === true);
    return t.negate ? !r : r;
  }
  const a = row[t.col];
  let b = t.val;
  if (t.kind === 'is') b = castIs(b);
  else if (t.fromString) b = t.kind === 'in' ? b.map((v) => castTo(v, a)) : castTo(b, a);
  const ok = OPS[t.kind](a, b);
  if (ok === null) return null;
  return t.negate ? !ok : ok;
}

const columnsOf = (t) => (t.group ? t.terms.flatMap(columnsOf) : [t.col]);

/**
 * Parse a PostgREST select list: `*`, `col`, `alias:col`, `alias:table(cols)`, `table(cols)`.
 * Embedded resources are returned as stored on the row (fixtures seed them inline).
 */
export function parseColumns(spec) {
  const parts = [];
  let depth = 0; let cur = '';
  for (const ch of String(spec)) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.replace(/\s+/g, '')).filter(Boolean).map((p) => {
    if (p === '*') return { kind: 'star' };
    const m = p.match(/^(?:([A-Za-z_][\w]*):)?([A-Za-z_][\w]*)(\(.*\))?$/);
    if (!m) return { kind: 'col', source: p, alias: p };
    const [, alias, name, embed] = m;
    if (embed) return { kind: 'embed', source: alias || name, alias: alias || name };
    return { kind: 'col', source: name, alias: alias || name };
  });
}

class QueryBuilder {
  constructor(db, table, client) {
    this.db = db;
    this.table = table;
    this.client = client;
    this.op = 'select';
    this.filters = [];
    this.orders = [];
    this.limitN = null;
    this.rangeFrom = null;
    this.rangeTo = null;
    this.singleMode = null;
    this.payload = null;
    this.options = {};
    this.returning = false;
    this.selectOpts = {};
  }

  select(cols = '*', opts = {}) {
    if (this.op === 'select') { this.selectOpts = opts; this.cols = parseColumns(cols); }
    else this.returning = true;
    return this;
  }
  insert(rows) { this.op = 'insert'; this.payload = rows; return this; }
  upsert(rows, options = {}) { this.op = 'upsert'; this.payload = rows; this.options = options; return this; }
  update(patch) { this.op = 'update'; this.payload = patch; return this; }
  delete() { this.op = 'delete'; return this; }

  push(kind, col, val) {
    if (!OPS[kind]) throw unsupported(kind);
    this.filters.push({ kind, col, val }); return this;
  }
  eq(c, v) { return this.push('eq', c, v); }
  neq(c, v) { return this.push('neq', c, v); }
  gt(c, v) { return this.push('gt', c, v); }
  gte(c, v) { return this.push('gte', c, v); }
  lt(c, v) { return this.push('lt', c, v); }
  lte(c, v) { return this.push('lte', c, v); }
  in(c, v) { return this.push('in', c, v); }
  is(c, v) { return this.push('is', c, v); }
  like(c, v) { return this.push('like', c, v); }
  ilike(c, v) { return this.push('ilike', c, v); }
  match(obj) { for (const [c, v] of Object.entries(obj)) this.push('eq', c, v); return this; }
  /** supabase-js `.not(col, op, value)`: value is PostgREST text when a string. */
  not(c, kind, v) {
    if (!OPS[kind]) throw unsupported(kind, '.not()');
    const fromString = typeof v === 'string';
    this.filters.push({ kind, col: c, negate: true, fromString, val: kind === 'in' && fromString ? listOf(v) : v });
    return this;
  }
  /** supabase-js `.filter(col, 'op' | 'not.op', value)`. */
  filter(c, op, v) {
    const negate = String(op).startsWith('not.');
    const kind = negate ? String(op).slice(4) : String(op);
    if (!OPS[kind]) throw unsupported(kind, '.filter()');
    const fromString = typeof v === 'string';
    this.filters.push({ kind, col: c, negate, fromString, val: kind === 'in' && fromString ? listOf(v) : v });
    return this;
  }
  or(expr) { this.filters.push({ kind: 'or', col: null, val: parseLogic(expr) }); return this; }
  contains() { throw unsupported('contains', '.contains()'); }
  containedBy() { throw unsupported('containedBy', '.containedBy()'); }
  overlaps() { throw unsupported('overlaps', '.overlaps()'); }
  textSearch() { throw unsupported('textSearch', '.textSearch()'); }
  order(col, { ascending = true } = {}) { this.orders.push({ col, ascending }); return this; }
  limit(n) { this.limitN = n; return this; }
  range(a, b) { this.rangeFrom = a; this.rangeTo = b; return this; }
  single() { this.singleMode = 'single'; return this; }
  maybeSingle() { this.singleMode = 'maybe'; return this; }

  matches(row) {
    return this.filters.every((f) => {
      if (f.kind === 'or') return f.val.some((g) => evalTerm(row, g) === true);
      if (!OPS[f.kind]) throw unsupported(f.kind);
      return evalTerm(row, f) === true;
    });
  }

  then(resolve, reject) {
    return Promise.resolve().then(() => this.execute()).then(resolve, reject);
  }

  execute() {
    const db = this.db;
    db.log.push({ table: this.table, op: this.op, filters: clone(this.filters), key: this.client?.kind });
    const err = db.takeFailure(this.table, this.op);
    if (err) return { data: null, error: err, count: null, status: 0 };

    const unknown = this.unknownColumn();
    if (unknown) return { data: null, error: { code: '42703', message: `column ${this.table}.${unknown} does not exist` }, count: null, status: 400 };

    const t = db.rows(this.table);
    switch (this.op) {
      case 'select': return this.finishSelect(t.filter((r) => this.matches(r)));
      case 'insert': return this.doInsert(t);
      case 'upsert': return this.doUpsert(t);
      case 'update': return this.doUpdate(t);
      case 'delete': {
        const keep = t.filter((r) => !this.matches(r));
        const removed = t.length - keep.length;
        db.tables.set(this.table, keep);
        return { data: null, error: null, count: removed, status: 204 };
      }
      default: return { data: null, error: { message: `unsupported op ${this.op}` } };
    }
  }

  /** PostgreSQL rejects unknown columns (42703) in select lists, filters and ORDER BY. */
  unknownColumn() {
    const known = this.db.schemas.get(this.table)?.columns;
    if (!known) return null;
    const used = [
      ...(this.op === 'select' && this.cols ? this.cols.filter((c) => c.kind === 'col').map((c) => c.source) : []),
      ...this.filters.flatMap((f) => (f.kind === 'or' ? f.val.flatMap(columnsOf) : [f.col])),
      ...this.orders.map((o) => o.col),
    ];
    return used.find((c) => !known.includes(c)) || null;
  }

  /** Column projection, as PostgREST returns it: only the selected keys (aliases applied). */
  project(row) {
    if (!this.cols || this.cols.some((c) => c.kind === 'star')) return row;
    const out = {};
    for (const c of this.cols) {
      if (c.source in row) out[c.alias] = row[c.source];
      else if (c.kind === 'embed') out[c.alias] = null;
    }
    return out;
  }

  finishSelect(rows) {
    let out = rows.slice();
    for (const o of [...this.orders].reverse()) {
      // PostgreSQL default: NULLS LAST for ASC, NULLS FIRST for DESC.
      out.sort((a, b) => {
        const x = a[o.col]; const y = b[o.col];
        const xn = x === null || x === undefined; const yn = y === null || y === undefined;
        if (xn && yn) return 0;
        if (xn) return o.ascending ? 1 : -1;
        if (yn) return o.ascending ? -1 : 1;
        if (x === y) return 0;
        const c = x < y ? -1 : 1;
        return o.ascending ? c : -c;
      });
    }
    const total = out.length;
    const from = this.rangeFrom ?? 0;
    let n = this.rangeTo !== null ? this.rangeTo - from + 1 : (this.limitN ?? Infinity);
    n = Math.min(n, this.db.maxRows); // PostgREST max_rows: silent cap
    out = out.slice(from, from + n).map((r) => this.project(r));
    if (this.selectOpts.head) return { data: null, error: null, count: total, status: 200 };
    const count = this.selectOpts.count ? total : null;
    return this.shape(clone(out), count);
  }

  shape(rows, count) {
    if (this.singleMode === 'single') {
      if (rows.length !== 1) {
        return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows` }, count, status: 406 };
      }
      return { data: rows[0], error: null, count, status: 200 };
    }
    if (this.singleMode === 'maybe') {
      if (rows.length > 1) return { data: null, error: { code: 'PGRST116', message: 'multiple rows' }, count, status: 406 };
      return { data: rows[0] ?? null, error: null, count, status: 200 };
    }
    return { data: rows, error: null, count, status: 200 };
  }

  doInsert(t) {
    const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r) => this.db.withDefaults(this.table, clone(r)));
    for (const r of rows) {
      const e = this.db.validate(this.table, r) || this.db.uniqueClash(this.table, r, null);
      if (e) return { data: null, error: e, status: 409 };
    }
    t.push(...rows);
    return this.returning ? this.shape(clone(rows), null) : { data: null, error: null, status: 201 };
  }

  doUpsert(t) {
    const conflict = (this.options.onConflict || 'id').split(',').map((s) => s.trim());
    const out = [];
    const staged = [];
    for (const raw of Array.isArray(this.payload) ? this.payload : [this.payload]) {
      const r = clone(raw);
      const existing = t.find((x) => conflict.every((c) => x[c] !== undefined && x[c] === r[c]));
      const next = existing ? { ...existing, ...r } : this.db.withDefaults(this.table, r);
      const e = this.db.validate(this.table, next) || this.db.uniqueClash(this.table, next, existing || null);
      if (e) return { data: null, error: e, status: 409 };
      staged.push({ existing, next });
    }
    for (const { existing, next } of staged) {
      if (existing) Object.assign(existing, next);
      else t.push(next);
      out.push(next);
    }
    return this.returning ? this.shape(clone(out), null) : { data: null, error: null, status: 201 };
  }

  doUpdate(t) {
    const hit = t.filter((r) => this.matches(r));
    for (const r of hit) {
      const next = { ...r, ...clone(this.payload) };
      const e = this.db.validate(this.table, next) || this.db.uniqueClash(this.table, next, r);
      if (e) return { data: null, error: e, status: 409 };
    }
    for (const r of hit) Object.assign(r, clone(this.payload));
    // PostgREST: zero matched rows is still 2xx with no error.
    return this.returning ? this.shape(clone(hit), hit.length) : { data: null, error: null, count: hit.length, status: 204 };
  }
}
