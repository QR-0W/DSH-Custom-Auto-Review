import test from 'node:test';
import assert from 'node:assert/strict';
import { createReviewClient, reviewErrorKey } from '../tools/gui/client-requests.js';

const reviewer = { provider: 'fixture-provider', model: 'fixture-reviewer', timeoutMs: 60000 };
const ok = revision => ({ ok: true, value: { reviewer, revision } });
function fixture() {
  const requests = [], states = [];
  const api = { read() { const request = Promise.withResolvers(); requests.push(request); return request.promise; } };
  const client = createReviewClient(api, state => states.push(state));
  client.activate();
  return { requests, states, api, client };
}

for (const stale of ['success', 'failure']) {
  test(`A late initial read ${stale} cannot overwrite a newer reload`, async () => {
    const { client, requests, states } = fixture();
    const initial = client.refresh(), reload = client.refresh();
    requests[1].resolve(ok(2));
    assert.equal((await reload).revision, 2);
    if (stale === 'success') requests[0].resolve(ok(1));
    else requests[0].reject(new Error('old request'));
    assert.equal(await initial, undefined);
    assert.equal(states.at(-1).revision, 2);
    assert.equal(states.length, 2);
  });
}

test('Current read failure is reported to both state and caller', async () => {
  const { client, requests, states } = fixture();
  const error = { code: 'gateway/definition-unavailable', message: 'private detail' };
  const request = client.refresh();
  requests[0].resolve({ ok: false, error });
  await assert.rejects(request, actual => actual === error);
  assert.deepEqual(states.at(-1), { status: 'unavailable', errorKey: 'serviceUnavailable' });
});

test('Unmount blocks all late state updates and starts no new request', async () => {
  const { client, requests, states } = fixture();
  const request = client.refresh();
  client.dispose();
  requests[0].resolve(ok(1));
  assert.equal(await request, undefined);
  assert.equal(await client.refresh(), undefined);
  assert.equal(requests.length, 1);
  assert.equal(states.length, 1);
});

test('Reactivation invalidates old effect-generation requests, including errors', async () => {
  const { client, requests, states } = fixture();
  const old = client.refresh();
  client.dispose(); client.activate();
  const fresh = client.refresh();
  requests[1].resolve(ok(3)); await fresh;
  requests[0].reject(new Error('previous effect'));
  assert.equal(await old, undefined);
  assert.equal(states.at(-1).revision, 3);
});

test('An old API owner cannot publish into its replacement', async () => {
  const old = fixture(), fresh = fixture();
  const oldRead = old.client.refresh();
  old.client.dispose();
  const newRead = fresh.client.refresh();
  fresh.requests[0].resolve(ok(9)); await newRead;
  old.requests[0].resolve(ok(1)); await oldRead;
  assert.equal(old.states.length, 1);
  assert.equal(fresh.states.at(-1).revision, 9);
});

test('A confirmed save invalidates an older pending read and sends no operations adapter', async () => {
  const { client, requests, states, api } = fixture();
  const read = client.refresh();
  let captured;
  api.save = async request => { captured = request; return { ok: true, value: { reviewer, revision: 4, saved: true } }; };
  const saved = await client.save({ ...reviewer, timeoutMs: '60000', reasoningEffort: '' }, 3);
  requests[0].resolve(ok(2));
  await read;
  assert.deepEqual(captured, { reviewer, expectedRevision: 3 });
  assert.equal(saved.revision, 4);
  assert.equal(states.at(-1).revision, 4);
});

test('Failed save rejects without replacing the ready snapshot', async () => {
  const { client, requests, states, api } = fixture();
  const read = client.refresh(); requests[0].resolve(ok(1)); await read;
  api.save = async () => ({ ok: false, error: new Error('refused') });
  await assert.rejects(client.save(reviewer, 1), /refused/);
  assert.equal(states.at(-1).status, 'ready');
  assert.equal(states.at(-1).revision, 1);
});

test('Diagnostics expose only known categories, not arbitrary errors', () => {
  assert.equal(reviewErrorKey(new Error('refused'), 'transportError'), 'refused');
  assert.equal(reviewErrorKey({ message: 'secret token', code: 'sensitive-value' }, 'reloadError'), 'reloadError');
  assert.equal(reviewErrorKey(null, 'loadError'), 'loadError');
});
