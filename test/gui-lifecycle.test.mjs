import test from 'node:test';
import assert from 'node:assert/strict';
import { lifecycleRuntime, reviewer } from './lifecycle-fixtures.mjs';
import { SETTINGS_SERVICE } from '../tools/gui/rpc.js';
import { setApprovalPolicy } from '@deepseek-ai/dsh-user-approval';

const options = { timeout: 15000 };

test('Real ConfigEditor serializes concurrent saves and rejects stale revisions', options, async t => {
  const r = await lifecycleRuntime(t);
  const old = await r.read();
  const results = await Promise.allSettled([59000, 58000].map(timeoutMs => r.save({ reviewer: { ...reviewer, timeoutMs }, expectedRevision: old.revision })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected').length, 1);
  await assert.rejects(r.save({ reviewer, expectedRevision: old.revision }), /refused/);
  assert.equal((await r.read()).reviewer.timeoutMs, 59000);
});

test('Actual tool save and Gateway share the surviving settings store across Loader reload', options, async t => {
  const r = await lifecycleRuntime(t);
  const f = r.session();
  const old = await r.read();
  const result = await r.tools.execute({ ...f.exec, name: 'auto_review_settings', arguments: {
    action: 'set', expectedRevision: old.revision, reviewer: { ...reviewer, reasoningEffort: '', timeoutMs: 58000 },
  } });
  assert.equal(result.isError, false, JSON.stringify(result));
  const saved = JSON.parse(result.content.find(block => block.type === 'text').text);
  assert.equal(saved.saved, true);
  assert.equal(saved.reviewer.reasoningEffort, undefined);
  assert.equal(saved.reviewer.timeoutMs, 58000);
  assert.deepEqual((await r.read()).reviewer, saved.reviewer);
  assert.deepEqual(r.gate().options.config.unknownRoot, r.raw.unknownRoot);
});

test('Actual Loader reload cancels and drains a pending review while preserving never and confined sandbox', options, async t => {
  const started = Promise.withResolvers();
  let closed = false;
  const r = await lifecycleRuntime(t, { stream: async function* (request) {
    try {
      started.resolve();
      await new Promise((resolve, reject) => {
        if (request.signal.aborted) reject(request.signal.reason);
        else request.signal.addEventListener('abort', () => reject(request.signal.reason), { once: true });
      });
    } finally { closed = true; }
  } });
  const f = r.session();
  r.root.permissionPresets.set(f.session, 'auto');
  setApprovalPolicy(f.session, 'never');
  let body = 0;
  r.tools.register({ ...f.schema, output: { schema: { type: 'boolean' }, render: () => [] }, execute() { body++; return true; } });
  const pending = r.tools.execute(f.exec);
  const outcome = pending.then(value => ({ value }), error => ({ error }));
  await started.promise;
  const old = await r.read();
  const saved = await r.save({ reviewer: { ...reviewer, timeoutMs: 58000 }, expectedRevision: old.revision });
  const result = await outcome;
  assert.equal(saved.saved, true);
  assert.equal(body, 0);
  assert.equal(closed, true);
  assert.ok(result.error || result.value?.isError, 'Cancelled review must not report an executed successful tool');
  assert.equal(r.root.approval.overrideOf(f.session), 'never');
  assert.equal(r.root.sessionProjections.stateOf(f.session, 'permissions').sandbox, 'workspace-write');
  assert.notEqual(r.root.permissionPresets.current(f.session), 'auto');
  assert.equal(r.requests[0].provider, reviewer.provider);
  assert.equal(r.requests[0].model, reviewer.model);
});

test('Real ConfigEditor rejects invalid route identifiers before any file write or gate reload', options, async t => {
  const r = await lifecycleRuntime(t);
  const before = await r.document();
  const config = r.gate().fiber.config;
  const snapshot = await r.read();
  const store = r.root.get(SETTINGS_SERVICE).store;
  let reloads = 0;
  r.root.on('permission-presets/catalog-changed', () => { reloads++; });
  for (const field of ['provider', 'model', 'reasoningEffort']) {
    for (const invalid of ['', ' ', ' padded ']) {
      await assert.rejects(r.editor.edit(r.gate(), raw => ({ ...raw, reviewer: { ...raw.reviewer, [field]: invalid } })));
      assert.equal(await r.document(), before, `${field}: rejected edit must not be persisted`);
      assert.ok(r.gate().fiber.config === config, `${field}: gate must not reload`);
    }
  }
  assert.equal(reloads, 0);
  assert.ok(r.root.get(SETTINGS_SERVICE).store === store);
  assert.deepEqual(await r.read(), snapshot);
});

test('Real ConfigEditor changed-value save keeps the settings sibling and reloads only the gate', options, async t => {
  const r = await lifecycleRuntime(t);
  const gateConfig = r.gate().fiber.config, settingsFiber = r.settings().fiber;
  const f = r.session();
  r.root.permissionPresets.set(f.session, 'auto');
  const catalog = [];
  r.root.on('permission-presets/catalog-changed', () => { catalog.push(r.root.permissionPresets.names.includes('auto')); });
  const store = r.root.get(SETTINGS_SERVICE).store;
  const tool = r.tools.get('auto_review_settings');
  const old = await r.read();
  const result = await r.save({ reviewer: { ...reviewer, timeoutMs: 59000 }, expectedRevision: old.revision });
  assert.equal(result.saved, true);
  assert.equal(result.reviewer.timeoutMs, 59000);
  assert.ok(result.revision > old.revision);
  assert.ok(r.gate().fiber.config !== gateConfig, 'Gate receives a new nonvolatile configuration');
  assert.equal(r.gate().fiber.config.reviewer.timeoutMs, 59000);
  assert.deepEqual(catalog, [false, true], 'Old gate withdraws and new gate registers');
  assert.equal(r.root.permissionPresets.current(f.session), 'workspace-write');
  assert.ok(r.settings().fiber === settingsFiber, 'Settings sibling fiber must survive');
  assert.ok(r.root.get(SETTINGS_SERVICE).store === store, 'Settings service store and serialization queue must survive');
  assert.ok(r.tools.get('auto_review_settings') === tool, 'Settings tool registration must survive');
  assert.deepEqual(r.gate().options.config.unknownRoot, r.raw.unknownRoot);
  assert.deepEqual(r.gate().options.config.reviewer.unknownReviewerField, r.raw.reviewer.unknownReviewerField);
  assert.match(await r.document(), /59000/);
  assert.deepEqual((await r.read()).reviewer, result.reviewer);
});

test('Real Loader gate mounts headlessly without settings, Typert or web services', options, async t => {
  const r = await lifecycleRuntime(t, { headless: true });
  assert.equal(r.gate().fiber.state, 2);
  assert.equal(r.root.get('configEditor'), undefined);
  assert.equal(r.root.get('typert'), undefined);
  assert.equal(r.root.get('remote'), undefined);
  assert.equal(r.settings(), undefined);
  assert.ok(r.root.permissionPresets.names.includes('auto'));
});
