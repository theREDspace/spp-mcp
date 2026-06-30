// Shared Zod schemas for generic BO tools.

import { z } from 'zod';
import { mergedRegistry } from '../../services/registry';

const boNames = Object.keys(mergedRegistry);
if (boNames.length === 0) {
  throw new Error('mergedRegistry is empty — refusing to start with no objectType options.');
}

// z.string() instead of z.enum() — allows truly unknown BO names (passthrough layer).
export const objectTypeSchema = z
  .string()
  .describe(
    'Business object type name (e.g. "Project", "Booking", "Attributeset"). Call list_object_types to see all known types, or describe_object_type to inspect a specific type\'s fields and schema tier (curated/derived/passthrough).'
  );

export const boFieldsSchema = z
  .record(z.string(), z.any())
  .describe(
    'String-keyed map of BO field names → values. For curated types, call describe_object_type first to get the exact field names. For derived/passthrough types, unknown fields pass through to SuiteProjects Pro for validation.'
  );

export const boFieldsArraySchema = z
  .array(boFieldsSchema)
  .describe('Array of filter objects, one per parallel query.');

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
