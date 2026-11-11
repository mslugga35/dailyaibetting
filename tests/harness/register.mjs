/**
 * Loaded with `node --import ./tests/harness/register.mjs` before any test.
 *
 * 1. Registers the resolve hooks (path alias + fake redirects).
 * 2. Environment: removes every variable not on the allow-list (env-policy.mjs),
 *    then sets obviously fake values, so no test can authenticate to a real service
 *    even if a fake were bypassed.
 * 3. Network: fetch, http/https (default AND named ESM exports), net, tls, dns,
 *    WebSocket and EventSource all throw, unless a test registered a fetch handler
 *    for that URL in harness().fetchRoutes. Every refused attempt is reported.
 *
 * Escape hatches that would run code WITHOUT these patches are refused too:
 *   - worker_threads `new Worker()`, `cluster.fork()`;
 *   - `process.binding`, `process._linkedBinding`, `process.dlopen` (raw handles / native addons);
 *   - `inspector.open()` (opens a listening port);
 *   - child_process: exec/execSync/fork always refused. spawn/spawnSync/execFile/
 *     execFileSync only for THIS node binary, and only when the child is itself
 *     guarded: it gets `--import <this file>`, or it is the harness runner
 *     (tests/harness/run.mjs), which runs every test file with `--import` and the
 *     allow-listed env. Anything else (git, a shell, curl, another node script) throws.
 *   - every dns lookup/resolve* function and both dns Resolver classes.
 *
 * child_process argument shapes are matched EXACTLY (see guardedChild below): the
 * register path and runner path must resolve to these very files, and any extra
 * preload flag, NODE_OPTIONS or `shell` is refused.
 *
 * Limits, stated so nobody assumes more: these are in-process patches. Code that
 * catches the thrown refusal can carry on (the refusal is still reported on exit),
 * and native code loaded before this file ran is out of reach. The real backstop
 * for "nothing leaves the machine" is a network-less CI job (P4b), not this file.
 */
import { register, syncBuiltinESMExports } from 'node:module';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import workerThreads from 'node:worker_threads';
import childProcess from 'node:child_process';
import cluster from 'node:cluster';
import inspector from 'node:inspector';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, resolve as resolvePath } from 'node:path';
import { harness } from './state.mjs';
import { isAllowedEnvName, TEST_ENV } from './env-policy.mjs';

export { TEST_ENV };

register('./hooks.mjs', import.meta.url);

for (const k of Object.keys(process.env)) {
  if (!isAllowedEnvName(k)) delete process.env[k];
}
Object.assign(process.env, TEST_ENV);
process.env.DAILYAI_TEST_HARNESS = '1';

/** Process-wide record of refused outbound attempts (survives resetHarness()). */
const ALL_BLOCKED = [];

function blocked(url) {
  ALL_BLOCKED.push(String(url));
  return new TypeError(`[harness] network blocked: ${url}`);
}

globalThis.fetch = async function harnessFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init.method || (typeof input === 'object' && input.method) || 'GET').toUpperCase();
  const h = harness();
  for (const [prefix, handler] of h.fetchRoutes) {
    // Boundary-aware prefix: a route for https://api.x.com must not answer https://api.x.com.evil.test
    const boundary = prefix.endsWith('/') || url.length === prefix.length || '/?#'.includes(url[prefix.length]);
    if (url.startsWith(prefix) && boundary) {
      h.fetches.push({ url, method, allowed: true, body: init.body ?? null });
      return handler(url, init);
    }
  }
  h.fetches.push({ url, method, allowed: false });
  throw blocked(url);
};

const describe = (arg) => {
  if (typeof arg === 'string') return arg;
  if (arg instanceof URL) return arg.href;
  if (arg && typeof arg === 'object') return `${arg.protocol || ''}//${arg.hostname || arg.host || arg.path || '?'}:${arg.port ?? ''}`;
  return String(arg);
};

function refuse(kind) {
  return function harnessBlocked(arg) {
    const url = describe(arg);
    harness().fetches.push({ url, method: kind, allowed: false });
    throw blocked(url);
  };
}

for (const mod of [http, https]) {
  mod.request = refuse('NODE_HTTP');
  mod.get = refuse('NODE_HTTP');
}
net.connect = refuse('NET');
net.createConnection = refuse('NET');
net.Socket.prototype.connect = refuse('NET');
tls.connect = refuse('TLS');
for (const fn of Object.keys(dns)) {
  if (/^(lookup|lookupService|resolve|reverse)/.test(fn) && typeof dns[fn] === 'function') dns[fn] = refuse('DNS');
}
for (const fn of Object.keys(dns.promises)) {
  if (/^(lookup|lookupService|resolve|reverse)/.test(fn) && typeof dns.promises[fn] === 'function') {
    dns.promises[fn] = async (host) => { throw blocked(`dns:${host}`); };
  }
}
const BlockedResolver = class HarnessResolverBlocked { constructor() { throw blocked('dns:Resolver'); } };
dns.Resolver = BlockedResolver;
dns.promises.Resolver = BlockedResolver;
// Worker threads get a fresh module registry, and execArgv --import is not honoured
// for them, so a worker would escape every patch above. No test needs one: refuse.
workerThreads.Worker = class HarnessWorkerBlocked {
  constructor(file) { throw blocked(`worker_threads:${typeof file === 'string' ? file.slice(0, 40) : 'url'}`); }
};
process.binding = (name) => { throw blocked(`process.binding:${name}`); };
process._linkedBinding = (name) => { throw blocked(`process._linkedBinding:${name}`); };
process.dlopen = () => { throw blocked('process.dlopen'); };
cluster.fork = () => { throw blocked('cluster.fork'); };
inspector.open = () => { throw blocked('inspector.open'); };

// child_process: only a guarded child of this same node binary may start, in one of
// two EXACT argument shapes (anything else, including extra preload flags, throws):
//   A. EXACTLY [--import, <this register.mjs>, -e|--eval|-p|--print, <code>] or
//      [--import, <this register.mjs>, <script path>], and no NODE_OPTIONS in the
//      child env. No other node flag at all (an allow-list, not a deny-list: flags
//      such as --env-file can smuggle NODE_OPTIONS in), so these patches load first.
//   B. [<ROOT>/tests/harness/run.mjs, ...only --suite=<name> | --write-manifest]: the
//      runner, which starts every test file in shape A.
// `shell` is refused in every case.
const REGISTER_PATH = fileURLToPath(import.meta.url);
const HARNESS_DIR = dirname(REGISTER_PATH);
const RUNNER_PATH = join(HARNESS_DIR, 'run.mjs');
const canon = (p) => resolvePath(String(p)).replace(/\\/g, '/').toLowerCase();
function guardedChild(file, args, opts) {
  if (canon(file) !== canon(process.execPath)) return false;
  const o = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};
  if (o.shell) return false;
  const env = o.env || process.env;
  if (Object.keys(env).some((k) => k.toUpperCase() === 'NODE_OPTIONS' && String(env[k]).trim())) return false;
  const cwd = o.cwd ? String(o.cwd) : process.cwd();
  const at = (p) => canon(resolvePath(cwd, p));
  const list = Array.isArray(args) ? args.map(String) : [];
  // Shape A
  if (list[0] === '--import' && /^\.\.?[\\/]/.test(list[1] || '') && at(list[1]) === canon(REGISTER_PATH)) {
    const rest = list.slice(2);
    if (rest.length === 2 && ['-e', '--eval', '-p', '--print'].includes(rest[0])) return true;
    return rest.length === 1 && !rest[0].startsWith('-');
  }
  // Shape B
  if (list.length >= 1 && at(list[0]) === canon(RUNNER_PATH)) {
    return list.slice(1).every((a) => /^--suite=[a-z-]*$/.test(a) || a === '--write-manifest');
  }
  return false;
}
for (const fn of ['spawn', 'spawnSync', 'execFile', 'execFileSync']) {
  const real = childProcess[fn];
  childProcess[fn] = function harnessChild(file, args, ...rest) {
    const opts = Array.isArray(args) ? rest[0] : args;
    if (!guardedChild(file, Array.isArray(args) ? args : [], opts)) throw blocked(`child_process.${fn}:${basename(String(file))}`);
    return real.call(this, file, args, ...rest);
  };
}
// Every async path (spawn, execFile, exec, fork, `new ChildProcess().spawn`) funnels
// through ChildProcess.prototype.spawn. Internally options.args = [argv0, ...args]
// and the env arrives as envPairs ['K=V', ...].
const realProtoSpawn = childProcess.ChildProcess.prototype.spawn;
childProcess.ChildProcess.prototype.spawn = function harnessProtoSpawn(options = {}) {
  const env = Object.fromEntries((options.envPairs || []).map((kv) => { const i = String(kv).indexOf('='); return [String(kv).slice(0, i), String(kv).slice(i + 1)]; }));
  const args = Array.isArray(options.args) ? options.args.slice(1) : [];
  if (!guardedChild(options.file, args, { cwd: options.cwd, env: options.envPairs ? env : process.env })) {
    throw blocked(`child_process.ChildProcess:${basename(String(options.file))}`);
  }
  return realProtoSpawn.call(this, options);
};
if (typeof process.execve === 'function') process.execve = () => { throw blocked('process.execve'); };
for (const fn of ['exec', 'execSync', 'fork']) {
  childProcess[fn] = (cmd) => { throw blocked(`child_process.${fn}:${String(cmd).slice(0, 40)}`); };
}

// Push the patched functions into the named ESM exports too
// (`import { request } from 'node:https'` would otherwise keep the original).
syncBuiltinESMExports();

for (const name of ['WebSocket', 'EventSource']) {
  if (name in globalThis) {
    globalThis[name] = class { constructor(url) { throw blocked(url); } };
  }
}

// Evidence: every test process reports which hosts it tried and was refused.
process.on('exit', () => {
  if (!ALL_BLOCKED.length) return;
  const byHost = new Map();
  for (const u of ALL_BLOCKED) {
    let host = u;
    try { host = new URL(u).host || u; } catch { /* keep raw */ }
    byHost.set(host, (byHost.get(host) || 0) + 1);
  }
  process.stderr.write(`[harness] refused outbound: ${[...byHost].map(([k, v]) => `${k} x${v}`).join(', ')}\n`);
});
