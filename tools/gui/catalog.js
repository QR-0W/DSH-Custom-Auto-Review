function publicItems(items, label) {
  if (!Array.isArray(items)) throw new Error(`Invalid Host ${label} catalog.`);
  return items.map(item => {
    const id = item?.id;
    const name = item?.name;
    if (typeof id !== 'string' || typeof name !== 'string') {
      throw new Error(`Invalid Host ${label} catalog.`);
    }
    return { id, name };
  });
}

export class ReviewCatalog {
  constructor(llm) {
    this.llm = llm;
  }

  async catalog(query = {}) {
    const { provider, model } = query ?? {};
    const llm = this.llm;
    if (typeof llm?.listProviders !== 'function' ||
        typeof llm?.listModels !== 'function' ||
        typeof llm?.resolveModelInfo !== 'function') {
      throw new Error('Host LLM capability catalog is unavailable.');
    }

    let providers;
    try {
      providers = publicItems(llm.listProviders(), 'provider');
    } catch {
      throw new Error('Unable to load Host providers.');
    }

    const empty = { providers, models: [], reasoning: { efforts: [] } };
    if (provider === undefined || provider === '') {
      if (model !== undefined && model !== '') throw new Error('A provider is required to inspect a model.');
      return empty;
    }
    if (typeof provider !== 'string' || !providers.some(item => item.id === provider)) {
      throw new Error(`Unsupported provider: ${String(provider)}.`);
    }

    let rawModels;
    try {
      rawModels = await llm.listModels(provider);
    } catch {
      throw new Error(`Unable to load models for provider "${provider}".`);
    }
    if (!Array.isArray(rawModels)) throw new Error('Invalid Host model catalog.');
    const models = publicItems(rawModels.filter(item => item?.provider === provider), 'model');
    const result = { providers, models, reasoning: { efforts: [] } };
    if (model === undefined || model === '') return result;
    if (typeof model !== 'string' || !models.some(item => item.id === model)) {
      throw new Error(`Unsupported model for provider "${provider}": ${String(model)}.`);
    }

    let info;
    try {
      info = await llm.resolveModelInfo(provider, model);
    } catch {
      throw new Error(`Unable to resolve model capabilities for "${provider}/${model}".`);
    }
    const source = info?.reasoning;
    if (source == null) return result;
    const efforts = publicItems(source.efforts ?? [], 'reasoning effort');
    const defaultEffort = source.defaultEffort;
    result.reasoning = {
      efforts,
      ...(typeof defaultEffort === 'string' ? { defaultEffort } : {}),
    };
    return result;
  }
}

export default ReviewCatalog;
