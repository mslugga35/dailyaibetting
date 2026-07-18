import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';

const dir = join('public', '.well-known');
mkdirSync(dir, { recursive: true });

const info = {
  commitHash: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
  branch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
  buildTime: new Date().toISOString(),
  buildHost: hostname(),
};

writeFileSync(join(dir, 'commit-info.json'), JSON.stringify(info, null, 2));
console.log(`✅ Generated commit-info.json: ${info.commitHash.slice(0, 7)}`);
