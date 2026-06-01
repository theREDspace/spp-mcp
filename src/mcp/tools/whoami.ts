import { z } from 'zod';
import type { Tool } from './types';

/**
 * whoami tool: Returns identity of the logged-in user, including id, name, email, manager id, and department id.
 */
const whoami: Tool = {
  name: 'whoami',
  description: 'Returns logged-in user info: id, name, email, manager id, department id.',
  inputSchema: z.object({}), // no input
  handler: async (_args, ctx) => {
    const user = await ctx.sppClient.whoami();
    if (!user) {
      return {
        content: [
          { type: 'text', text: 'No user is currently authenticated (token invalid or expired).' }
        ]
      };
    }
    // Narrowed projection — avoid leaking the full User record (custom fields,
    // SSN-like identifiers, etc.). Callers can fetch more via generic_read.
    const projected = {
      id: user.id ?? null,
      name: user.name || `${(user as any).addr?.first || ''} ${(user as any).addr?.last || ''}`.trim() || null,
      email: (user as any).addr?.email || null,
      manager_id: (user as any).line_managerid || null,
      department_id: (user as any).departmentid || null,
      nickname: (user as any).nickname || null,
      active: (user as any).active ?? null,
    };
    return {
      content: [
        { type: 'text', text: JSON.stringify(projected, null, 2) }
      ]
    };
  },
};

export default whoami;
