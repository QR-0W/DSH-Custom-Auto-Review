import { submitReview } from './domain.js';

function remoteValue(result) {
  if (result?.ok === true) return result.value;
  if (result?.ok === false) throw result.error;
  throw new Error('protocol');
}

/** Allowlist known failure categories; never display arbitrary Host messages or private data. */
export function reviewErrorKey(error, fallback) {
  const keys = { provider: 'providerError', model: 'modelError', effort: 'effortError', timeout: 'timeoutError',
    revision: 'conflict', refused: 'refused', protocol: 'protocolError' };
  if (Object.hasOwn(keys, error?.message)) return keys[error.message];
  if (error?.code === 'gateway/input-invalid') return 'invalidRequest';
  if (error?.code === 'gateway/definition-unavailable') return 'serviceUnavailable';
  return fallback;
}

/** One API lifetime. Only the latest request may publish state or reach the view as a result. */
export function createReviewClient(api, publish) {
  let generation = 0;
  let active = false;
  const wire = { save: async request => remoteValue(await api.save(request)) };
  async function run(operation, read) {
    if (!active) return undefined;
    const request = ++generation;
    const current = () => active && request === generation;
    try {
      const data = await operation();
      if (!current()) return undefined;
      const state = { status: 'ready', revision: data.revision, reviewer: data.reviewer };
      publish(state);
      return state;
    } catch (error) {
      if (!current()) return undefined;
      if (read) publish({ status: 'unavailable', errorKey: reviewErrorKey(error, 'loadError') });
      throw error;
    }
  }
  return {
    activate() { generation++; active = true; publish({ status: 'loading' }); },
    dispose() { generation++; active = false; },
    refresh() { return run(async () => remoteValue(await api.read()), true); },
    save(draft, revision) { return run(() => submitReview(wire, draft, revision), false); },
  };
}
