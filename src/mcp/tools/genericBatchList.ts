import type { Tool } from './types';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import SPPClient from '../../clients/SPPClient';

import { z } from 'zod';

const inputSchema = z.object({
  objectType: z.string().describe('Business object type.'),
  filter: z.array(z.object({})).describe('Array of filter objects'),
  limit: z.number().describe('Max rows').default(100),
  offset: z.number().describe('Offset').default(0)
});

const genericBatchList: Tool = {
  name: 'generic_batchList',
  description: 'Batch list/query objects (multiple filter objects) for any BO',
  inputSchema,
  handler: async (
    { objectType, filter = [], limit = 100, offset = 0 }: { objectType: string; filter: any[]; limit?: number; offset?: number },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    if (!boSchemaRegistry[objectType]) throw new Error(`Unknown objectType '${objectType}'`);
    const { normalizeAndValidateBOInput } = await import('../../utils/normalizeAndValidateBOInput');
    const normFilters = Array.isArray(filter)
      ? filter.map(f => normalizeAndValidateBOInput(objectType, f, 'filter'))
      : [];
    const result = await sppClient.batchList(objectType as any, normFilters, limit, offset);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };

  },
};
export default genericBatchList;

