import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = process.env.DSH_RUNTIME_DIR ?? join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), '@deepseek-ai/dsh');
const manifestPath = join(root, 'package.json');
const host = createRequire(manifestPath);
const { version } = JSON.parse(await readFile(manifestPath, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const retained = await readFile(new URL('../vendor/auto-review-0.2.1-rc.1.js', import.meta.url));
if (hash(retained) !== '14b0fec944f734a888468b75ee9d7ae121383f018ce5bf76c4506393a910787f') {
  throw new Error('The retained Auto Review source no longer matches its provenance in NOTICE.');
}
// The fork's source baseline and the audited host runtime are distinct references.
// See NOTICE for the reviewed differences and the behavior deliberately retained here.
const reviewed = new Map([
  ['0.2.2-rc.1', 'c516e8803facb9c8484f10c81037859826f1b1d0fef098d933ea23b38fd780b3'],
  ['0.2.2-rc.4', 'c516e8803facb9c8484f10c81037859826f1b1d0fef098d933ea23b38fd780b3'],
]);
const expected = reviewed.get(version);
if (!expected) throw new Error(`No reviewed upstream Auto Review reference for DSH ${version}.`);
const shipped = await readFile(host.resolve('@deepseek-ai/dsh-experimental-auto-review'));
if (hash(shipped) !== expected) throw new Error('Upstream Auto Review changed. Review its policy and evidence rules before updating NOTICE and the pinned digest.');
console.log(`Upstream Auto Review for DSH ${version} matches the audited reference (${expected}).`);
