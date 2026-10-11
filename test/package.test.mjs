import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, mkdir, symlink, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lifecycleRuntime, reviewer } from './lifecycle-fixtures.mjs';
import { SETTINGS_SERVICE } from '../tools/gui/rpc.js';

const project = fileURLToPath(new URL('../', import.meta.url));

test('Packed root owns both Host entries and Client without a nested companion or undeclared local imports', { timeout: 20000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'iar-pack-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const packed = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', directory], { cwd: project, encoding: 'utf8' }))[0];
  const paths = new Set(packed.files.map(file => file.path));
  for (const file of ['src/auto-review.js', 'src/reviewer.js', 'tools/gui/host.js', 'tools/gui/domain.js', 'tools/gui/service.js', 'tools/gui/rpc.js', 'tools/gui/client.js', 'tools/gui/THIRD-PARTY-NOTICES.md']) assert.ok(paths.has(file), `Missing runtime file ${file}`);
  for (const file of paths) assert.ok(!/(^|\/)(node_modules|\.local|test|build-tools)(\/|$)/.test(file), `Unexpected private/development path ${file}`);
  assert.equal(paths.has('tools/gui/package.json'), false);
  assert.equal(paths.has('tools/gui/cordis.patch.yml'), false);
  execFileSync('tar', ['-xzf', join(directory, packed.filename), '-C', directory]);
  const root = join(directory, 'package');
  const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  assert.equal(metadata.name, '@local/dsh-independent-auto-review');
  assert.equal(metadata.exports['./settings'], './tools/gui/host.js');
  assert.equal(metadata.exports['./client'], './tools/gui/client.js');
  assert.equal(metadata.dsh.client.platform, 'web');
  // Supply ONLY declared peers from the exact shipped runtime, never the source tree's node_modules.
  for (const name of Object.keys(metadata.peerDependencies)) {
    const target = await realpath(join(process.env.DSH_TEST_RUNTIME_DIR, 'node_modules', name));
    const destination = join(root, 'node_modules', name);
    await mkdir(dirname(destination), { recursive: true });
    await symlink(target, destination, 'dir');
  }
  const gate = await import(pathToFileURL(join(root, metadata.exports['.'])).href);
  const settings = await import(pathToFileURL(join(root, metadata.exports['./settings'])).href);
  assert.equal(typeof gate.apply, 'function');
  assert.equal(typeof settings.apply, 'function');
  assert.equal(settings.name, 'independent-auto-review-settings-host');
  const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8');
  assert.match(patch, /id: independent-auto-review\n/);
  assert.match(patch, /id: independent-auto-review-settings-host\n\s+name: '@local\/dsh-independent-auto-review\/settings'/);
  assert.match(patch, /id: auto-review\n\s+name: '@deepseek-ai\/dsh-experimental-auto-review'\n\s+disabled: true/);
  assert.doesNotMatch(patch, /name: '@local\/dsh-independent-auto-review-settings'/);

  await t.test('Extracted root bundle mounts canonical sibling rows, suppresses builtin and saves through real ConfigEditor', async child => {
    const r = await lifecycleRuntime(child, { packageDirectory: root });
    assert.equal(r.gate().options.name, metadata.name);
    assert.equal(r.settings().options.name, `${metadata.name}/settings`);
    assert.ok(r.gate().parent === r.settings().parent, 'Gate and settings must have one sibling owner');
    const builtin = [...r.root.loader.entries()].find(entry => entry.options.id === 'auto-review');
    assert.equal(builtin.options.disabled, true);
    assert.notEqual(builtin.fiber?.state, 2, 'Builtin review must not be active alongside the root gate');
    const store = r.root.get(SETTINGS_SERVICE).store;
    const old = await r.read();
    const saved = await r.save({ expectedRevision: old.revision, reviewer: { ...reviewer, timeoutMs: 57000 } });
    assert.equal(saved.saved, true);
    assert.equal(saved.reviewer.timeoutMs, 57000);
    assert.ok(r.root.get(SETTINGS_SERVICE).store === store);
    assert.equal(r.gate().options.config.unknownRoot.keep, true);
    assert.equal(r.gate().options.config.reviewer.unknownReviewerField.keep, true);
    assert.equal(r.gate().id, 'include:independent-auto-review');
    const profileManifest = JSON.parse(await readFile(join(r.dir, 'package.json'), 'utf8'));
    assert.deepEqual(profileManifest.dsh.profile.bundles, ['@local/iar-lifecycle-base', metadata.name]);
    assert.deepEqual(Object.keys(profileManifest.dependencies), [metadata.name]);
  });

  await t.test('Extracted root bundle keeps gate active when its settings services are absent', async child => {
    const r = await lifecycleRuntime(child, { packageDirectory: root, headless: true });
    assert.equal(r.gate().fiber.state, 2);
    assert.equal(r.root.get('configEditor'), undefined);
    assert.equal(r.root.get('typert'), undefined);
    assert.notEqual(r.settings()?.fiber?.state, 2);
    assert.ok(r.root.permissionPresets.names.includes('auto'));
  });
});
