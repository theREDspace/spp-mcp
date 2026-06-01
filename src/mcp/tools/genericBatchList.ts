import type { Tool } from './types';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import SPPClient from '../../clients/SPPClient';
import { resolveUserContext, USER_BOUND_OBJECTS } from '../helpers/agentUserContext';

import { z } from 'zod';

const inputSchema = z.object({
  objectType: z.string().describe('Business object type.'),
  filter: z.array(z.object({})).describe('Array of filter objects'),
  limit: z.number().describe('Max rows').default(100),
  offset: z.number().describe('Offset').default(0),
  preferSelf: z.boolean().optional().describe('If true, use the current logged-in user as the user context.'),
  userName: z.string().optional().describe('Name or identifier of the user to operate on behalf of.')
});

const genericBatchList: Tool = {
  name: 'generic_batchList',
  description: 'Batch list/query objects (multiple filter objects) for any BO',
  inputSchema,
  handler: async (
    { objectType, filter = [], limit = 100, offset = 0, preferSelf = false, userName }: { objectType: string; filter: any[]; limit?: number; offset?: number; preferSelf?: boolean; userName?: string },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    if (!boSchemaRegistry[objectType]) throw new Error(`Unknown objectType '${objectType}'`);
    // USER CONTEXT GUARD
    let patchedFilters = Array.isArray(filter) ? [...filter] : [];
    if (USER_BOUND_OBJECTS.includes(objectType as any)) {
      try {
        // If no filters were provided, seed with an empty object so the user context
        // is still applied (e.g. preferSelf=true with no other filter criteria).
        if (patchedFilters.length === 0) patchedFilters = [{}];
        for (let i = 0; i < patchedFilters.length; ++i) {
          const { userId, userField } = await resolveUserContext({ objectType, payloadOrFilter: patchedFilters[i], sppClient, preferSelf, userName });
          patchedFilters[i] = { ...patchedFilters[i], [userField]: userId };
        }
      } catch (e) {
        return { content: [{ type: 'text', text: `User context resolution error: ${(e as Error).message}` }] };
      }
    }
    const { normalizeAndValidateBOInput } = await import('../../utils/normalizeAndValidateBOInput');
    const normFilters = patchedFilters.map(f => normalizeAndValidateBOInput(objectType, f, 'filter'));
    const result = await sppClient.batchList(objectType as any, normFilters, limit, offset);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
};
export default genericBatchList;
