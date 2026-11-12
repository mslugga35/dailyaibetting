/** Replaces @supabase/ssr: the cookie-session client sees harness().cookieUser. */
import { makeClient } from './supabase-js.mjs';
import { harness } from '../state.mjs';

export function createServerClient(url, key, opts = {}) {
  const client = makeClient(url, key, { sessionUser: () => harness().cookieUser });
  const getUser = client.auth.getUser.bind(client.auth);
  // Session refresh: when a test arms harness().refreshCookies, the first getUser()
  // hands the rotated session cookies to the caller's cookies.setAll (as @supabase/ssr does).
  client.auth.getUser = async (...args) => {
    harness().ssrGetUserCalls += 1;
    const res = await getUser(...args);
    const rotated = harness().refreshCookies;
    if (rotated && opts.cookies?.setAll) {
      harness().refreshCookies = null;
      opts.cookies.setAll(rotated);
    }
    return res;
  };
  return client;
}

export function createBrowserClient(url, key) {
  return makeClient(url, key, { sessionUser: () => harness().cookieUser });
}
