import type { Tool } from './types';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import SPPClient from '../../clients/SPPClient';
import { resolveUserContext, USER_BOUND_OBJECTS } from '../helpers/agentUserContext';

import { z } from 'zod';

const inputSchema = z.object({
  objectType: z.string().describe('Business object type.'),
  payload: z.object({}).describe('Fields for the new record.'),
  preferSelf: z.boolean().optional().describe('If true, use the current logged-in user as the user context.'),
  userName: z.string().optional().describe('Name or identifier of the user to operate on behalf of.')
});

const genericAdd: Tool = {
  name: 'generic_add',
  description: 'Add/create a new record for any business object type',
  inputSchema,
  handler: async (
    { objectType, payload, preferSelf = false, userName }: { objectType: string; payload: Record<string, any>; preferSelf?: boolean; userName?: string },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    if (!boSchemaRegistry[objectType]) throw new Error(`Unknown objectType '${objectType}'`);
    // USER CONTEXT GUARD
    let patchedPayload = { ...payload };
    if (USER_BOUND_OBJECTS.includes(objectType as any)) {
      try {
        const { userId, userField } = await resolveUserContext({ objectType, payloadOrFilter: payload, sppClient, preferSelf, userName });
        patchedPayload[userField] = userId;
      } catch (e) {
        return { content: [{ type: 'text', text: `User context resolution error: ${(e as Error).message}` }] };
      }
    }
    const { normalizeAndValidateBOInput } = await import('../../utils/normalizeAndValidateBOInput');
    const normPayload = normalizeAndValidateBOInput(objectType, patchedPayload, 'payload');
    const result = await sppClient.add(objectType as any, normPayload);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
};
export default genericAdd;
