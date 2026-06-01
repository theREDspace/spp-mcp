import type { Tool } from './types';
import { z } from 'zod';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import { objectTypeSchema } from '../helpers/schemas';
import { ok, fail } from '../helpers/toolResult';

const inputSchema = z.object({
  objectType: objectTypeSchema,
});

const describeObjectType: Tool = {
  name: 'describe_object_type',
  description: 'Describe the schema, canonical/alternate keys, required fields, and examples for any business object type. Prefer the bo://schema/{objectType} resource if your client supports MCP resources.',
  inputSchema,
  outputSchema: z.object({ ok: z.boolean(), objectType: z.string(), schema: z.any() }),
  handler: async ({ objectType }: { objectType: string }) => {
    const schema = boSchemaRegistry[objectType];
    if (!schema) return fail(new Error(`Unknown objectType '${objectType}'`));
    return ok({ ok: true, objectType, schema });
  },
};
export default describeObjectType;
