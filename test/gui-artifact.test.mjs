import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { buildClient } from '../tools/gui/build.mjs';
import { GUI_PACKAGE } from '../tools/gui/rpc.js';

// ModuleLoader envelope only: no DOM, React replacement, or browser usability claim.
test('Generated Client registers exactly one canonical package factory', async () => {
  const artifact = await readFile(new URL('../tools/gui/client.js', import.meta.url), 'utf8');
  const registrations = [];
  runInNewContext(artifact, { window: { __ModuleLoader__: { load: value => registrations.push(value) } } });
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].id, GUI_PACKAGE);
  assert.equal(GUI_PACKAGE, '@local/dsh-independent-auto-review');
  assert.equal(typeof registrations[0].factory, 'function');
});

test('Committed Client artifact matches ordinary module build output', async () => {
  assert.equal(await readFile(new URL('../tools/gui/client.js', import.meta.url), 'utf8'), await buildClient());
});
