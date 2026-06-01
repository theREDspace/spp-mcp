import { z } from 'zod';
import type { Tool } from './types';
import { ok, fail } from '../helpers/toolResult';

const whoami: Tool = {
  name: 'whoami',
  description: 'Returns logged-in user info: id, name, email, manager id, department id.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    ok: z.boolean(),
    user: z.object({
      id: z.string().nullable(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      manager_id: z.string().nullable(),
      department_id: z.string().nullable(),
      nickname: z.string().nullable(),
      active: z.any().nullable(),
    }).nullable(),
  }),
  handler: async (_args, ctx) => {
    const user = await ctx.sppClient.whoami();
    if (!user) {
      return fail(new Error('No user is currently authenticated (token invalid or expired).'));
    }
    const projected = {
      id: user.id ?? null,
      name: user.name || `${(user as any).addr?.first || ''} ${(user as any).addr?.last || ''}`.trim() || null,
      email: (user as any).addr?.email || null,
      manager_id: (user as any).line_managerid || null,
      department_id: (user as any).departmentid || null,
      nickname: (user as any).nickname || null,
      active: (user as any).active ?? null,
    };
    return ok({ ok: true, user: projected });
  },
};

export default whoami;
