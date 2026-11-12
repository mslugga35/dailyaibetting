/**
 * Client entitlement ordering (src/lib/auth/apply-entitlement-response.ts), the pure
 * state machine behind SubscriptionProvider. Async answers can arrive in any order;
 * only the latest check, for the current user, may change what the user sees.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { applyEntitlementResponse: apply, initialEntitlementState, isSignedOutAuthError } = await import('../../src/lib/auth/apply-entitlement-response.ts');

const run = (...msgs) => msgs.reduce((s, m) => apply(s, m), initialEntitlementState);
const view = (s) => ({ status: s.status, isPro: s.isPro, loading: s.loading, user: s.user?.id ?? null });

test('B1 client: responses A (slow) and B (fast) for the same user, started A then B and resolved B then A, end in state B', () => {
  const s = run(
    { kind: 'begin', seq: 1 }, { kind: 'auth', seq: 1, userId: 'u1', email: 'a@x.test' },
    { kind: 'begin', seq: 2 }, { kind: 'auth', seq: 2, userId: 'u1', email: 'a@x.test' },
    { kind: 'resolved', seq: 2, userId: 'u1', status: 'canceled' },      // B (fast, newer)
    { kind: 'resolved', seq: 1, userId: 'u1', status: 'active' },        // A (slow, stale) — ignored
  );
  assert.deepEqual(view(s), { status: 'canceled', isPro: false, loading: false, user: 'u1' });
});

test('B1 client: after sign-out, a late response for the old user is ignored', () => {
  const s = run(
    { kind: 'begin', seq: 1 }, { kind: 'auth', seq: 1, userId: 'u_old', email: 'o@x.test' },
    { kind: 'begin', seq: 2 }, { kind: 'auth', seq: 2, userId: null },  // signed out
    { kind: 'resolved', seq: 1, userId: 'u_old', status: 'active' },    // late, old user
    { kind: 'unknown', seq: 2, userId: 'u_old' },                        // wrong user even with current seq
  );
  assert.deepEqual(view(s), { status: 'inactive', isPro: false, loading: false, user: null });
});

test('B1 client: a late premium arriving after a timeout set unknown does not change state; only a newer check resolves it', () => {
  let s = run(
    { kind: 'begin', seq: 1 }, { kind: 'auth', seq: 1, userId: 'u1' },
    { kind: 'timeout', seq: 1 },
  );
  assert.deepEqual(view(s), { status: 'unknown', isPro: false, loading: true, user: 'u1' });
  s = apply(s, { kind: 'resolved', seq: 1, userId: 'u1', status: 'active' }); // the timed-out check's late answer
  assert.equal(s.status, 'unknown', 'late premium from the timed-out request must not overwrite unknown');
  assert.equal(s.isPro, false);
  // A NEWER check (the latest request) may resolve it.
  s = [
    { kind: 'begin', seq: 2 }, { kind: 'auth', seq: 2, userId: 'u1' },
    { kind: 'resolved', seq: 2, userId: 'u1', status: 'active' },
  ].reduce(apply, s);
  assert.deepEqual(view(s), { status: 'active', isPro: true, loading: false, user: 'u1' });
});

test('B1 client: an error is unknown (treated like loading), never inactive and never Pro', () => {
  const s = run({ kind: 'begin', seq: 1 }, { kind: 'auth', seq: 1, userId: 'u1' }, { kind: 'unknown', seq: 1, userId: 'u1' });
  assert.deepEqual(view(s), { status: 'unknown', isPro: false, loading: true, user: 'u1' });
});

test('B1 client: no subscription row is a confident free; a switched user does not inherit the previous Pro state', () => {
  let s = run({ kind: 'begin', seq: 1 }, { kind: 'auth', seq: 1, userId: 'u_pro' }, { kind: 'resolved', seq: 1, userId: 'u_pro', status: 'active' });
  assert.equal(s.isPro, true);
  s = [{ kind: 'begin', seq: 2 }, { kind: 'auth', seq: 2, userId: 'u_other' }].reduce(apply, s);
  assert.deepEqual(view(s), { status: 'loading', isPro: false, loading: true, user: 'u_other' });
  s = apply(s, { kind: 'resolved', seq: 2, userId: 'u_other', status: null });
  assert.deepEqual(view(s), { status: 'inactive', isPro: false, loading: false, user: 'u_other' });
});

test('B1 client: a missing session or a 4xx token/session rejection means signed out; network, 5xx, 408 and 429 do not', () => {
  assert.equal(isSignedOutAuthError(null), true);
  assert.equal(isSignedOutAuthError({ name: 'AuthSessionMissingError', status: 400 }), true);
  assert.equal(isSignedOutAuthError({ name: 'AuthApiError', status: 401 }), true);
  assert.equal(isSignedOutAuthError({ name: 'AuthApiError', status: 403 }), true);
  assert.equal(isSignedOutAuthError({ name: 'AuthRetryableFetchError', status: 0 }), false);
  assert.equal(isSignedOutAuthError({ name: 'AuthApiError', status: 503 }), false);
  // a stale browser cookie: expired JWT / dead refresh token come back as 400 (seen on real GoTrue)
  assert.equal(isSignedOutAuthError({ name: 'AuthInvalidJwtError', status: 400 }), true);
  assert.equal(isSignedOutAuthError({ name: 'AuthApiError', status: 400 }), true);
  assert.equal(isSignedOutAuthError({ name: 'AuthApiError', status: 404 }), true);
  // throttled or unreachable auth is not "signed out"
  assert.equal(isSignedOutAuthError({ name: 'AuthApiError', status: 429 }), false);
  assert.equal(isSignedOutAuthError({ name: 'AuthApiError', status: 408 }), false);
  assert.equal(isSignedOutAuthError({ name: 'AuthUnknownError' }), false);
});
