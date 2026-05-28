import type { Tool } from './types';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import SPPClient from '../../clients/SPPClient';

import { z } from 'zod';

const inputSchema = z.object({
  objectType: z.string().describe('Business object type.'),
  filter: z.object({}).describe('Filter object mapping field names to values.').default({}),
  limit: z.number().describe('Max rows').default(100),
  offset: z.number().describe('Offset for paging').default(0)
});

const genericList: Tool = {
  name: 'generic_list',
  description: 'List/search records for any business object using filter fields',
  inputSchema,
  handler: async (
    { objectType, filter = {}, limit = 100, offset = 0 }: { objectType: string; filter?: Record<string, any>; limit?: number; offset?: number },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    if (!boSchemaRegistry[objectType]) throw new Error(`Unknown objectType '${objectType}'`);
    const { normalizeAndValidateBOInput } = await import('../../utils/normalizeAndValidateBOInput');
    const normFilter = normalizeAndValidateBOInput(objectType, filter, 'filter');
    const result = await sppClient.list(objectType as any, normFilter, limit, offset);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };

  },
};
export default genericList;

