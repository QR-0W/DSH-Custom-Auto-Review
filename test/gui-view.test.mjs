import test from 'node:test';
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import { reviewViewPlugin } from '../tools/gui/domain.js';

const namespace = 'remote.dshCustomAutoReviewSettings';
const tick = () => new Promise(resolve => setImmediate(resolve));

function runtime(t) {
  const root = new Context();
  root.provide('slots', {});
  root.provide('remote', {});
  t.after(() => root.fiber.dispose());
  return root;
}

test('GUI view explicitly injects the mounted Remote namespace', () => {
  const register = () => {};
  const view = reviewViewPlugin(register);
  assert.deepEqual(view.inject, ['slots', 'remote', namespace]);
  assert.equal(view.apply, register);
});

test('Real Cordis view waits for the namespace instead of accessing it from the parent', async t => {
  const root = runtime(t);
  let called = 0;
  let seen;
  const fiber = root.plugin(reviewViewPlugin(ctx => {
    called++;
    seen = ctx.get(namespace);
  }));
  await tick();
  assert.equal(called, 0);
  const api = { read: () => 'reviewer' };
  root.provide(namespace, api);
  await fiber;
  assert.equal(called, 1);
  assert.equal(seen, api);
});

test('Real Cordis disposes the owned view when its Remote namespace is withdrawn', async t => {
  const root = runtime(t);
  const withdraw = root.provide(namespace, { read: () => 'reviewer' });
  let disposed = 0;
  const fiber = root.plugin(reviewViewPlugin(ctx => {
    ctx.effect(() => () => { disposed++; });
  }));
  await fiber;
  withdraw();
  await tick();
  assert.equal(disposed, 1);
});
