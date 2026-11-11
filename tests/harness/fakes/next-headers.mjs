/** Replaces next/headers outside a Next request scope. */
export async function cookies() {
  return { getAll: () => [], get: () => undefined, set: () => {} };
}

export async function headers() {
  return new Headers();
}
