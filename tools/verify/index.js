export function createProbeDefinition(schema, onBody) {
  return {
    ...schema,
    output: { schema: { type: 'boolean' }, render(_args, value) { return [{ type: 'text', text: String(value) }]; } },
    async execute(args) { onBody(); return args.value; },
  };
}
