import type { Tool } from './types';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import SPPClient from '../../clients/SPPClient';
import { normalizeIdForBO } from '../../utils/normalizeAndValidateBOInput';
import type { BOName } from '../../services/BORecordMap';

import { z } from 'zod';

const inputSchema = z.object({
  objectType: z.string().describe('Business object type, e.g. Project, User, Task, etc.'),
  id: z.string().describe('ID value (canonical or any alternate)'),
  idField: z.string().optional().describe('Optional explicit ID field name (e.g. "code", "externalid"). If omitted, the canonical ID is used.'),
});

const genericRead: Tool = {
  name: 'generic_read',
  description: 'Read a single record from any business object by canonical or alternate ID',
  inputSchema,
  handler: async (
    { objectType, id, idField }: { objectType: string; id: string; idField?: string },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    if (!boSchemaRegistry[objectType]) throw new Error(`Unknown objectType '${objectType}'`);
    // If caller supplied an explicit idField, use it. Otherwise treat the value
    // as belonging to the canonical id and let normalizeIdForBO resolve aliases.
    const resolved = idField
      ? { idField, id }
      : normalizeIdForBO(objectType, { id });
    const result = await sppClient.read(objectType as BOName, resolved.id, resolved.idField);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
};
export default genericRead;

