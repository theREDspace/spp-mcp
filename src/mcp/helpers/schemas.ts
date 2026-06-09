// Shared Zod schemas for generic BO tools.
//
// The objectType enum is built once at module load from the BO registry so
// MCP clients see the full list of valid BO names in the tool schema. This
// removes a whole class of "unknown objectType" failures.

import { z } from 'zod';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';

const boNames = Object.keys(boSchemaRegistry);
if (boNames.length === 0) {
  throw new Error('boSchemaRegistry is empty — refusing to start with no objectType options.');
}

// z.enum needs a non-empty tuple type.
export const objectTypeSchema = z
  .enum(boNames as [string, ...string[]])
  .describe(
    'Business object type. Field names, required fields, and example payloads vary per type — read the bo://schema/{objectType} resource for the definitive schema.'
  );

/** A flexible record schema for payload/filter/changes. Per-field validation
 *  still happens server-side in normalizeAndValidateBOInput using the BO
 *  registry, but we expose a permissive shape to the LLM so it can craft
 *  arbitrary keyed objects. */
export const boFieldsSchema = z
  .record(z.string(), z.any())
  .describe(
    'String-keyed map of BO field names → values. The exact field names depend on objectType — fetch bo://schema/{objectType} for the canonical list, required fields, and example.'
  );

export const boFieldsArraySchema = z
  .array(boFieldsSchema)
  .describe('Array of filter objects, one per parallel query.');

/** Error response shape returned by fail() helper. Export for reuse in all tools.
 *  Note: this is a permissive object schema (all fields optional) so it can also
 *  satisfy clients that strictly validate against MCP's outputSchema. */
export const errorResponseSchema = z
  .object({
    error: z.string().optional(),
    type: z.enum(['AUTH_ERROR', 'SPP_API_ERROR', 'TOOL_ERROR']).optional(),
    code: z.string().optional(),
    hint: z.string().optional(),
    suggestion: z.string().optional(),
    example: z.any().optional(),
  })
  .describe('Error response envelope.');

/** Generic output shape for all CRUD tools.
 *
 *  IMPORTANT: MCP's standardSchemaToJsonSchema requires the top-level schema
 *  to be an object (it rejects/breaks on unions). To support both success and
 *  error response shapes from a single schema, we declare a single object with
 *  ALL fields optional. Strict per-shape validation is done server-side in the
 *  handler — the outputSchema just needs to be permissive enough that the
 *  client's AJV validator accepts both shapes without "additionalProperties"
 *  or "required property" failures. */
export const crudOutputSchema = z
  .object({
    // Success-path fields
    ok: z.boolean().optional(),
    objectType: z.string().optional(),
    operation: z.string().optional(),
    data: z.any().optional(),
    count: z.number().optional(),
    message: z.string().optional(),
    // Error-path fields (from fail() helper)
    error: z.string().optional(),
    type: z.string().optional(),
    code: z.string().optional(),
    hint: z.string().optional(),
    suggestion: z.string().optional(),
    example: z.any().optional(),
  })
  .describe('Standard CRUD result envelope (success or error).');
