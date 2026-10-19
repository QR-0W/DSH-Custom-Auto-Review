import assert from 'node:assert/strict';
import test from 'node:test';
import { ReviewCatalog } from '../tools/gui/catalog.js';
import { REVIEW_ENTRY, ReviewSettingsStore } from '../tools/gui/service.js';

const provider = { id: 'provider-a', name: 'Provider A' };
const models = [{ provider: 'provider-a', id: 'model-a', name: 'Model A' }];
const modelInfo = {
  reasoning: {
    efforts: [{ id: 'balanced', name: 'Balanced' }, { id: 'deep', name: 'Deep' }],
    defaultEffort: 'balanced',
  },
};

function makeLlm(overrides = {}) {
  return {
    listProviders: () => [provider],
    listModels: async () => models,
    resolveModelInfo: async () => modelInfo,
    ...overrides,
  };
}

function makeEditor({
  id = REVIEW_ENTRY,
  raw = {},
  inherited = {},
  reviewer = undefined,
} = {}) {
  const entry = {
    id,
    options: { name: '@local/dsh-custom-auto-review', config: raw },
    fiber: { config: reviewer === undefined ? {} : { reviewer } },
  };
  const row = { entry, inherited };
  let edits = 0;
  const editor = {
    configuration: () => [row],
    edit: async (target, update) => {
      edits++;
      const next = update(target.options.config, inherited);
      target.options.config = next;
      target.fiber.config.reviewer = {
        ...(inherited.reviewer ?? {}),
        ...(next.reviewer ?? {}),
      };
    },
    get edits() { return edits; },
  };
  return { editor, entry, row };
}

const validDraft = (overrides = {}) => ({
  provider: 'provider-a',
  model: 'model-a',
  timeoutMs: 90000,
  ...overrides,
});

test('catalog returns only public provider, model, and reasoning fields', async () => {
  const privateProvider = { id: 'provider-a', name: 'Provider A' };
  Object.defineProperties(privateProvider, {
    baseURL: { enumerable: true, get() { throw new Error('baseURL must not be read'); } },
    credentials: { enumerable: true, get() { throw new Error('credentials must not be read'); } },
  });
  const privateModel = { provider: 'provider-a', id: 'model-a', name: 'Model A' };
  Object.defineProperty(privateModel, 'apiKey', {
    enumerable: true,
    get() { throw new Error('apiKey must not be read'); },
  });
  const llm = makeLlm({
    listProviders: () => [privateProvider],
    listModels: async () => [privateModel, { provider: 'other', id: 'hidden', name: 'Hidden' }],
    resolveModelInfo: async () => ({
      reasoning: {
        efforts: [{ id: 'balanced', name: 'Balanced', get description() { throw new Error('description must not be read'); } }],
        defaultEffort: 'balanced',
      },
      get baseURL() { throw new Error('model info baseURL must not be read'); },
    }),
  });
  Object.defineProperty(llm, 'stream', { get() { throw new Error('stream must not be read'); } });

  const result = await new ReviewCatalog(llm).catalog({ provider: 'provider-a', model: 'model-a' });
  assert.deepEqual(result, {
    providers: [{ id: 'provider-a', name: 'Provider A' }],
    models: [{ id: 'model-a', name: 'Model A' }],
    reasoning: { efforts: [{ id: 'balanced', name: 'Balanced' }], defaultEffort: 'balanced' },
  });
});

test('catalog lists providers before selection and rejects unsupported routes', async () => {
  const catalog = new ReviewCatalog(makeLlm());
  assert.deepEqual(await catalog.catalog(), {
    providers: [provider], models: [], reasoning: { efforts: [] },
  });
  await assert.rejects(catalog.catalog({ provider: 'missing' }), /Unsupported provider/);
  await assert.rejects(catalog.catalog({ provider: 'provider-a', model: 'missing' }), /Unsupported model/);
  await assert.rejects(catalog.catalog({ model: 'model-a' }), /provider is required/);
});

test('catalog reports Host capability failures clearly', async () => {
  await assert.rejects(
    new ReviewCatalog(makeLlm({ listProviders() { throw new Error('private detail'); } })).catalog(),
    /Unable to load Host providers/,
  );
  await assert.rejects(
    new ReviewCatalog(makeLlm({ listModels: async () => { throw new Error('private detail'); } }))
      .catalog({ provider: 'provider-a' }),
    /Unable to load models/,
  );
  await assert.rejects(
    new ReviewCatalog(makeLlm({ resolveModelInfo: async () => { throw new Error('private detail'); } }))
      .catalog({ provider: 'provider-a', model: 'model-a' }),
    /Unable to resolve model capabilities/,
  );
});

test('settings read allows an unconfigured reviewer and locates the package by exact name', () => {
  const { editor } = makeEditor({ id: 'include:other-row' });
  const store = new ReviewSettingsStore(editor, 7, makeLlm());
  assert.deepEqual(store.read(), {
    namespace: REVIEW_ENTRY,
    revision: 7,
    reviewer: { provider: '', model: '', timeoutMs: 60000 },
  });
});

test('save rejects unsupported effort and missing Host validation', async () => {
  const { editor } = makeEditor({ reviewer: validDraft() });
  const store = new ReviewSettingsStore(editor, 11, makeLlm());
  const revision = store.read().revision;
  await assert.rejects(
    store.save({ expectedRevision: revision, reviewer: validDraft({ reasoningEffort: 'unsupported' }) }),
    /Unsupported reasoning effort/,
  );
  assert.equal(editor.edits, 0);

  const withoutLlm = new ReviewSettingsStore(editor, revision);
  await assert.rejects(
    withoutLlm.save({ expectedRevision: revision, reviewer: validDraft() }),
    /capability catalog is unavailable/,
  );
  assert.equal(editor.edits, 0);
});

test('empty effort masks inherited values and preserves unknown configuration', async () => {
  const inherited = { reviewer: {
    provider: 'provider-a', model: 'model-a', timeoutMs: 60000, reasoningEffort: 'deep',
  } };
  const raw = { keepAtRoot: 'yes', reviewer: { keepNested: 'yes', reasoningEffort: 'balanced' } };
  const effective = { ...inherited.reviewer, ...raw.reviewer };
  const { editor, entry } = makeEditor({ raw, inherited, reviewer: effective });
  const store = new ReviewSettingsStore(editor, 19, makeLlm());
  const saved = await store.save({ expectedRevision: store.read().revision, reviewer: validDraft() });

  assert.equal(saved.reviewer.reasoningEffort, undefined);
  assert.equal(entry.options.config.keepAtRoot, 'yes');
  assert.equal(entry.options.config.reviewer.keepNested, 'yes');
  assert.equal(entry.options.config.reviewer.reasoningEffort, null);
  assert.equal(saved.reviewer.timeoutMs, 90000);
});

test('save retains revision CAS and refuses stale writes', async () => {
  const configured = validDraft({ reasoningEffort: 'deep' });
  const { editor } = makeEditor({ raw: { reviewer: { provider: 'provider-a' } }, reviewer: configured });
  const store = new ReviewSettingsStore(editor, 23, makeLlm());
  const first = await store.save({ expectedRevision: store.read().revision, reviewer: validDraft() });
  await assert.rejects(
    store.save({ expectedRevision: 23, reviewer: validDraft({ reasoningEffort: 'deep' }) }),
    /refused/,
  );
  assert.equal(first.saved, true);
  assert.equal(editor.edits, 1);
});

test('save performs the second CAS check against the edited raw config', async () => {
  const { editor, entry } = makeEditor({ reviewer: validDraft() });
  const originalEdit = editor.edit;
  editor.edit = async (target, update) => {
    target.options.config = { ...target.options.config, concurrentChange: true };
    return originalEdit(target, update);
  };
  const store = new ReviewSettingsStore(editor, 31, makeLlm());
  await assert.rejects(
    store.save({ expectedRevision: store.read().revision, reviewer: validDraft() }),
    /refused/,
  );
  assert.equal(entry.options.config.concurrentChange, true);
  assert.equal(entry.options.config.reviewer, undefined);
  assert.equal(editor.edits, 1);
});
