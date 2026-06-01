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

/** Generic output shape returned by all CRUD tools. */
export const crudOutputSchema = z
  .object({
    ok: z.boolean(),
    objectType: z.string(),
    operation: z.string(),
    data: z.any().optional(),
    count: z.number().optional(),
  })
  .describe('Standard CRUD result envelope.');
