import { z } from 'zod';
import type { Tool } from './types';
import { ok, fail } from '../helpers/toolResult';
import { projectPublicUser, type PublicUserProfile } from '../helpers/userProjection';

const getUserProfile: Tool = {
  name: 'get_user_profile',
  description: 'Get public profile for a specific user by their id. Returns safe fields (id, name, email, department, role, manager). Use this — not generic_list("User") — to look up a specific user by id. Does NOT expose sensitive data like passwords, SSN, or salary.',
  inputSchema: z.object({
    user_id: z.string().describe('The ID of the user to retrieve'),
  }),
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
    message: z.string().optional(),
    // Error-path fields (from fail() helper)
    error: z.string().optional(),
    type: z.string().optional(),
    code: z.string().optional(),
    hint: z.string().optional(),
    suggestion: z.string().optional(),
    example: z.any().optional(),
  }),
  handler: async ({ user_id }, ctx) => {
    if (!user_id || user_id.trim() === '') {
      return fail(new Error('user_id is required and cannot be empty'));
    }

    const rawUser = await ctx.sppClient.read('User', user_id, 'id');
    
    if (!rawUser) {
      return ok({
        ok: true,
        user: null,
        message: `User with ID '${user_id}' not found.`,
      });
    }

    const profile = projectPublicUser(rawUser);

    return ok({
      ok: true,
      user: profile,
    });
  },
};

export default getUserProfile;
