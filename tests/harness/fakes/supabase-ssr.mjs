/** Replaces @supabase/ssr: the cookie-session client sees harness().cookieUser. */
import { makeClient } from './supabase-js.mjs';
import { harness } from '../state.mjs';

export function createServerClient(url, key) {
  return makeClient(url, key, { sessionUser: () => harness().cookieUser });
}

export function createBrowserClient(url, key) {
  return makeClient(url, key, { sessionUser: () => harness().cookieUser });
}
