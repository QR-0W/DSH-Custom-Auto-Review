import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = process.env.DSH_RUNTIME_DIR ?? join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), '@deepseek-ai/dsh');
const host = createRequire(join(root, 'package.json'));
const retained = await readFile(new URL('../vendor/auto-review-0.2.1-rc.1.js', import.meta.url));
const shipped = await readFile(host.resolve('@deepseek-ai/dsh-experimental-auto-review'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
if (hash(retained) !== hash(shipped)) throw new Error('Upstream Auto Review changed. Review the policy/evidence delta and update the retained source and NOTICE before extending support.');
console.log(`Upstream Auto Review matches the retained source (${hash(retained)}).`);
