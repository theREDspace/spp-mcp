import type { Tool } from './types';
import { getSchema } from '../../services/registry';
import SPPClient from '../../clients/SPPClient';
import { normalizeIdForBO } from '../../utils/normalizeAndValidateBOInput';
import type { BOName } from '../../services/BORecordMap';
import { objectTypeSchema, crudOutputSchema, MAX_WRITE_BATCH } from '../helpers/schemas';
import { ok, fail } from '../helpers/toolResult';
import { z } from 'zod';

const inputSchema = z.object({
  objectType: objectTypeSchema,
  id: z.string().optional().describe('ID (canonical or alternate) — single-record form.'),
  ids: z
    .array(z.string())
    .min(1)
    .max(MAX_WRITE_BATCH)
    .optional()
    .describe(`Bulk form: up to ${MAX_WRITE_BATCH} CANONICAL ids deleted in ONE SPP request (alternate ids are not resolved in bulk).`),
  idField: z.string().optional().describe('Optional explicit ID field name for the single-record form. If omitted, the canonical ID is used.'),
});

const genericDelete: Tool = {
  name: 'generic_delete',
  description:
    `Delete one record ({id}, canonical or alternate) or up to ${MAX_WRITE_BATCH} records in a single call ({ids: [...]}, canonical ids only). ` +
    'Bulk is one SPP request — always prefer it over looping single deletes. ' +
    'Bulk responses report per-record outcomes: check "ok" and "results" for partial failures (ok=false means at least one record failed). ' +
    'Works for curated, derived, and unknown BOs.',
  inputSchema,
  outputSchema: crudOutputSchema,
  handler: async (
    { objectType, id, ids, idField }: { objectType: string; id?: string; ids?: string[]; idField?: string },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    if (ids && id !== undefined) {
      return fail(new Error('Provide either {id} or {ids}, not both.'));
    }

    if (ids) {
      const results = await sppClient.delete(objectType as BOName, ids);
      const succeeded = results.filter((r) => r.ok).length;
      return ok({
        ok: succeeded === results.length,
        objectType,
        operation: 'delete',
        results,
        succeeded,
        failed: results.length - succeeded,
      });
    }

    if (id === undefined) {
      return fail(new Error('Provide {id} for a single delete, or {ids: [...]} for a bulk delete.'));
    }

    const schema = getSchema(objectType);
    const resolved = idField
      ? { idField, id }
      : normalizeIdForBO(objectType, { id });

    // SPP's Delete command requires the canonical id.
    let canonicalId = resolved.id;
    if (resolved.idField !== schema.canonicalId) {
      const record = await sppClient.read(objectType as BOName, resolved.id, resolved.idField);
      const c = (record as any)?.[schema.canonicalId];
      if (!c) return fail(new Error(
        `Could not resolve canonical '${schema.canonicalId}' for ${objectType} ${resolved.idField}=${resolved.id}`
      ));
      canonicalId = c;
    }

    // Throws a classified SPP error on failure — a delete only reports ok:true
    // when SPP confirmed it.
    const data = await sppClient.delete(objectType as BOName, canonicalId);
    return ok({ ok: true, objectType, operation: 'delete', data });
  },
};
export default genericDelete;
