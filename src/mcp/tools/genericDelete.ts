import type { Tool } from './types';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import SPPClient from '../../clients/SPPClient';

import { z } from 'zod';

const inputSchema = z.object({
  objectType: z.string().describe('Business object type.'),
  id: z.string().describe('ID (canonical or alternate)'),
});

const genericDelete: Tool = {
  name: 'generic_delete',
  description: 'Delete a record by canonical or alternate ID from any business object.',
  inputSchema,
  handler: async (
    { objectType, id }: { objectType: string; id: string },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    if (!boSchemaRegistry[objectType]) throw new Error(`Unknown objectType '${objectType}'`);
    const { normalizeIdForBO } = await import('../../utils/normalizeAndValidateBOInput');
    const { idField, id: normId } = normalizeIdForBO(objectType, { id });
    const result = await sppClient.delete(objectType as any, normId);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };

  },
};
export default genericDelete;

