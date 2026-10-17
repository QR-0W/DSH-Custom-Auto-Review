import { register } from 'node:module';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

// Tests use the installed DSH modules. They do not install a second runtime.
const root = process.env.DSH_RUNTIME_DIR ?? join(
  execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(),
  '@deepseek-ai/dsh',
);
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (manifest.version !== '0.2.1-rc.1') {
  throw new Error(`Tests require DSH 0.2.1-rc.1. Found ${manifest.version}.`);
}
register('./resolve-host.mjs', import.meta.url, { data: { root } });
process.env.DSH_TEST_RUNTIME_DIR = root;
