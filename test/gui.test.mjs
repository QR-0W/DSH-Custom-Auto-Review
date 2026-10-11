import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewMutation, normalizeReviewer, reviewDraft, submitReview, reviewConfigEntries } from '../tools/gui/domain.js';

const draft = { provider: 'gptpro', model: 'codex-auto-review', reasoningEffort: 'medium', timeoutMs: '60000' };
const reviewer = { ...draft, timeoutMs: 60000 };

test('GUI registers one bundle-card form and its review-row alternate, never the old companion', () => {
  assert.deepEqual(reviewConfigEntries(), [
    { name: 'plugins.bundle.config', key: '@local/dsh-independent-auto-review' },
    { name: 'plugins.row.config', key: '@local/dsh-independent-auto-review#independent-auto-review' },
  ]);
});

test('Normalized GUI request exposes only independent reviewer fields', () => {
  assert.deepEqual(normalizeReviewer({ ...draft, mainModel: 'must-not-be-written' }), reviewer);
});

test('Host operations address only the independent reviewer fields', () => {
  const ops = reviewMutation({ ...draft, mainModel: 'must-not-be-written' });
  assert.equal(ops.length, 4);
  assert.ok(ops.every(op => op.path[0] === 'reviewer'));
  assert.equal(ops[2].value, 60000);
});

test('GUI omits empty effort and Host restores the bundle default', () => {
  assert.equal(Object.hasOwn(normalizeReviewer({ ...draft, reasoningEffort: '' }), 'reasoningEffort'), false);
  assert.deepEqual(reviewMutation({ ...draft, reasoningEffort: '' }).at(-1), { op: 'unset', path: ['reviewer', 'reasoningEffort'] });
});

for (const [field, value] of [['provider', ' '], ['model', ''], ['timeoutMs', 0], ['timeoutMs', 300001], ['timeoutMs', 1.5], ['timeoutMs', ''], ['timeoutMs', null], ['reasoningEffort', null]]) {
  test(`GUI rejects invalid ${field}: ${JSON.stringify(value)}`, () => assert.throws(() => normalizeReviewer({ ...draft, [field]: value })));
}

test('GUI reads saved reviewer values without reading main settings', () => {
  assert.deepEqual(reviewDraft({ reviewer, mainModel: 'untouched' }), draft);
});

test('GUI save sends the editor read revision and a normalized reviewer directly', async () => {
  let captured;
  const api = { async save(request) { captured = request; return { saved: true, revision: 4, reviewer }; } };
  const result = await submitReview(api, draft, 3);
  assert.deepEqual(captured, { expectedRevision: 3, reviewer });
  assert.equal(result.revision, 4);
});

test('GUI refuses an unconfirmed Host save', async () => {
  await assert.rejects(submitReview({ async save() { return { saved: false }; } }, draft, 3), /refused/);
});

test('GUI preserves a transport failure', async () => {
  await assert.rejects(submitReview({ async save() { throw new Error('network'); } }, draft, 3), /network/);
});

test('GUI prevents writes without a valid safe read revision', async () => {
  let called = false;
  for (const revision of [undefined, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(submitReview({ async save() { called = true; } }, draft, revision), /revision/);
  }
  assert.equal(called, false);
});
