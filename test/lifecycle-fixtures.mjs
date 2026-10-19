import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { Context } from '@deepseek-ai/cordis';
import { Loader } from '@deepseek-ai/cordis-plugin-loader';
import { mountRootInclude, readProfilePatches } from '@deepseek-ai/dsh-app-boot';
import { ConfigEditor } from '@deepseek-ai/dsh-config-editor';
import { TypertRegistry } from '@deepseek-ai/dsh-typert-registry';
import { TypertGatewayService } from '@deepseek-ai/dsh-api-gateway';
import { ToolRuntime } from '@deepseek-ai/dsh-tools';
import { ApprovalService } from '@deepseek-ai/dsh-user-approval';
import { PermissionPresetService } from '@deepseek-ai/dsh-permission-presets';
import { SessionProjectionRegistry } from '@deepseek-ai/dsh-session-projection';
import { Session, SESSION_FORMAT_VERSION } from '@deepseek-ai/dsh-session';
import { SETTINGS_SERVICE } from '../tools/gui/rpc.js';
import { fixture, decisionStream, llmDirectory, ownerPeer } from './fixtures.mjs';

export const reviewer = { provider: 'fixture-provider', model: 'fixture-reviewer', reasoningEffort: 'fixture-effort', timeoutMs: 60000 };
const sourceRoot = fileURLToPath(new URL('../', import.meta.url));

/** Real Loader, disk ConfigEditor, permission services, Gateway and production plugins.
 * Synthetic seams: temporary profile/bundle, session catalog, prompt sink, non-executing shell
 * and LLM stream. No original profile, real model, browser or network is used.
 */
export async function lifecycleRuntime(t, { headless = false, stream = () => decisionStream(), directory, packageDirectory, legacySettingsDirectory, rawConfig } = {}) {
  const dir = directory ?? await mkdtemp(join(tmpdir(), 'iar-lifecycle-'));
  const root = new Context();
  t.after(async () => { try { await root.fiber.dispose(); } finally { await rm(dir, { recursive: true, force: true }); } });
  const installAnchor = join(process.env.DSH_TEST_RUNTIME_DIR, 'package.json');
  const yaml = createRequire(installAnchor)('yaml');
  const packageMetadata = packageDirectory ? JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8')) : undefined;
  const bundleName = packageMetadata?.name ?? '@local/iar-lifecycle-fixture';
  const packagePatch = packageMetadata ? yaml.parse(await readFile(join(packageDirectory, packageMetadata.dsh.bundle.patch), 'utf8')) : [];
  const rootRowId = packageMetadata
    ? packagePatch.flatMap(row => row.insert ?? []).find(row => row.name === bundleName)?.id
    : 'dsh-custom-auto-review';
  if (!rootRowId) throw new Error(`No root row found for ${bundleName}`);
  const legacyMetadata = legacySettingsDirectory ? JSON.parse(await readFile(join(legacySettingsDirectory, 'package.json'), 'utf8')) : undefined;
  const bundle = join(dir, 'node_modules', ...bundleName.split('/'));
  await mkdir(join(dir, 'node_modules', '@local'), { recursive: true });
  const home = join(dir, 'home'); await mkdir(home);
  const patchPath = join(dir, 'cordis.patch.yml');
  const profile = { name: 'isolated-review-fixture', dir, home, installAnchor, patchPath, overlays: [] };
  const bundleNames = packageDirectory ? ['@local/review-lifecycle-base', bundleName] : [bundleName];
  const dependencies = { [bundleName]: 'file:' + (packageDirectory ?? bundle) };
  if (legacySettingsDirectory) {
    const name = legacyMetadata.name;
    await symlink(legacySettingsDirectory, join(dir, 'node_modules', ...name.split('/')), 'dir');
    bundleNames.push(name);
    dependencies[name] = 'file:' + legacySettingsDirectory;
  }
  await writeFile(join(dir, 'package.json'), JSON.stringify({ private: true, dependencies, dsh: { profile: { bundles: bundleNames } } }));
  const raw = structuredClone(rawConfig ?? { reviewer: { ...reviewer, unknownReviewerField: { keep: true } }, unknownRoot: { keep: true } });
  if (packageDirectory) {
    await symlink(packageDirectory, bundle, 'dir');
    // Like shipped profiles, the bootstrap is empty and a lower bundle layer inserts builtin rows.
    // Root overrides must be composed after that insertion, not before a nonempty bootstrap list.
    const base = join(dir, 'node_modules', '@local', 'review-lifecycle-base');
    await mkdir(base);
    await writeFile(join(base, 'package.json'), JSON.stringify({ name: '@local/review-lifecycle-base', version: '1.0.0', dsh: { bundle: { patch: './patch.json' } } }));
    await writeFile(join(base, 'patch.json'), JSON.stringify([{ insert: [{ id: 'auto-review', name: '@deepseek-ai/dsh-experimental-auto-review' }] }]));
    await writeFile(join(dir, 'root.json'), '[]\n');
    await writeFile(patchPath, JSON.stringify([{ id: rootRowId, name: bundleName, config: raw }]));
  } else {
    await mkdir(bundle);
    await writeFile(patchPath, '[]\n');
    await writeFile(join(dir, 'root.json'), '[]\n');
    await writeFile(join(bundle, 'package.json'), JSON.stringify({ name: bundleName, version: '1.0.0', dsh: { bundle: { patch: './patch.json' } } }));
    const rows = [{ id: rootRowId, name: pathToFileURL(join(sourceRoot, 'src/auto-review.js')).href, config: raw }];
    if (!headless) rows.push({ id: 'dsh-custom-auto-review-settings-host', name: pathToFileURL(join(sourceRoot, 'tools/gui/host.js')).href });
    await writeFile(join(bundle, 'patch.json'), JSON.stringify([{ insert: rows }]));
  }

  new Loader(root, { baseUrl: pathToFileURL(join(dir, 'package.json')).href });
  root.provide('profileContext', profile);
  const sessions = [];
  root.provide('sessions', { list: () => sessions });
  root.provide('workingDirectory', { ensure: async () => dir });
  root.provide('shell', { sandboxMode: 'workspace-write' });
  root.provide('systemPrompt', { tools: () => () => {}, context: () => () => {}, getContextOrder: () => 0 });
  const requests = [];
  const modelDirectory = llmDirectory();
  root.provide('llm', { ...modelDirectory.llm, stream(options) { requests.push(options); return stream(options); } });
  new SessionProjectionRegistry(root);
  await root.plugin(ApprovalService, { policy: 'ask' });
  await root.plugin(PermissionPresetService, {});
  const tools = new ToolRuntime(root);
  let gateway, registry;
  if (!headless) {
    new ConfigEditor(root);
    registry = new TypertRegistry(root);
    gateway = new TypertGatewayService(root, TypertGatewayService.Config({}));
  }
  await mountRootInclude(root, join(dir, 'root.json'), readProfilePatches('dsh', profile));
  await root.loader.await();
  const entry = id => [...root.loader.entries()].find(row => row.id === `include:${id}`);
  const gate = () => entry(rootRowId);
  const settings = () => [...root.loader.entries()].find(row =>
    row.options.name === `${bundleName}/settings` || row.options.name === legacyMetadata?.name) ?? entry('dsh-custom-auto-review-settings-host');
  if (gate()?.fiber?.state !== 2) throw new Error(`Gate failed to mount: ${gate()?.fiber?.state}`);
  if (!headless && settings()?.fiber?.state !== 2) throw new Error(`Settings failed to mount: ${settings()?.fiber?.state}`);
  function session() {
    const f = fixture();
    const id = `fixture-${sessions.length}`;
    const value = Session.create(id, [], { version: SESSION_FORMAT_VERSION, id, createdAt: Date.now(), cwd: dir, isSeeded: false });
    sessions.push(value);
    root.emit('session/created', value);
    value.append('user/message', { id: 'user-1', role: 'user', ...f.events[0].data }, { surfaceOp: 'append' });
    value.append('turn/start', { turn: 1 });
    value.append('step/start', { turn: 1, step: 1 });
    value.append('request/header', { header: { config: { provider: 'main-provider', model: 'main-model' }, tools: [f.schema] }, reason: 'initial' });
    value.append('assistant/message', { turn: 1, step: 1, message: { id: 'assistant-1', role: 'assistant', source: { kind: 'model', provider: 'main-provider', model: 'main-model' }, content: f.events[2].data.message.content }, stream: [] }, { surfaceOp: 'append' });
    value.append('tool/call', f.events[3].data);
    f.agent.session = value;
    return { ...f, session: value };
  }
  const peer = ownerPeer(root);
  return { root, dir, profile, raw, gate, settings, registry, tools, requests, session,
    editor: root.get('configEditor'),
    document: () => readFile(patchPath, 'utf8'),
    read: () => gateway.invoke({ namespace: SETTINGS_SERVICE, method: 'read', args: {}, peer }),
    save: request => gateway.invoke({ namespace: SETTINGS_SERVICE, method: 'save', args: { request }, peer }),
  };
}
