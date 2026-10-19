import { randomInt } from 'node:crypto';
import { normalizeReviewer, reviewMutation } from './domain.js';
import { ReviewCatalog } from './catalog.js';

const REVIEW_PACKAGE = '@local/dsh-custom-auto-review';

function reviewerValue(value) {
  if (!value?.provider && !value?.model) return { provider: '', model: '', timeoutMs: value?.timeoutMs ?? 60000 };
  return normalizeReviewer({
    ...value,
    reasoningEffort: value.reasoningEffort === null ? undefined : value.reasoningEffort,
    timeoutMs: value.timeoutMs ?? 60000,
  });
}

export const REVIEW_ENTRY = 'include:dsh-custom-auto-review';

/** One reload-safe operation shared by the UI and tool. */
export class ReviewSettingsStore {
  constructor(configEditor, initialRevision = randomInt(0, 2 ** 40), llm) {
    this.editor = configEditor;
    this.revision = initialRevision;
    this.key = undefined;
    this.tail = Promise.resolve();
    this.catalogs = new ReviewCatalog(llm);
  }
  row() {
    const rows = this.editor.configuration();
    const exact = rows.find(item => item.entry.id === REVIEW_ENTRY);
    const candidates = rows.filter(item => item.entry.options.name === REVIEW_PACKAGE);
    const row = exact ?? (candidates.length === 1 ? candidates[0] : undefined);
    if (!row?.entry.fiber?.config) throw new Error('Review component is not active or its configuration is ambiguous.');
    return row;
  }
  async catalog(query) { return this.catalogs.catalog(query); }
  fingerprint(raw, inherited) { return JSON.stringify({ raw, inherited }); }
  read() {
    const row = this.row();
    const key = this.fingerprint(row.entry.options.config ?? {}, row.inherited);
    if (this.key !== undefined && key !== this.key) this.revision++;
    this.key = key;
    const r = reviewerValue(row.entry.fiber?.config?.reviewer);
    return { namespace: REVIEW_ENTRY, revision: this.revision, reviewer: { ...r } };
  }
  save(input) {
    const run = this.tail.then(() => this.performSave(input));
    this.tail = run.catch(() => {});
    return run;
  }
  async performSave(input) {
    if (!input || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) throw new Error('revision');
    const current = this.read();
    if (current.revision !== input.expectedRevision) throw new Error('refused');
    const expectedKey = this.key;
    const draft = normalizeReviewer(input.reviewer);
    const capabilities = await this.catalog({ provider: draft.provider, model: draft.model });
    if (draft.reasoningEffort && !capabilities.reasoning.efforts.some(item => item.id === draft.reasoningEffort)) {
      throw new Error(`Unsupported reasoning effort: ${draft.reasoningEffort}.`);
    }
    const operations = reviewMutation(draft);
    const row = this.row();
    await this.editor.edit(row.entry, (raw, inherited) => {
      if (this.fingerprint(raw, inherited) !== expectedKey) throw new Error('refused');
      const next = structuredClone(raw ?? {});
      const r = { ...(next.reviewer ?? {}) };
      for (const operation of operations) {
        const field = operation.path[1];
        if (operation.op === 'unset') {
          if (field === 'reasoningEffort' && inherited?.reviewer?.[field]) r[field] = null;
          else delete r[field];
        } else r[field] = operation.value;
      }
      next.reviewer = r;
      reviewerValue({ ...(inherited?.reviewer ?? {}), ...r });
      return next;
    });
    return { ...this.read(), saved: true, autoMayRequireReselection: true };
  }
}
