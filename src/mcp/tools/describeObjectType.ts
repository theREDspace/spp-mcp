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
  // Permissive object schema so both success and error shapes pass client-side AJV validation.
  outputSchema: z.object({
    // Success-path fields
    ok: z.boolean().optional(),
    objectType: z.string().optional(),
    schema: z.any().optional(),
    // Error-path fields (from fail() helper)
    error: z.string().optional(),
    type: z.string().optional(),
    code: z.string().optional(),
    hint: z.string().optional(),
    suggestion: z.string().optional(),
    example: z.any().optional(),
  }),
  handler: async ({ objectType }: { objectType: string }) => {
    const schema = boSchemaRegistry[objectType];
    if (!schema) return fail(new Error(`Unknown objectType '${objectType}'`));
    return ok({ ok: true, objectType, schema });
  },
};
export default describeObjectType;
