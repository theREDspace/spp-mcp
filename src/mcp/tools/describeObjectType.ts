import type { Tool } from './types';
import { z } from 'zod';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';

const inputSchema = z.object({
  objectType: z.string().describe('Business object type name.'),
});

const describeObjectType: Tool = {
  name: 'describe_object_type',
  description: 'Describe the schema, canonical/alternate keys, required fields, and examples for any business object type.',
  inputSchema,
  handler: async (
    { objectType }: { objectType: string },
    _ctx: unknown
  ) => {
    const desc = boSchemaRegistry[objectType] || null;
    return { content: [{ type: 'text', text: JSON.stringify(desc) }] };
  },
};
export default describeObjectType;
