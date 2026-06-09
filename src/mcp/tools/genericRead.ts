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
  id: z.string().describe('ID value (canonical or any alternate)'),
  idField: z.string().optional().describe('Optional explicit ID field name (e.g. "code", "externalid"). If omitted, the canonical ID is used.'),
});

const genericRead: Tool = {
  name: 'generic_read',
  description: 'Read a single record from any business object by canonical or alternate ID',
  inputSchema,
  outputSchema: crudOutputSchema,
  handler: async (
    { objectType, id, idField }: { objectType: string; id: string; idField?: string },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    if (!boSchemaRegistry[objectType]) return fail(new Error(`Unknown objectType '${objectType}'`));
    const resolved = idField
      ? { idField, id }
      : normalizeIdForBO(objectType, { id });
    const data = await sppClient.read(objectType as BOName, resolved.id, resolved.idField);
    if (data == null) {
      // Not found OR not visible to current user — return success with null
      // so the caller can distinguish "no record" from "operation failed".
      return ok({
        ok: true,
        objectType,
        operation: 'read',
        data: null,
        count: 0,
        message: `No ${objectType} found with ${resolved.idField}='${resolved.id}'. The record may not exist or may not be visible to the current user.`,
      });
    }
    return ok({ ok: true, objectType, operation: 'read', data, count: 1 });
  },
};
export default genericRead;
