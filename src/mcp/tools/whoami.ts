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
    // console.log('whoami user info:', user);
    // const resp = {
    //   id: user.id || null,
    //   name: user.name || `${user.addr?.first || ''} ${user.addr?.last || ''}`.trim(),
    //   email: user.addr?.email || null,
    //   manager_id: user.line_managerid || null,
    //   department_id: user.departmentid || null,
    //   nickname: user.nickname || null,
    //   active: user.active,
    // };
    return {
      content: [
        { type: 'text', text: JSON.stringify(user, null, 2) }
      ]
    };
  },
};

export default whoami;
