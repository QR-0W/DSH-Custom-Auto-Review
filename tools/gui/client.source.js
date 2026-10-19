import { reviewDraft, reviewConfigEntries, reviewViewPlugin } from './domain.js';
import { createReviewClient, reviewErrorKey } from './client-requests.js';
import { clientContribution } from './rpc.js';

export function factory(require) {
const React = require('react');
const h = React.createElement;
const dictionaries = {
  en: {
    summary: 'Use a separate model for Auto Review.', intro: 'These settings affect Auto Review only. The main model stays unchanged.',
    provider: 'Review provider', model: 'Review model', effort: 'Reasoning effort', timeout: 'Timeout (milliseconds)',
    routeHint: 'Choose a registered provider and one of its available models.',
    effortHint: 'Choose an effort supported by the selected model. Adapter default removes the saved override.',
    timeoutHint: 'Enter an integer from 1 to 300000. Default: 60000.',
    lifecycle: 'Saving reloads the reviewer. Auto sessions can move to workspace-write. Select Auto again after saving.',
    privacy: 'Review evidence may contain private project data. Use a trusted provider that offers HTTPS.',
    validation: 'Saving does not test the provider connection. Invalid routes stop review; they do not use the main model.',
    save: 'Save review settings', saving: 'Saving…', reload: 'Reload saved values', loading: 'Loading review settings…',
    catalogLoading: 'Loading provider and model options…', catalogError: 'Cannot load provider and model options. Retry the catalog request.',
    retryCatalog: 'Retry catalog', chooseProvider: 'Select a provider', chooseModel: 'Select a model', adapterDefault: 'Adapter default',
    unavailableValue: 'Unavailable saved value',
    unavailable: 'These settings cannot be saved here. Enable the review component and use the local Host connection.',
    saved: 'Review settings saved. Select Auto again if the permission mode changed.',
    refused: 'The Host refused the save. Reload saved values before trying again.',
    conflict: 'Saved settings changed while you edited. Reload saved values to continue.',
    providerError: 'Choose a review provider.', modelError: 'Choose a review model.',
    effortError: 'Choose a reasoning effort from the model catalog.', timeoutError: 'Timeout must be an integer from 1 to 300000.',
    loadError: 'Cannot read review settings. Check the Host connection and enable the review component, then reload.',
    reloadError: 'Reload failed. Your draft remains on this page.',
    protocolError: 'The Host returned an invalid response. Refresh this page after checking the plugin version.',
    invalidRequest: 'The Host rejected the settings format. Reload and check all fields.',
    serviceUnavailable: 'The settings service is unavailable. Enable the settings component and refresh this page.',
    transportError: 'The save failed. Your draft remains on this page.', unsaved: 'Unsaved changes',
  },
  zh: {
    summary: '使用与主模型独立的模型进行 Auto Review。', intro: '这些设置仅用于 Auto Review，不会改变主模型。',
    provider: '审查服务商', model: '审查模型', effort: '推理强度', timeout: '超时（毫秒）',
    routeHint: '选择已注册的服务商及其可用模型。',
    effortHint: '选择所选模型支持的推理强度。选择「适配器默认」会移除已保存的覆盖值。',
    timeoutHint: '填写 1 至 300000 的整数。默认值：60000。',
    lifecycle: '保存会重新加载审查组件。Auto 会话可能切换为 workspace-write。保存后按需重新选择 Auto。',
    privacy: '审查证据可能包含项目私有数据。请使用可信且提供 HTTPS 连接的服务商。',
    validation: '保存不会测试服务商连接。路由配置错误会阻止审查，不会改用主模型。',
    save: '保存审查设置', saving: '正在保存…', reload: '重新加载已保存值', loading: '正在加载审查设置…',
    catalogLoading: '正在加载服务商和模型选项…', catalogError: '无法加载服务商和模型选项。请重试目录查询。',
    retryCatalog: '重试目录查询', chooseProvider: '选择服务商', chooseModel: '选择模型', adapterDefault: '适配器默认',
    unavailableValue: '已保存的值不可用',
    unavailable: '当前无法保存这些设置。请启用审查组件，并通过本机 Host 连接访问。',
    saved: '审查设置已保存。若权限模式发生变化，请重新选择 Auto。',
    refused: 'Host 拒绝了保存。请重新加载已保存值后重试。',
    conflict: '编辑期间，已保存的设置发生变化。请重新加载已保存值后继续。',
    providerError: '请选择审查服务商。', modelError: '请选择审查模型。',
    effortError: '请选择模型目录中的推理强度。', timeoutError: '超时必须是 1 至 300000 的整数。',
    loadError: '无法读取审查设置。请检查 Host 连接并启用审查组件，然后重新加载。',
    reloadError: '重新加载失败。草稿仍保留在此页面。',
    protocolError: 'Host 返回了无效响应。请检查插件版本后刷新页面。',
    invalidRequest: 'Host 拒绝了设置格式。请重新加载并检查各字段。',
    serviceUnavailable: '设置服务不可用。请启用设置组件后刷新页面。',
    transportError: '保存失败。草稿仍保留在此页面。', unsaved: '有未保存的修改',
  },
};

function HostReviewForm({ api, t }) {
  const [state, setState] = React.useState({ status: 'loading' });
  const client = React.useMemo(() => createReviewClient(api, setState), [api]);
  React.useEffect(() => {
    client.activate();
    void client.refresh().catch(() => {});
    return () => client.dispose();
  }, [client]);
  return h(ReviewForm, { client, state, t });
}

function ReviewForm({ client, state, t }) {
  const [draft, setDraft] = React.useState(() => reviewDraft(state));
  const [revision, setRevision] = React.useState(state?.revision);
  const [dirty, setDirty] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState(null);
  const [directory, setDirectory] = React.useState({ status: 'loading', providers: [], models: [], reasoning: { efforts: [] } });
  const alive = React.useRef(true);
  const locked = React.useRef(false);
  const catalogRequest = React.useRef(0);
  const uid = React.useId();
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; catalogRequest.current++; }; }, []);

  async function loadCatalog(provider, model) {
    const request = ++catalogRequest.current;
    const current = () => alive.current && request === catalogRequest.current;
    let base;
    let route;
    let detail;
    setDirectory(previous => ({ ...previous, status: 'loading', provider, model, models: [], reasoning: { efforts: [] }, defaultEffort: undefined, errorKey: null }));
    try {
      base = await client.catalog({});
      if (!current()) return;
      setDirectory(previous => ({ ...previous, providers: base.providers, status: 'loading' }));
      route = provider ? await client.catalog({ provider }) : base;
      if (!current()) return;
      setDirectory(previous => ({ ...previous, providers: base.providers, models: route.models, status: 'loading' }));
      detail = provider && model ? await client.catalog({ provider, model }) : route;
      if (!current()) return;
      setDirectory({ status: 'ready', provider, model, providers: base.providers, models: route.models,
        reasoning: detail.reasoning, defaultEffort: detail.reasoning.defaultEffort });
    } catch (error) {
      if (!current()) return;
      setDirectory({ status: 'error', provider, model, providers: base?.providers ?? [], models: route?.models ?? [],
        reasoning: detail?.reasoning ?? { efforts: [] }, defaultEffort: detail?.reasoning?.defaultEffort,
        errorKey: reviewErrorKey(error, 'catalogError') });
    }
  }

  React.useEffect(() => {
    if (state?.status === 'ready' && !dirty) {
      const saved = reviewDraft(state);
      setDraft(saved);
      setRevision(state.revision);
      void loadCatalog(saved.provider, saved.model);
    }
  }, [state?.revision, state?.status]);

  const editable = state?.status === 'ready';
  const conflict = dirty && state?.revision !== revision;
  const providerAvailable = directory.providers.some(item => item.id === draft.provider);
  const modelAvailable = directory.models.some(item => item.id === draft.model);
  const effortChoices = directory.reasoning?.efforts ?? [];
  const effortAvailable = !draft.reasoningEffort || effortChoices.some(item => item.id === draft.reasoningEffort);
  const catalogMatches = directory.status === 'ready' && directory.provider === draft.provider && directory.model === draft.model;
  const canSave = catalogMatches && providerAvailable && modelAvailable && effortAvailable && Boolean(draft.provider && draft.model);

  async function reload() {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try {
      const next = await client.refresh();
      if (alive.current && next) {
        const saved = reviewDraft(next);
        setDraft(saved); setRevision(next.revision); setDirty(false); setNotice(null);
        void loadCatalog(saved.provider, saved.model);
      }
    } catch (error) { if (alive.current) setNotice({ kind: 'error', key: reviewErrorKey(error, 'reloadError') }); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }

  async function save(event) {
    event.preventDefault();
    if (locked.current || !editable || conflict || !canSave) return;
    locked.current = true; setBusy(true); setNotice(null);
    try {
      const saved = await client.save(draft, revision);
      if (alive.current && saved) {
        const next = reviewDraft(saved);
        setDraft(next); setRevision(saved.revision); setDirty(false); setNotice({ kind: 'success', key: 'saved' });
        void loadCatalog(next.provider, next.model);
      }
    } catch (error) {
      if (alive.current) setNotice({ kind: 'error', key: reviewErrorKey(error, 'transportError') });
    } finally {
      locked.current = false; if (alive.current) setBusy(false);
    }
  }

  const change = (key, value) => {
    const next = { ...draft, [key]: value };
    if (key === 'provider') { next.model = ''; next.reasoningEffort = ''; }
    if (key === 'model') next.reasoningEffort = '';
    setDraft(next); setDirty(true); setNotice(null);
    if (key === 'provider' || key === 'model') void loadCatalog(next.provider, next.model);
  };

  const selectField = (key, choices, placeholder, disabled, hint, emptyLabel) => {
    const selected = draft[key] ?? '';
    const available = choices.some(item => item.id === selected);
    return h('div', { className: 'iar-field', key },
      h('label', { htmlFor: `${uid}-${key}` }, t(key === 'reasoningEffort' ? 'effort' : key)),
      h('select', { id: `${uid}-${key}`, value: selected, disabled: !editable || busy || disabled,
        'aria-describedby': hint ? `${uid}-${key}-hint` : undefined,
        onChange: event => change(key, event.target.value),
      },
        key === 'reasoningEffort' ? h('option', { value: '' }, emptyLabel) : h('option', { value: '' }, t(placeholder)),
        selected && !available ? h('option', { value: selected, disabled: true }, `${t('unavailableValue')}: ${selected}`) : null,
        choices.map(item => h('option', { key: item.id, value: item.id }, item.name)),
      ),
      hint ? h('p', { id: `${uid}-${key}-hint`, className: 'iar-help' }, t(hint)) : null);
  };

  const timeoutField = h('div', { className: 'iar-field', key: 'timeoutMs' },
    h('label', { htmlFor: `${uid}-timeoutMs` }, t('timeout')),
    h('input', { id: `${uid}-timeoutMs`, type: 'number', value: draft.timeoutMs, disabled: !editable || busy,
      min: 1, max: 300000, step: 1, autoComplete: 'off',
      'aria-describedby': `${uid}-timeoutMs-hint`,
      onChange: event => { setDraft(old => ({ ...old, timeoutMs: event.target.value })); setDirty(true); setNotice(null); },
    }), h('p', { id: `${uid}-timeoutMs-hint`, className: 'iar-help' }, t('timeoutHint')));

  const adapterDefault = directory.defaultEffort ? `${t('adapterDefault')} (${directory.defaultEffort})` : t('adapterDefault');
  return h('form', { className: 'iar-form', onSubmit: save, 'aria-busy': busy },
    h('p', { className: 'iar-intro' }, t('intro')),
    state?.status === 'loading' ? h('p', { role: 'status' }, t('loading')) : null,
    !editable && state?.status !== 'loading' ? h('p', { role: 'alert', className: 'iar-error' }, t(state?.errorKey ?? 'unavailable')) : null,
    selectField('provider', directory.providers, 'chooseProvider', directory.status === 'loading', 'routeHint'),
    selectField('model', directory.models, 'chooseModel', directory.status === 'loading' || !providerAvailable, null),
    selectField('reasoningEffort', effortChoices, null, directory.status !== 'ready' || !providerAvailable || !modelAvailable, 'effortHint', adapterDefault),
    directory.status === 'loading' && editable ? h('p', { role: 'status', className: 'iar-help' }, t('catalogLoading')) : null,
    directory.status === 'error' ? h('div', { className: 'iar-catalog-error' },
      h('p', { role: 'alert', className: 'iar-error' }, t(directory.errorKey ?? 'catalogError')),
      h('button', { type: 'button', disabled: busy, onClick: () => void loadCatalog(draft.provider, draft.model) }, t('retryCatalog')),
    ) : null,
    timeoutField,
    h('div', { className: 'iar-warning' }, h('p', null, t('lifecycle')), h('p', null, t('privacy'))),
    h('p', { className: 'iar-help' }, t('validation')),
    conflict ? h('p', { className: 'iar-error', role: 'alert' }, t('conflict')) : null,
    notice ? h('p', { role: notice.kind === 'error' ? 'alert' : 'status', className: `iar-${notice.kind}` }, t(notice.key)) : null,
    h('div', { className: 'iar-actions' },
      h('button', { type: 'submit', className: 'iar-primary', disabled: !editable || busy || !dirty || conflict || !canSave }, t(busy ? 'saving' : 'save')),
      h('button', { type: 'button', disabled: busy, onClick: reload }, t('reload')),
      dirty ? h('span', { className: 'iar-help' }, t('unsaved')) : null,
    ),
  );
}

const css = `
.iar-form { display: flex; flex-direction: column; gap: 18px; max-width: 640px; color: var(--dsw-alias-label-primary); font-size: 13px; }
.iar-form p { margin: 0; line-height: 1.55; }
.iar-field { display: flex; flex-direction: column; gap: 6px; }
.iar-field label { font-weight: 500; }
.iar-field input, .iar-field select { box-sizing: border-box; width: 100%; min-height: 36px; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; }
.iar-field input:focus-visible, .iar-field select:focus-visible, .iar-actions button:focus-visible, .iar-catalog-error button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.iar-field input:disabled, .iar-field select:disabled { opacity: .55; cursor: not-allowed; }
.iar-help, .iar-intro { color: var(--dsw-alias-label-secondary); }
.iar-help { font-size: 12px; }
.iar-warning { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-2); }
.iar-error { color: var(--dsw-alias-state-error-primary); }
.iar-success { color: var(--dsw-alias-state-success-primary); }
.iar-catalog-error { display: flex; flex-direction: column; gap: 8px; }
.iar-actions, .iar-catalog-error { align-items: flex-start; }
.iar-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.iar-actions button, .iar-catalog-error button { min-height: 34px; padding: 7px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; cursor: pointer; }
.iar-actions .iar-primary { border-color: var(--dsw-alias-brand-primary); }
.iar-actions button:disabled, .iar-catalog-error button:disabled { opacity: .55; cursor: not-allowed; }
`;

return {
  inject: ['slots', 'locale', 'remote'],
  async apply(ctx) {
    const unmount = await ctx.remote.$mount(clientContribution());
    ctx.effect(() => unmount);
    ctx.effect(() => ctx.locale.register('dshCustomAutoReviewSettings', 'en', dictionaries.en));
    ctx.effect(() => ctx.locale.register('dshCustomAutoReviewSettings', 'zh', dictionaries.zh));
    ctx.plugin(reviewViewPlugin(viewCtx => {
      const api = viewCtx.remote.dshCustomAutoReviewSettings;
      for (const entry of reviewConfigEntries()) {
        viewCtx.slots.inject(entry.name, () => viewCtx.slots.register({
          ...entry, locale: 'dshCustomAutoReviewSettings',
        }, props => props.view === 'summary' ? h('span', null, props.t('summary')) :
          h(React.Fragment, null, h('style', null, css), h(HostReviewForm, { api, t: props.t }))));
      }
    }));
  },
};
}
