import assert from 'node:assert/strict';
import { apply, testing } from '../src/auto-review.js';
import { reviewer, fixture, decisionStream, mockContext } from './fixtures.mjs';

const host = mockContext();
apply(host.ctx, { reviewer });
const call = fixture({ mainProvider: 'fixture-main-provider', mainModel: 'fixture-main-model' });
try {
  const result = await testing.classifyRisk(host.ctx, call.agent, call.exec, call.exec.signal, reviewer);
  assert.deepEqual(result, { risk: 'low', decision: 'allow' });
  assert.deepEqual(host.calls.map(({ provider, model }) => ({ provider, model })), [
    { provider: 'fixture-provider', model: 'fixture-reviewer' },
  ]);
} finally {
  await host.dispose();
}

const failed = mockContext(() => { throw new Error('synthetic adapter failure'); });
apply(failed.ctx, { reviewer });
try {
  const result = await failed.invoke(fixture().exec);
  assert.equal(result.kind, 'deny');
  assert.equal(failed.calls.length, 1);
} finally {
  await failed.dispose();
}

console.log('Synthetic review checks passed without loading a profile, network, or credentials.');
