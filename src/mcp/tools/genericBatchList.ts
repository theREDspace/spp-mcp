import type { Tool } from './types';
import SPPClient from '../../clients/SPPClient';
import { resolveUserContext, USER_BOUND_OBJECTS } from '../helpers/agentUserContext';
import { normalizeAndValidateBOInput } from '../../utils/normalizeAndValidateBOInput';
import type { BOName } from '../../services/BORecordMap';
import { objectTypeSchema, boFieldsArraySchema, crudOutputSchema } from '../helpers/schemas';
import { ok, fail } from '../helpers/toolResult';
import { z } from 'zod';

const inputSchema = z.object({
  objectType: objectTypeSchema,
  filter: boFieldsArraySchema,
  limit: z.number().describe('Max rows').default(100),
  offset: z.number().describe('Offset').default(0),
  preferSelf: z.boolean().optional().describe('If true, use the current logged-in user as the user context.'),
  userName: z.string().optional().describe('Name or identifier of the user to operate on behalf of.'),
});

const genericBatchList: Tool = {
  name: 'generic_batch_list',
  description: 'Batch list/query objects (multiple filter objects) for any BO. Works for curated, derived, and unknown BOs.',
  inputSchema,
  outputSchema: crudOutputSchema,
  handler: async (
    { objectType, filter = [], limit = 100, offset = 0, preferSelf = false, userName }: { objectType: string; filter: any[]; limit?: number; offset?: number; preferSelf?: boolean; userName?: string },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    let patchedFilters = Array.isArray(filter) ? [...filter] : [];
    if ((USER_BOUND_OBJECTS as readonly string[]).includes(objectType)) {
      try {
        if (patchedFilters.length === 0) patchedFilters = [{}];
        for (let i = 0; i < patchedFilters.length; ++i) {
          const { userId, userField } = await resolveUserContext({ objectType, payloadOrFilter: patchedFilters[i], sppClient, preferSelf, userName });
          patchedFilters[i] = { ...patchedFilters[i], [userField]: userId };
        }
      } catch (e) {
        return fail(e);
      }
    }
    const normFilters = patchedFilters.map(f => normalizeAndValidateBOInput(objectType, f, 'filter'));
    const data = await sppClient.batchList(objectType as BOName, normFilters, limit, offset);
    return ok({ ok: true, objectType, operation: 'batch_list', count: Array.isArray(data) ? data.length : undefined, data });
  },
};
export default genericBatchList;
