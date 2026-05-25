import { z } from 'zod';
import type { Tool } from './types';

const echo: Tool = {
  name: 'echo',
  description: 'Echoes input for debug. Always returns params.',
  inputSchema: z.any(),
  handler: async (params, _ctx) => {
    console.log('[DEBUG] Echo called with', params);
    return {
      content: [
        { type: 'text', text: JSON.stringify(params) }
      ],
      structuredContent: params || null
    };
  }
};

export default echo;
