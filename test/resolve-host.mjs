import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

let requireHost;
export function initialize({ root }) {
  requireHost = createRequire(join(root, 'package.json'));
}
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@deepseek-ai/')) {
    return { url: pathToFileURL(requireHost.resolve(specifier)).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
