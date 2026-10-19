import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, mkdir, symlink, rm, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Explicitly uses retained old packages, never manufactures an "old" package from new code.
// Processes run sequentially and exit before the next starts. No production profile or server is touched.
test('Stopped Host compositions migrate from retained two-package backup to one package and restore the backup', { timeout: 30000 }, async t => {
  assert.ok(process.env.IAR_ROLLBACK_DIR, 'Set IAR_ROLLBACK_DIR to the private retained artifact directory');
  const backup = process.env.IAR_ROLLBACK_DIR;
  const manifest = JSON.parse(await readFile(join(backup, 'artifacts.json'), 'utf8'));
  const directory = await mkdtemp(join(tmpdir(), 'iar-cold-migration-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const previous = new Map();

  async function extract(archive, label) {
    const into = join(directory, label); await mkdir(into);
    execFileSync('tar', ['-xzf', archive, '-C', into]);
    const root = join(into, 'package');
    const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    for (const name of Object.keys(metadata.peerDependencies)) {
      const destination = join(root, 'node_modules', name);
      await mkdir(dirname(destination), { recursive: true });
      await symlink(await realpath(join(process.env.DSH_TEST_RUNTIME_DIR, 'node_modules', name)), destination, 'dir');
    }
    return { root, metadata };
  }

  for (const [index, record] of manifest.artifacts.entries()) {
    const archive = join(backup, record.file);
    assert.equal(hash(await readFile(archive)), record.sha256, 'Old backup hash must match');
    const extracted = await extract(archive, `previous-${index}`);
    previous.set(extracted.metadata.name, extracted);
  }
  const oldRoot = previous.get('@local/dsh-independent-auto-review');
  const oldSettings = previous.get('@local/dsh-independent-auto-review-settings');
  assert.ok(oldRoot && oldSettings, 'Both original package backups are required');
  const packed = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', directory], { cwd: project, encoding: 'utf8' }))[0];
  const candidate = await extract(join(directory, packed.filename), 'candidate');
  const baseline = { reviewer: { provider: 'fixture-provider', model: 'fixture-reviewer', reasoningEffort: 'fixture-effort', timeoutMs: 54321, unknownReviewerField: { retained: true } }, unknownRoot: { retained: true }, mainModel: 'do-not-touch' };

  function boot(label, packageDirectory, legacySettingsDirectory) {
    const script = `
      import assert from 'node:assert/strict';
      import { lifecycleRuntime } from ${JSON.stringify(new URL('./lifecycle-fixtures.mjs', import.meta.url).href)};
      let cleanup;
      const r = await lifecycleRuntime({ after(fn) { cleanup = fn; } }, ${JSON.stringify({ packageDirectory, legacySettingsDirectory, rawConfig: baseline })});
      let result;
      try {
        assert.deepEqual(r.gate().options.config, ${JSON.stringify(baseline)});
        const builtin = [...r.root.loader.entries()].find(row => row.options.id === 'auto-review');
        assert.equal(builtin.options.disabled, true);
        assert.notEqual(builtin.fiber?.state, 2);
        assert.equal(r.root.permissionPresets.names.filter(name => name === 'auto').length, 1);
        assert.equal(r.tools.schemas().filter(tool => tool.name === 'auto_review_settings').length, 1);
        const saved = await r.read();
        assert.equal(saved.reviewer.timeoutMs, 54321);
        if (${JSON.stringify(label)} === 'candidate') {
          const reply = await r.save({ expectedRevision: saved.revision, reviewer: { ...saved.reviewer, timeoutMs: 57000 } });
          assert.equal(reply.saved, true);
          assert.equal(reply.reviewer.timeoutMs, 57000);
          assert.equal(r.gate().options.config.unknownRoot.retained, true);
          assert.equal(r.gate().options.config.reviewer.unknownReviewerField.retained, true);
          assert.equal(r.gate().options.config.mainModel, 'do-not-touch');
        }
        result = { label: ${JSON.stringify(label)}, raw: structuredClone(r.gate().options.config), reviewer: (await r.read()).reviewer };
      } finally { await cleanup(); }
      console.log('COLD_HOST_RESULT ' + JSON.stringify(result));
    `;
    const child = spawnSync(process.execPath, ['--unhandled-rejections=throw', '--import', fileURLToPath(new URL('./register-host.mjs', import.meta.url)), '--input-type=module', '-e', script], { encoding: 'utf8', timeout: 10000 });
    assert.equal(child.error, undefined);
    assert.equal(child.status, 0, `${label} boot/cleanup failed: ${child.stderr}`);
    const line = child.stdout.split('\n').find(line => line.startsWith('COLD_HOST_RESULT '));
    assert.ok(line, `${label} did not finish its acceptance assertions`);
    return JSON.parse(line.slice('COLD_HOST_RESULT '.length));
  }

  const before = boot('previous', oldRoot.root, oldSettings.root);
  const after = boot('candidate', candidate.root);
  const restored = boot('restored', oldRoot.root, oldSettings.root);
  assert.equal(after.reviewer.timeoutMs, 57000);
  assert.deepEqual(restored.raw, before.raw);
  assert.deepEqual(restored.reviewer, before.reviewer);
  for (const record of manifest.artifacts) assert.equal(hash(await readFile(join(backup, record.file))), record.sha256);
  t.diagnostic('Three isolated Host processes exited cleanly: original, candidate with changed save, restored original. This is not live-server migration or arbitrary SDK automatic rollback.');
});
