import type { Tool } from './types';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import SPPClient from '../../clients/SPPClient';

import { z } from 'zod';

const inputSchema = z.object({
  objectType: z.string().describe('Business object type.'),
  payload: z.object({}).describe('Fields for the new record.')
});

const genericAdd: Tool = {
  name: 'generic_add',
  description: 'Add/create a new record for any business object type',
  inputSchema,
  handler: async (
    { objectType, payload }: { objectType: string; payload: Record<string, any> },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    if (!boSchemaRegistry[objectType]) throw new Error(`Unknown objectType '${objectType}'`);
    const { normalizeAndValidateBOInput } = await import('../../utils/normalizeAndValidateBOInput');
    const normPayload = normalizeAndValidateBOInput(objectType, payload, 'payload');
    const result = await sppClient.add(objectType as any, normPayload);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };

  },
};
export default genericAdd;

