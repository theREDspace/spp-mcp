import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';
import { resolveMe } from '../helpers/resolvers';

const getUser: Tool = {
  name: 'get_user',
  description:
    'Get full profile for an SPP user by ID. If user_id is omitted, returns the authenticated user\'s own profile. Use search_users to find a user_id by name.',
  inputSchema: z.object({
    user_id: z.string().optional().describe('SPP user ID. Omit to get your own profile.'),
  }),
  async handler(args, _ctx) {
    const { user_id } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      let targetId: string;

      if (user_id) {
        targetId = user_id;
      } else {
        const resolved = await resolveMe(client);
        if (!resolved.ok) return jsonResponse({ error: resolved.message });
        targetId = resolved.entity.id;
      }

      const user = await client.read('User', targetId) as any;
      if (!user) return jsonResponse({ error: `User with id "${targetId}" not found.` });

      // Optionally resolve role name
      let roleName: string | null = null;
      const roleId: string | undefined = user?.role_id ?? user?.roleid;
      if (roleId) {
        try {
          const role = await client.read('Role', roleId) as any;
          roleName = role?.name ?? role?.title ?? null;
        } catch { /* non-fatal */ }
      }

      const addr = user?.addr ?? {};

      return jsonResponse({
        id: user.id,
        name: [addr.first, addr.last].filter(Boolean).join(' ') || user.nickname || user.id,
        nickname: user.nickname || null,
        email: addr.email || user.email || null,
        phone: addr.phone || null,
        mobile: addr.mobile || addr.cell || null,
        role_id: roleId || null,
        role: roleName,
        active: user.active,
        department: user.department || user.dept || null,
        timezone: user.timezone || user.tz || null,
        city: addr.city || null,
        state: addr.state || null,
        country: addr.country || null,
      });
    } catch (err) {
      return errorResponse(err, 'fetching user');
    }
  },
};

export default getUser;
