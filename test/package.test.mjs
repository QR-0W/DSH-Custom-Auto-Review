import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, mkdir, symlink, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lifecycleRuntime, reviewer } from './lifecycle-fixtures.mjs';
import { GUI_PACKAGE, SETTINGS_SERVICE } from '../tools/gui/rpc.js';

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
  assert.equal(metadata.name, '@local/dsh-custom-auto-review');
  assert.equal(GUI_PACKAGE, metadata.name);
  assert.equal(metadata.version, '0.3.0');
  const supportedPeerRange = '0.2.1-rc.1 || 0.2.1-rc.2';
  for (const [name, version] of Object.entries(metadata.peerDependencies).filter(([name]) => name.startsWith('@deepseek-ai/dsh-'))) {
    assert.equal(version, supportedPeerRange, `${name} peer support must be the exact tested release set`);
  }
  for (const [name, version] of Object.entries(metadata.devDependencies).filter(([name]) => name.startsWith('@deepseek-ai/dsh-'))) {
    assert.equal(version, '0.2.1-rc.2', `${name} must use the unified rc.2 test runtime`);
  }
  for (const file of ['locale/en.json', 'locale/zh.json', 'tools/gui/locale/en.json', 'tools/gui/locale/zh.json']) assert.ok(paths.has(file), `Missing localized metadata ${file}`);
  const icons = [...paths].filter(file => file.endsWith('.svg'));
  assert.ok(icons.length > 0, 'The published bundle must include an original SVG icon');
  const packageTexts = await Promise.all([...paths]
    .filter(file => /\.(?:js|json|ya?ml|md|svg|txt|css|html)$/i.test(file))
    .map(file => readFile(join(root, file), 'utf8')));
  const publishedText = packageTexts.join('\n');
  assert.doesNotMatch(publishedText, /\bgptpro\b|codex-auto-review/i);
  assert.doesNotMatch(publishedText, /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/);
  assert.doesNotMatch(publishedText, /\bfree\s+(?:model|review|gateway|endpoint)\b/i);
  assert.doesNotMatch(publishedText, /DSH_CREDENTIALS_PATH|\.credentials\.yaml|readFile(?:Sync)?\([^)]*credentials/i);
  for (const file of ['locale/en.json', 'locale/zh.json', 'tools/gui/locale/en.json', 'tools/gui/locale/zh.json']) {
    const dictionary = JSON.parse(await readFile(join(root, file), 'utf8'));
    assert.ok(dictionary.meta?.title && dictionary.meta?.description, `${file} needs localized display metadata`);
  }
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
  assert.equal(settings.name, 'dsh-custom-auto-review-settings-host');
  const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8');
  assert.match(patch, /id: dsh-custom-auto-review\n\s+name: '@local\/dsh-custom-auto-review'/);
  assert.match(patch, /id: dsh-custom-auto-review-settings-host\n\s+name: '@local\/dsh-custom-auto-review\/settings'/);
  assert.match(patch, /id: auto-review\n\s+name: '@deepseek-ai\/dsh-experimental-auto-review'\n\s+disabled: true/);
  assert.doesNotMatch(patch, /name: '@local\/dsh-custom-auto-review-settings'/);

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
    assert.equal(r.gate().id, 'include:dsh-custom-auto-review');
    const profileManifest = JSON.parse(await readFile(join(r.dir, 'package.json'), 'utf8'));
    assert.deepEqual(profileManifest.dsh.profile.bundles, ['@local/review-lifecycle-base', metadata.name]);
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
