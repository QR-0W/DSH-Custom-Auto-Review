import { z } from 'zod';

export const GUI_PACKAGE = '@local/dsh-custom-auto-review';
export const SETTINGS_SERVICE = 'dshCustomAutoReviewSettings';
const choice = z.object({ id: z.string(), name: z.string() }).strict();
const readReviewer = z.object({ provider: z.string(), model: z.string(), reasoningEffort: z.string().optional(), timeoutMs: z.number().int().min(1).max(300000) }).strict();
const saveReviewer = z.object({ provider: z.string().min(1), model: z.string().min(1), reasoningEffort: z.string().optional(), timeoutMs: z.number().int().min(1).max(300000) }).strict();
const settingsResult = z.object({ namespace: z.literal('include:dsh-custom-auto-review'), revision: z.number().int().nonnegative(), reviewer: readReviewer, saved: z.boolean().optional(), autoMayRequireReselection: z.boolean().optional() }).strict();
const saveRequest = z.object({ expectedRevision: z.number().int().nonnegative(), reviewer: saveReviewer }).strict();
const catalogQuery = z.object({ provider: z.string().optional(), model: z.string().optional() }).strict();
const catalogResult = z.object({
  providers: z.array(choice),
  models: z.array(choice),
  reasoning: z.object({ efforts: z.array(choice), defaultEffort: z.string().optional() }).strict(),
}).strict();
const codec = (name, schema) => ({ mode: 'strict', typeSymbol: `${GUI_PACKAGE}#${name}`, create: () => schema });
export function createDescriptors() {
  return ['read', 'save', 'catalog'].map(method => ({
    id: `${GUI_PACKAGE}#${SETTINGS_SERVICE}/${method}`, service: SETTINGS_SERVICE,
    namespace: SETTINGS_SERVICE, method, implementation: method, invocation: { kind: 'direct' },
    parameters: method === 'save' ? [{ name: 'request', wire: 'request', source: 'json', codec: codec('SaveRequest', saveRequest) }] :
      method === 'catalog' ? [{ name: 'query', wire: 'query', source: 'json', codec: codec('CatalogQuery', catalogQuery) }] : [],
    result: method === 'catalog' ? codec('CatalogResult', catalogResult) : codec('SettingsResult', settingsResult),
  }));
}
export function hostContribution() {
  return { package: GUI_PACKAGE, face: 'host', schemas: [], model: { services: [{ key: SETTINGS_SERVICE, exportName: 'ReviewSettingsRemote', tags: [], description: 'Read, save, and inspect the model catalog for Auto Review settings.', members: [{ kind: 'method', name: 'read', signature: 'read(): ReviewSettingsSnapshot' }, { kind: 'method', name: 'save', signature: 'save(request: SaveReviewSettings): Promise<ReviewSettingsSnapshot>' }, { kind: 'method', name: 'catalog', signature: 'catalog(query: ReviewCatalogQuery): Promise<ReviewCatalog>' }], types: [] }], events: [], objects: [] }, invocations: createDescriptors() };
}
export function clientContribution() { return { package: GUI_PACKAGE, descriptors: createDescriptors() }; }
