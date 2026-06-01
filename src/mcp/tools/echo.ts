import { z } from 'zod';
import type { Tool } from './types';
import { ok } from '../helpers/toolResult';

const echo: Tool = {
  name: 'echo',
  description: 'Echoes input for debug. Always returns params. (Dev only — not registered when NODE_ENV=production.)',
  inputSchema: z.any(),
  handler: async (params) => ok(params ?? { value: null }),
};

export default echo;
