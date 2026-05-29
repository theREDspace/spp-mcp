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
    console.log("[genericList] objectType:", objectType);
     if (!boSchemaRegistry[objectType]) throw new Error(`Unknown objectType '${objectType}'`);
     const { normalizeAndValidateBOInput } = await import('../../utils/normalizeAndValidateBOInput');
     let normFilter;
     try {
       normFilter = normalizeAndValidateBOInput(objectType, filter, 'filter');
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

