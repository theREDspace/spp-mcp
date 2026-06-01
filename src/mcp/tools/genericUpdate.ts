import type { Tool } from './types';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import SPPClient from '../../clients/SPPClient';
import { normalizeAndValidateBOInput } from '../../utils/normalizeAndValidateBOInput';
import type { BOName } from '../../services/BORecordMap';

import { z } from 'zod';

const inputSchema = z.object({
  objectType: z.string().describe('Business object type.'),
  id: z.string().describe('Canonical or alternate ID value.'),
  changes: z.object({}).describe('Map of fields to update.')
});

const genericUpdate: Tool = {
  name: 'generic_update',
  description: 'Update one or more fields for a single record in any business object.',
  inputSchema,
  handler: async (
    { objectType, id, changes }: { objectType: string; id: string; changes: Record<string, any> },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    if (!boSchemaRegistry[objectType]) throw new Error(`Unknown objectType '${objectType}'`);
    const normChanges = normalizeAndValidateBOInput(objectType, changes, 'changes');
    const result = await sppClient.update(objectType as BOName, id, normChanges);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
};
export default genericUpdate;
