import type { Tool } from './types';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import SPPClient from '../../clients/SPPClient';
import { resolveUserContext, USER_BOUND_OBJECTS } from '../helpers/agentUserContext';

import { z } from 'zod';

const inputSchema = z.object({
  objectType: z.string().describe('Business object type.'),
  filter: z.object({}).describe('Filter object mapping field names to values.').default({}),
  limit: z.number().describe('Max rows').default(100),
  offset: z.number().describe('Offset for paging').default(0),
  preferSelf: z.boolean().optional().describe('If true, use the current logged-in user as the user context.'),
  userName: z.string().optional().describe('Name or identifier of the user to operate on behalf of.')
});

const genericList: Tool = {
  name: 'generic_list',
  description: 'List/search records for any business object using filter fields',
  inputSchema,
  handler: async (
    { objectType, filter = {}, limit = 100, offset = 0, preferSelf = false, userName }: { objectType: string; filter?: Record<string, any>; limit?: number; offset?: number; preferSelf?: boolean; userName?: string },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    console.log("[genericList] objectType:", objectType);
    if (!boSchemaRegistry[objectType]) throw new Error(`Unknown objectType '${objectType}'`);
    // --- USER CONTEXT GUARD: if this BO requires a user, auto-resolve if needed ---
    let patchedFilter = { ...filter };
    if (USER_BOUND_OBJECTS.includes(objectType as any)) {
      try {
        const { userId, userField } = await resolveUserContext({ objectType, payloadOrFilter: filter, sppClient, preferSelf, userName });
        patchedFilter[userField] = userId;
      } catch (e) {
        return { content: [{ type: 'text', text: `User context resolution error: ${(e as Error).message}` }] };
      }
    }
    const { normalizeAndValidateBOInput } = await import('../../utils/normalizeAndValidateBOInput');
    let normFilter;
    try {
      normFilter = normalizeAndValidateBOInput(objectType, patchedFilter, 'filter');
    } catch (validationErr) {
      // Enhance error with semantic pattern help if relevant
      const { semanticPatterns } = await import('../../services/semanticPatternsRegistry');
      // Heuristic: if attempted filter contains a key not in any registered field, suggest
      const allFields = (boSchemaRegistry[objectType]?.fields ?? []).map(f => f.name);
      const badFields = Object.keys(filter).filter(k => !allFields.includes(k));
      let bestMatch = null;
      if (badFields.length) {
        // Search for pattern mentioning bad field or this intent
        bestMatch = semanticPatterns.find(p =>
          badFields.some(bf =>
            (p.correct_usage && p.correct_usage.includes(bf)) || (p.example?.filter && Object.keys(p.example.filter).includes(bf))
          )
          || (p.intent && p.intent.toLowerCase().includes(objectType.toLowerCase()))
        );
      }
      const errorResp = {
        error: `Invalid filter field(s): ${badFields.join(', ')} for object '${objectType}'.`,
        suggestion: bestMatch ? bestMatch.correct_usage : undefined,
        example: bestMatch ? bestMatch.example : undefined
      };
      return { content: [{ type: 'text', text: JSON.stringify(errorResp) }] };
    }
    const result = await sppClient.list(objectType as any, normFilter, limit, offset);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
};
export default genericList;
