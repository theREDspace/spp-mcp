import type { Tool } from './types';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import SPPClient from '../../clients/SPPClient';
import { resolveUserContext, USER_BOUND_OBJECTS } from '../helpers/agentUserContext';
import { normalizeAndValidateBOInput } from '../../utils/normalizeAndValidateBOInput';
import { semanticPatterns } from '../../services/semanticPatternsRegistry';
import type { BOName } from '../../services/BORecordMap';
import { objectTypeSchema, boFieldsSchema, crudOutputSchema } from '../helpers/schemas';
import { ok, fail } from '../helpers/toolResult';
import { z } from 'zod';

const inputSchema = z.object({
  objectType: objectTypeSchema,
  filter: boFieldsSchema.default({}),
  limit: z.number().describe('Max rows').default(100),
  offset: z.number().describe('Offset for paging').default(0),
  preferSelf: z.boolean().optional().describe('If true, use the current logged-in user as the user context.'),
  userName: z.string().optional().describe('Name or identifier of the user to operate on behalf of.'),
});

const genericList: Tool = {
  name: 'generic_list',
  description: 'List/search records for any business object using filter fields',
  inputSchema,
  outputSchema: crudOutputSchema,
  handler: async (
    { objectType, filter = {}, limit = 100, offset = 0, preferSelf = false, userName }: { objectType: string; filter?: Record<string, any>; limit?: number; offset?: number; preferSelf?: boolean; userName?: string },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    if (!boSchemaRegistry[objectType]) return fail(new Error(`Unknown objectType '${objectType}'`));
    let patchedFilter = { ...filter };
    if ((USER_BOUND_OBJECTS as readonly string[]).includes(objectType)) {
      try {
        const { userId, userField } = await resolveUserContext({ objectType, payloadOrFilter: filter, sppClient, preferSelf, userName });
        patchedFilter[userField] = userId;
      } catch (e) {
        return fail(e);
      }
    }

    let normFilter;
    try {
      normFilter = normalizeAndValidateBOInput(objectType, patchedFilter, 'filter');
    } catch (validationErr) {
      const allFields = (boSchemaRegistry[objectType]?.fields ?? []).map(f => f.name);
      const badFields = Object.keys(filter).filter(k => !allFields.includes(k));
      const bestMatch = badFields.length
        ? semanticPatterns.find(p =>
            badFields.some(bf =>
              (p.correct_usage && p.correct_usage.includes(bf)) ||
              (p.example?.filter && Object.keys(p.example.filter).includes(bf))
            ) ||
            (p.intent && p.intent.toLowerCase().includes(objectType.toLowerCase()))
          )
        : null;
      return fail(
        new Error(`Invalid filter field(s): ${badFields.join(', ')} for object '${objectType}'.`),
        bestMatch ? { suggestion: bestMatch.correct_usage, example: bestMatch.example } : undefined
      );
    }

    const data = await sppClient.list(objectType as BOName, normFilter, limit, offset);
    return ok({ ok: true, objectType, operation: 'list', count: Array.isArray(data) ? data.length : undefined, data });
  },
};
export default genericList;
