/** Normalize only independent reviewer fields; omitted effort restores inheritance. */
export function normalizeReviewer(draft) {
  const provider = typeof draft?.provider === 'string' ? draft.provider.trim() : '';
  const model = typeof draft?.model === 'string' ? draft.model.trim() : '';
  if (!provider) throw new Error('provider');
  if (!model) throw new Error('model');
  const raw = draft.timeoutMs;
  if (raw === '' || raw === null || raw === undefined ||
      (typeof raw !== 'number' && typeof raw !== 'string')) throw new Error('timeout');
  const timeoutMs = Number(raw);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000) throw new Error('timeout');
  if (draft.reasoningEffort !== undefined && typeof draft.reasoningEffort !== 'string') throw new Error('effort');
  const reasoningEffort = draft.reasoningEffort?.trim();
  return { provider, model, timeoutMs, ...(reasoningEffort ? { reasoningEffort } : {}) };
}

/** Host-only field operations, preserving all other raw configuration. */
export function reviewMutation(draft) {
  const reviewer = normalizeReviewer(draft);
  return [
    ...['provider', 'model', 'timeoutMs'].map(field => ({ op: 'set', path: ['reviewer', field], value: reviewer[field] })),
    reviewer.reasoningEffort ? { op: 'set', path: ['reviewer', 'reasoningEffort'], value: reviewer.reasoningEffort } :
      { op: 'unset', path: ['reviewer', 'reasoningEffort'] },
  ];
}

export function reviewDraft(state) {
  const r = state?.reviewer ?? {};
  return { provider: r.provider ?? '', model: r.model ?? '',
    reasoningEffort: r.reasoningEffort ?? '', timeoutMs: String(r.timeoutMs ?? 60000) };
}

/** Send the read revision and a reviewer value directly to the shared Host operation. */
export async function submitReview(api, draft, expectedRevision) {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error('revision');
  const saved = await api.save({ reviewer: normalizeReviewer(draft), expectedRevision });
  if (saved?.saved !== true) throw new Error('refused');
  return saved;
}

/** Mount RPC first, then start an owned view with the namespace explicitly injected. */
export function reviewViewPlugin(register) {
  return {
    name: 'dsh-custom-auto-review-settings-view',
    inject: ['slots', 'remote', 'remote.dshCustomAutoReviewSettings'],
    apply: register,
  };
}

/** The single installed card and its internal review-row alternate route. */
export function reviewConfigEntries() {
  return [
    { name: 'plugins.bundle.config', key: '@local/dsh-custom-auto-review' },
    { name: 'plugins.row.config', key: '@local/dsh-custom-auto-review#dsh-custom-auto-review' },
  ];
}
