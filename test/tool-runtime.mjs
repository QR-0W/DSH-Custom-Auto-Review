import assert from 'node:assert/strict';
import { ToolRuntime } from '@deepseek-ai/dsh-tools';
import { NativeToolExecutor } from '@deepseek-ai/dsh-tool-executor-native';

// Use the shipped executor and policy pipeline, translating fixtures to raw calls.
export function toolRuntime(ctx) {
  const tools = new ToolRuntime(ctx);
  tools.setExecutor(new NativeToolExecutor(ctx));
  return Object.assign(tools, {
    async executeOne({ name, callId, arguments: args, agent, signal }) {
      const { results } = await tools.execute({
        calls: [{ type: 'tool-call', name, id: callId, arguments: JSON.stringify(args) }],
        agent,
        signal,
      });
      assert.equal(results.length, 1);
      assert.equal(results[0].callId, callId);
      return results[0].result;
    },
  });
}
