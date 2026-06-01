import type { Tool } from './types';
import { z } from 'zod';
import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import { ok } from '../helpers/toolResult';

const inputSchema = z.object({});

const listObjectTypes: Tool = {
  name: 'list_object_types',
  description: 'List all supported business object types. Prefer reading the bo://catalog resource if your client supports MCP resources.',
  inputSchema,
  outputSchema: z.object({ ok: z.boolean(), objectTypes: z.array(z.string()) }),
  handler: async () => {
    const objectTypes = Object.keys(boSchemaRegistry);
    return ok({ ok: true, objectTypes });
  },
};
export default listObjectTypes;
