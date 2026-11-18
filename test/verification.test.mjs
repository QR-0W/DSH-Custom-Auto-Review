import test from 'node:test';
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import { toolRuntime } from './tool-runtime.mjs';
import { createProbeDefinition } from '../tools/verify/index.js';

test('The live probe uses parsed arguments in the real tool callback', async () => {
  const ctx = new Context();
  ctx.provide('systemPrompt', { tools: () => () => {} });
  const tools = toolRuntime(ctx);
  let calls = 0;
  tools.register(createProbeDefinition({
    name: 'verification_probe', description: 'Return the input flag.',
    parameters: { type: 'object', properties: { value: { type: 'boolean' } }, required: ['value'] },
  }, () => { calls++; }));
  try {
    const result = await tools.executeOne({ name: 'verification_probe', callId: 'probe-call', rootCallId: 'probe-call', arguments: { value: true }, signal: new AbortController().signal });
    assert.equal(result.isError, false);
    assert.equal(calls, 1);
  } finally { await ctx.fiber.dispose(); }
});
