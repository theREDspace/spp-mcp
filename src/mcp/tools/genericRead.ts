import type { Tool } from './types';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import SPPClient from '../../clients/SPPClient';

import { z } from 'zod';

const inputSchema = z.object({
  objectType: z.string().describe('Business object type, e.g. Project, User, Task, etc.'),
  id: z.string().describe('ID value (canonical or any alternate)'),
});

const genericRead: Tool = {
  name: 'generic_read',
  description: 'Read a single record from any business object by canonical or alternate ID',
  inputSchema,
  handler: async (
    { objectType, id }: { objectType: string; id: string },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    if (!boSchemaRegistry[objectType]) throw new Error(`Unknown objectType '${objectType}'`);
    const { normalizeIdForBO } = await import('../../utils/normalizeAndValidateBOInput');
    const { idField, id: normId } = normalizeIdForBO(objectType, { id });
    const result = await sppClient.read(objectType as any, normId);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };

  },
};
export default genericRead;

