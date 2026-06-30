import type { Tool } from './types';
import { z } from 'zod';
import { getSchema, mergedRegistry } from '../../services/registry';
import { objectTypeSchema } from '../helpers/schemas';
import { ok } from '../helpers/toolResult';

const inputSchema = z.object({
  objectType: objectTypeSchema,
});

const describeObjectType: Tool = {
  name: 'describe_object_type',
  description: 'Describe the schema for any SuiteProjects Pro business object: fields, canonical/alternate IDs, required fields (curated only), and examples. The response includes a "source" field: "curated" = full metadata; "derived" = auto-generated from type file (no required fields or relationships); "passthrough" = no metadata available. Prefer the bo://schema/{objectType} resource if your client supports MCP resources. Call this before constructing a filter or payload for an unfamiliar object.',
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
    const schema = getSchema(objectType);
    if (schema.source === 'passthrough' && !mergedRegistry[objectType]) {
      return ok({
        ok: true,
        objectType,
        schema: {
          source: 'passthrough',
          note: `No metadata available for '${objectType}', but CRUD operations (generic_list, generic_read, generic_add, generic_update, generic_delete) will still work — unknown fields pass through to SuiteProjects Pro for server-side validation.`,
        },
      });
    }
    return ok({ ok: true, objectType, schema });
  },
};
export default describeObjectType;
