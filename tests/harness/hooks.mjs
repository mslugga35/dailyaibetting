/**
 * ESM resolve hooks for the offline test harness.
 *
 * 1. `@/x` → `src/x` (the tsconfig path alias), with .ts/.tsx/index.ts resolution.
 * 2. Extensionless relative imports inside src/ resolve to their .ts file.
 * 3. A fixed set of modules that would reach the network or the Next runtime are
 *    REDIRECTED to in-memory fakes in tests/harness/fakes/. The list is explicit:
 *    nothing is mocked by accident, and a test can never reach production Stripe,
 *    Supabase, Resend, OpenRouter or Discord through these modules.
 */
import { statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve as resolvePath } from 'node:path';

const HARNESS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolvePath(HARNESS_DIR, '..', '..');
const SRC = join(ROOT, 'src');
const FAKES = join(HARNESS_DIR, 'fakes');

const fake = (name) => pathToFileURL(join(FAKES, name)).href;

/** Bare specifiers replaced everywhere (except inside the fakes themselves). */
const BARE_REDIRECTS = {
  '@supabase/supabase-js': fake('supabase-js.mjs'),
  '@supabase/ssr': fake('supabase-ssr.mjs'),
  'next/headers': fake('next-headers.mjs'),
};

/** Next ships CJS without an exports map; ESM needs the explicit file. */
const BARE_REWRITES = {
  'next/server': 'next/server.js',
};

/** Source files replaced by fakes (paths relative to src/, without extension). */
const SOURCE_REDIRECTS = {
  'lib/stripe': fake('stripe.mjs'),
  'lib/ai-picks/engine': fake('ai-picks-engine.mjs'),
  'lib/daily-ai-picks/generate': fake('daily-ai-picks-generate.mjs'),
};

const isFile = (p) => {
  try { return statSync(p).isFile(); } catch { return false; }
};

function resolveTsPath(base) {
  if (isFile(base)) return base;
  for (const ext of ['.ts', '.tsx', '.mjs', '.js', '.json']) {
    if (isFile(base + ext)) return base + ext;
  }
  for (const idx of ['index.ts', 'index.tsx', 'index.js']) {
    const p = join(base, idx);
    if (isFile(p)) return p;
  }
  return null;
}

function sourceRedirect(absPath) {
  const rel = absPath.slice(SRC.length + 1).replace(/\\/g, '/').replace(/\.(ts|tsx|mjs|js)$/, '');
  return SOURCE_REDIRECTS[rel] || null;
}

export async function resolve(specifier, context, nextResolve) {
  const parent = context.parentURL ? fileURLToPath(context.parentURL) : '';
  const fromFake = parent.startsWith(FAKES);

  if (!fromFake && BARE_REDIRECTS[specifier]) {
    return { url: BARE_REDIRECTS[specifier], shortCircuit: true };
  }
  if (BARE_REWRITES[specifier]) {
    return nextResolve(BARE_REWRITES[specifier], context);
  }

  let abs = null;
  if (specifier.startsWith('@/')) {
    abs = resolveTsPath(join(SRC, specifier.slice(2)));
    if (!abs) throw new Error(`[harness] cannot resolve ${specifier}`);
  } else if ((specifier.startsWith('./') || specifier.startsWith('../')) && parent && !fromFake) {
    // Relative imports from src/ AND from tests/: a test importing a redirected
    // source file directly (e.g. ../src/lib/stripe.ts) must get the fake too.
    const candidate = resolvePath(dirname(parent), specifier);
    if (parent.startsWith(SRC) || candidate.startsWith(SRC)) abs = resolveTsPath(candidate);
  }

  if (abs) {
    if (abs.startsWith(SRC + (process.platform === 'win32' ? '\\' : '/'))) {
      const redirected = sourceRedirect(abs);
      if (redirected) return { url: redirected, shortCircuit: true };
    }
    const url = pathToFileURL(abs).href;
    if (abs.endsWith('.json')) {
      return { url, shortCircuit: true, importAttributes: { type: 'json' } };
    }
    return { url, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

/**
 * App source (.ts/.tsx under src/) is transpiled with the repo's own TypeScript
 * compiler: unlike --experimental-strip-types it elides type-only imports written
 * without `import type`, and handles JSX. Type errors are NOT checked here
 * (that is `tsc --noEmit`'s job); this only makes the code runnable.
 */
let ts;
async function transpile(url) {
  if (!ts) ts = (await import('typescript')).default;
  const { readFileSync } = await import('node:fs');
  const path = fileURLToPath(url);
  const out = ts.transpileModule(readFileSync(path, 'utf8'), {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      sourceMap: false,
      inlineSourceMap: true,
      verbatimModuleSyntax: false,
      isolatedModules: true,
    },
  });
  return out.outputText;
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    return nextLoad(url, { ...context, importAttributes: { type: 'json' } });
  }
  if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url) && fileURLToPath(url).startsWith(SRC)) {
    return { format: 'module', source: await transpile(url), shortCircuit: true };
  }
  return nextLoad(url, context);
}
