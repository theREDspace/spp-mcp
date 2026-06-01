import type { Tool } from './types';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import SPPClient from '../../clients/SPPClient';
import { normalizeIdForBO } from '../../utils/normalizeAndValidateBOInput';
import type { BOName } from '../../services/BORecordMap';

import { z } from 'zod';

const inputSchema = z.object({
  objectType: z.string().describe('Business object type.'),
  id: z.string().describe('ID (canonical or alternate)'),
  idField: z.string().optional().describe('Optional explicit ID field name. If omitted, the canonical ID is used.'),
});

const genericDelete: Tool = {
  name: 'generic_delete',
  description: 'Delete a record by canonical or alternate ID from any business object.',
  inputSchema,
  handler: async (
    { objectType, id, idField }: { objectType: string; id: string; idField?: string },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    const schema = boSchemaRegistry[objectType];
    if (!schema) throw new Error(`Unknown objectType '${objectType}'`);
    const resolved = idField
      ? { idField, id }
      : normalizeIdForBO(objectType, { id });

    // SPP's Delete command requires the canonical id. If an alternate id was
    // supplied, look up the record first to resolve its canonical id.
    let canonicalId = resolved.id;
    if (resolved.idField !== schema.canonicalId) {
      const record = await sppClient.read(objectType as BOName, resolved.id, resolved.idField);
      const c = (record as any)?.[schema.canonicalId];
      if (!c) {
        throw new Error(
          `Could not resolve canonical '${schema.canonicalId}' for ${objectType} ${resolved.idField}=${resolved.id}`
        );
      }
      canonicalId = c;
    }

    const result = await sppClient.delete(objectType as BOName, canonicalId);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
};
export default genericDelete;

