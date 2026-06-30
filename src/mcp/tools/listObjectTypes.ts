import type { Tool } from './types';
import { z } from 'zod';
import { mergedRegistry } from '../../services/registry';
import { ok } from '../helpers/toolResult';

const inputSchema = z.object({});

const listObjectTypes: Tool = {
  name: 'list_object_types',
  description: 'List all supported business object types (curated + derived). Prefer reading the bo://catalog resource if your client supports MCP resources.',
  inputSchema,
  // Permissive object schema so both success and error shapes pass client-side AJV validation.
  outputSchema: z.object({
    // Success-path fields
    ok: z.boolean().optional(),
    objectTypes: z.array(z.string()).optional(),
    // Error-path fields (from fail() helper)
    error: z.string().optional(),
    type: z.string().optional(),
    code: z.string().optional(),
    hint: z.string().optional(),
    suggestion: z.string().optional(),
    example: z.any().optional(),
  }),
  handler: async () => {
    const objectTypes = Object.keys(mergedRegistry);
    return ok({ ok: true, objectTypes });
  },
};
export default listObjectTypes;
