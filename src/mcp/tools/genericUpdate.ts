import type { Tool } from './types';
import SPPClient from '../../clients/SPPClient';
import { normalizeAndValidateBOInput } from '../../utils/normalizeAndValidateBOInput';
import type { BOName } from '../../services/BORecordMap';
import { objectTypeSchema, boFieldsSchema, crudOutputSchema, MAX_WRITE_BATCH } from '../helpers/schemas';
import { ok, fail } from '../helpers/toolResult';
import { z } from 'zod';

const inputSchema = z.object({
  objectType: objectTypeSchema,
  id: z.string().optional().describe('Canonical or alternate ID value (single-record form; requires "changes").'),
  changes: boFieldsSchema.optional().describe('Map of fields to update (single-record form; requires "id").'),
  updates: z
    .array(z.object({ id: z.string(), changes: boFieldsSchema }))
    .min(1)
    .max(MAX_WRITE_BATCH)
    .optional()
    .describe(`Bulk form: up to ${MAX_WRITE_BATCH} {id, changes} records updated in ONE SPP request. Ids must be canonical.`),
});

const genericUpdate: Tool = {
  name: 'generic_update',
  description:
    `Update fields on one record ({id, changes}) or on up to ${MAX_WRITE_BATCH} records in a single call ({updates: [{id, changes}, ...]}). ` +
    'Bulk is one SPP request — always prefer it over looping single updates. ' +
    'Bulk responses report per-record outcomes: check "ok" and "results" for partial failures (ok=false means at least one record failed). ' +
    'Works for curated, derived, and unknown BOs.',
  inputSchema,
  outputSchema: crudOutputSchema,
  handler: async (
    { objectType, id, changes, updates }: {
      objectType: string;
      id?: string;
      changes?: Record<string, any>;
      updates?: { id: string; changes: Record<string, any> }[];
    },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    const hasSingle = id !== undefined || changes !== undefined;
    if (updates && hasSingle) {
      return fail(new Error('Provide either {id, changes} or {updates}, not both.'));
    }

    if (updates) {
      // Validate every record before any XML is sent — a bad record aborts the
      // whole batch instead of partially applying it.
      const normalized: { id: string; changes: Record<string, any> }[] = [];
      for (let i = 0; i < updates.length; i++) {
        const u = updates[i]!;
        try {
          normalized.push({ id: u.id, changes: normalizeAndValidateBOInput(objectType, u.changes, 'changes') });
        } catch (e) {
          return fail(new Error(`updates[${i}] (id=${u.id}) failed validation: ${e instanceof Error ? e.message : String(e)}`));
        }
      }
      const results = await sppClient.update(objectType as BOName, normalized);
      const succeeded = results.filter((r) => r.ok).length;
      return ok({
        ok: succeeded === results.length,
        objectType,
        operation: 'update',
        results,
        succeeded,
        failed: results.length - succeeded,
      });
    }

    if (id === undefined || changes === undefined) {
      return fail(new Error('Provide {id, changes} for a single update, or {updates: [{id, changes}, ...]} for a bulk update.'));
    }

    const normChanges = normalizeAndValidateBOInput(objectType, changes, 'changes');
    const data = await sppClient.update(objectType as BOName, id, normChanges);
    return ok({ ok: true, objectType, operation: 'update', data });
  },
};
export default genericUpdate;
