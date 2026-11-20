/**
 * S4: server-verified admin authorization (src/lib/auth/admin.ts) for the grading
 * admin page, POST /api/admin/grade, /api/results?view=pending and /api/debug-schedule.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, harness, req, body, quietly, cookieUser, bearerUser, seedSubscription } from '../harness/helpers.mjs';

const { isAdminUser, adminGuard } = await import('../../src/lib/auth/admin.ts');
const adminGrade = await import('../../src/app/api/admin/grade/route.ts');
const results = await import('../../src/app/api/results/route.ts');
const debugSchedule = await import('../../src/app/api/debug-schedule/route.ts');

const CONFIRMED = { email_confirmed_at: '2026-01-01T00:00:00Z' };
// ADMIN_USER_IDS is reset explicitly: setup() does not clear names set by an earlier test.
const ADMIN_ENV = { ADMIN_EMAILS: ' Boss@Example.test , other@example.test', ADMIN_USER_IDS: 'u1, U_BOSS ,u_boss_b' };
const post = (path, headers = {}) => req(path, { method: 'POST', headers: { host: 'dailyai.test', origin: 'https://dailyai.test', ...headers } });

beforeEach(() => { setup({ env: ADMIN_ENV }); });

test('isAdminUser: requires a confirmed email on the ADMIN_EMAILS list (case-insensitive); no list = no admins', () => {
  assert.equal(isAdminUser({ id: 'u1', email: 'boss@example.test', ...CONFIRMED }), true);
  assert.equal(isAdminUser({ id: 'u1', email: 'boss@example.test' }), false, 'unconfirmed email must not grant admin');
  assert.equal(isAdminUser({ id: 'u1', email: 'boss@example.test', email_confirmed_at: null }), false);
  assert.equal(isAdminUser({ id: 'u2', email: 'stranger@example.test', ...CONFIRMED }), false);
  assert.equal(isAdminUser(null), false);
  setup({ env: { ADMIN_EMAILS: '' } });
  assert.equal(isAdminUser({ id: 'u1', email: 'boss@example.test', ...CONFIRMED }), false, 'fails closed when unconfigured');
});

test('isAdminUser: the immutable user id is REQUIRED; a confirmed admin email alone is never enough', () => {
  setup({ env: { ...ADMIN_ENV, ADMIN_USER_IDS: '' } });
  assert.equal(isAdminUser({ id: 'u1', email: 'boss@example.test', ...CONFIRMED }), false, 'no id list = no admins');
  setup({ env: { ...ADMIN_ENV, ADMIN_USER_IDS: 'uid-boss' } });
  assert.equal(isAdminUser({ id: 'uid-boss', email: 'boss@example.test', ...CONFIRMED }), true);
  assert.equal(isAdminUser({ id: 'uid-impostor', email: 'boss@example.test', ...CONFIRMED }), false);
});

test('POST /api/admin/grade: anonymous 401, non-admin 403, cross-site or Origin-less POST 403; nothing runs', async () => {
  assert.equal((await quietly(() => adminGrade.POST(post('/api/admin/grade')))).status, 401);
  cookieUser('u_member', 'member@example.test', CONFIRMED);
  assert.equal((await quietly(() => adminGrade.POST(post('/api/admin/grade')))).status, 403);
  cookieUser('u_boss', 'boss@example.test', CONFIRMED);
  const xsite = post('/api/admin/grade', { origin: 'https://evil.test' });
  assert.equal((await quietly(() => adminGrade.POST(xsite))).status, 403, 'cross-site POST with admin cookies');
  const noOrigin = req('/api/admin/grade', { method: 'POST', headers: { host: 'dailyai.test' } });
  assert.equal((await quietly(() => adminGrade.POST(noOrigin))).status, 403, 'POST without Origin');
  assert.equal(harness().db.log.filter((l) => l.op !== 'select').length, 0);
});

test('POST /api/admin/grade: a verified admin reaches the grader; the cron secret never appears in the response', async () => {
  cookieUser('u_boss', 'boss@example.test', CONFIRMED);
  const res = await quietly(() => adminGrade.POST(post('/api/admin/grade')));
  assert.ok(![401, 403].includes(res.status), `admin got ${res.status}`);
  assert.ok(harness().db.log.some((l) => l.table === 'consensus' && l.op === 'select'), 'the grader actually ran (read pending picks)');
  assert.ok(!JSON.stringify(await body(res)).includes(process.env.CRON_SECRET));
});

test('an admin can read pending picks without being Pro; an UNCONFIRMED account using the admin email cannot', async () => {
  harness().db.seed('consensus_results', [{ pick_date: '2026-11-11', sport: 'NBA', bet: 'Lakers ML', result: 'PENDING', is_fire: true }]);
  const get = () => quietly(() => results.GET(req('/api/results?view=pending')));
  cookieUser('u_boss', 'boss@example.test', CONFIRMED);
  assert.equal((await get()).status, 200);
  cookieUser('u_fake', 'boss@example.test');
  seedSubscription({ userId: 'u_fake', status: 'canceled' });
  assert.equal((await get()).status, 403);
});

test('/api/debug-schedule is not public: anonymous 401; a bearer admin or the cron secret is allowed', async () => {
  assert.equal((await quietly(() => debugSchedule.GET(req('/api/debug-schedule')))).status, 401);
  const admin = bearerUser('u_boss_b', 'boss@example.test', CONFIRMED);
  const res = await quietly(() => debugSchedule.GET(req('/api/debug-schedule', { headers: admin.headers })));
  assert.ok(![401, 403].includes(res.status), `admin got ${res.status}`);
  const cron = await quietly(() => debugSchedule.GET(req('/api/debug-schedule', { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } })));
  assert.ok(![401, 403].includes(cron.status), `cron got ${cron.status}`);
});

test('adminGuard: an auth outage never yields admin', async () => {
  harness().authOutage = true;
  cookieUser('u_boss', 'boss@example.test', CONFIRMED);
  const res = await adminGuard(req('/x'));
  assert.ok(res && [401, 503].includes(res.status), `got ${res?.status}`);
});

test('admin page: signed out → login (returns here); a signed-in non-admin (member, or admin email without the admin id) gets a no-access page, never the UI', async () => {
  const page = await import('../../src/app/admin/grading/page.tsx');
  const isLoginRedirect = (e) => /NEXT_REDIRECT.*\/login\?redirect=\/admin\/grading/.test(String(e?.digest ?? e?.message ?? e));
  const noAccess = (el) => el?.props?.['data-testid'] === 'admin-no-access';
  const isTool = (el) => el?.type?.name === 'GradingClient';
  await assert.rejects(page.default(), isLoginRedirect);
  cookieUser('u_member', 'member@example.test', CONFIRMED);
  let el = await page.default();
  assert.ok(noAccess(el) && !isTool(el), 'member sees no-access, not the tool');
  cookieUser('u_not_listed', 'boss@example.test', CONFIRMED);
  el = await page.default();
  assert.ok(noAccess(el) && !isTool(el), 'admin email without the admin id sees no-access');
  cookieUser('u_boss', 'boss@example.test', CONFIRMED);
  el = await page.default();
  assert.ok(isTool(el), 'admin gets the grading tool');
});
