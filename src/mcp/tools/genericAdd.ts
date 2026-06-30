import type { Tool } from './types';
import SPPClient from '../../clients/SPPClient';
import { resolveUserContext, USER_BOUND_OBJECTS } from '../helpers/agentUserContext';
import { normalizeAndValidateBOInput } from '../../utils/normalizeAndValidateBOInput';
import type { BOName } from '../../services/BORecordMap';
import { objectTypeSchema, boFieldsSchema, crudOutputSchema } from '../helpers/schemas';
import { ok, fail } from '../helpers/toolResult';
import { z } from 'zod';

const inputSchema = z.object({
  objectType: objectTypeSchema,
  payload: boFieldsSchema.describe('Fields for the new record.'),
  preferSelf: z.boolean().optional().describe('If true, use the current logged-in user as the user context.'),
  userName: z.string().optional().describe('Name or identifier of the user to operate on behalf of.'),
});

const genericAdd: Tool = {
  name: 'generic_add',
  description: 'Add/create a new record for any business object type. Works for curated, derived, and unknown BOs.',
  inputSchema,
  outputSchema: crudOutputSchema,
  handler: async (
    { objectType, payload, preferSelf = false, userName }: { objectType: string; payload: Record<string, any>; preferSelf?: boolean; userName?: string },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    let patchedPayload = { ...payload };
    if ((USER_BOUND_OBJECTS as readonly string[]).includes(objectType)) {
      try {
        const { userId, userField } = await resolveUserContext({ objectType, payloadOrFilter: payload, sppClient, preferSelf, userName });
        patchedPayload[userField] = userId;
      } catch (e) {
        return fail(e);
      }
    }
    const normPayload = normalizeAndValidateBOInput(objectType, patchedPayload, 'payload');
    const data = await sppClient.add(objectType as BOName, normPayload);
    return ok({ ok: true, objectType, operation: 'add', data });
  },
};
export default genericAdd;
