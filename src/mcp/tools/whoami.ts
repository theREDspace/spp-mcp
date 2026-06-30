import { z } from 'zod';
import type { Tool } from './types';
import { ok, fail } from '../helpers/toolResult';
import { projectPublicUser } from '../helpers/userProjection';

const whoami: Tool = {
  name: 'whoami',
  description: 'Returns the currently authenticated user\'s id, name, email, nickname, department id, role id, manager id, and active status. Use this — not generic_list("User") — to discover who is logged in.',
  inputSchema: z.object({}),
  // Permissive object schema so both success and error shapes pass client-side AJV validation.
  // MCP requires outputSchema to be an object (not a union), so all fields are optional.
  outputSchema: z.object({
    // Success-path fields
    ok: z.boolean().optional(),
    user: z.object({
      id: z.string().nullable(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      nickname: z.string().nullable(),
      active: z.number().nullable(),
      department_id: z.string().nullable(),
      role_id: z.string().nullable(),
      code: z.string().nullable(),
      manager_id: z.string().nullable(),
    }).nullable().optional(),
    // Error-path fields (from fail() helper)
    error: z.string().optional(),
    type: z.string().optional(),
    code: z.string().optional(),
    hint: z.string().optional(),
    suggestion: z.string().optional(),
    example: z.any().optional(),
  }),
  handler: async (_args, ctx) => {
    const user = await ctx.sppClient.whoami();
    if (!user) {
      return fail(new Error('No user is currently authenticated (token invalid or expired).'));
    }
    const projected = projectPublicUser(user);
    return ok({ ok: true, user: projected });
  },
};

export default whoami;
