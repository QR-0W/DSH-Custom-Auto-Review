import assert from 'node:assert/strict';
import test from 'node:test';
import { apply, Config } from '../src/auto-review.js';
import { buildReviewOptions, resolveReviewer } from '../src/reviewer.js';
import { lifecycleRuntime, reviewer } from './lifecycle-fixtures.mjs';

for (const config of [{}, { reviewer: { provider: '', model: '' } }]) {
  test(`Unconfigured schema and gate are inert: ${JSON.stringify(config)}`, () => {
    assert.equal(resolveReviewer(Config(config).reviewer), undefined);
    apply(new Proxy({}, { get() { throw new Error('An unconfigured gate must not touch Host services.'); } }), Config(config));
  });
}
for (const route of [{ provider: 'p', model: '' }, { provider: '', model: 'm' }, { provider: ' p', model: 'm' }, { provider: 'p', model: 'm ' }, { provider: 'p', model: 'm', timeoutMs: 0 }, { provider: '', model: '', timeoutMs: -1 }]) {
  test(`Schema rejects invalid reviewer before persistence: ${JSON.stringify(route)}`, () => {
    assert.throws(() => Config({ reviewer: route }));
  });
}
test('Explicit null effort selects the adapter default and never reaches stream options as null', () => {
  const selected = resolveReviewer({ ...reviewer, reasoningEffort: null });
  const options = buildReviewOptions(selected, new AbortController().signal, 'policy', 'evidence');
  assert.equal(Object.hasOwn(options, 'reasoningEffort'), false);
});
test('Real Loader keeps settings alive while unconfigured; saving a user-selected route enables only the gate', async t => {
  const runtime = await lifecycleRuntime(t, { rawConfig: { reviewer: { provider: '', model: '', timeoutMs: 60000 } } });
  assert.equal(runtime.root.permissionPresets.names.includes('auto'), false);
  const before = await runtime.read();
  assert.equal(before.reviewer.provider, '');
  assert.equal(before.reviewer.model, '');
  const saved = await runtime.save({ reviewer, expectedRevision: before.revision });
  assert.equal(saved.reviewer.provider, reviewer.provider);
  assert.equal(runtime.root.permissionPresets.names.includes('auto'), true);
  assert.equal(runtime.requests.length, 0);
});
