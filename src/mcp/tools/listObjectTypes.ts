import type { Tool } from './types';
import { z } from 'zod';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';

const inputSchema = z.object({});

const listObjectTypes: Tool = {
  name: 'list_object_types',
  description: 'List all supported business object types.',
  inputSchema,
  handler: async (_args: unknown, _ctx: unknown) => {
    return { content: [{ type: 'text', text: JSON.stringify(Object.keys(boSchemaRegistry)) }] };
  },
};
export default listObjectTypes;
