import type { Tool } from './types';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import SPPClient from '../../clients/SPPClient';
import { normalizeIdForBO } from '../../utils/normalizeAndValidateBOInput';
import type { BOName } from '../../services/BORecordMap';
import { objectTypeSchema, crudOutputSchema } from '../helpers/schemas';
import { ok, fail } from '../helpers/toolResult';
import { z } from 'zod';

const inputSchema = z.object({
  objectType: objectTypeSchema,
  id: z.string().describe('ID (canonical or alternate)'),
  idField: z.string().optional().describe('Optional explicit ID field name. If omitted, the canonical ID is used.'),
});

const genericDelete: Tool = {
  name: 'generic_delete',
  description: 'Delete a record by canonical or alternate ID from any business object.',
  inputSchema,
  outputSchema: crudOutputSchema,
  handler: async (
    { objectType, id, idField }: { objectType: string; id: string; idField?: string },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    const schema = boSchemaRegistry[objectType];
    if (!schema) return fail(new Error(`Unknown objectType '${objectType}'`));
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

    const data = await sppClient.delete(objectType as BOName, canonicalId);
    return ok({ ok: true, objectType, operation: 'delete', data });
  },
};
export default genericDelete;
