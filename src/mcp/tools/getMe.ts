import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { textResponse, errorResponse } from '../helpers/responses';

const getMe: Tool = {
  name: 'get_me',
  description:
    'Get your own user profile information from SPP. Fetches the authenticated user account details including contact info, role, department, timezone, and location.',
  inputSchema: z.object({}),

  async handler(_args, _ctx) {
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return textResponse('No authentication token found in request context.');

    try {
      // Use whoami to identify the current user, then fetch their full record
      const me = await client.whoami() as any;
      if (!me || !me.id) {
        return textResponse('Could not determine the current user. The whoami call returned an empty result.');
      }

      const fullUser = await client.read('User', me.id) as any;

      // Optionally resolve role name
      let roleName: string | null = null;
      const roleId: string | undefined = fullUser?.role_id ?? fullUser?.roleid;
      if (roleId) {
        try {
          const role = await client.read('Role', roleId) as any;
          roleName = role?.name ?? role?.title ?? null;
        } catch {
          // Non-fatal — role name stays null
        }
      }

      const addr = fullUser?.addr ?? {};
      const firstName: string = addr.first ?? '';
      const lastName: string = addr.last ?? '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || fullUser?.nickname || me.id;

      const fields: [string, string | null | undefined][] = [
        ['ID', fullUser?.id],
        ['Name', fullName],
        ['Nickname', fullUser?.nickname],
        ['Email', addr.email ?? fullUser?.email],
        ['Phone', addr.phone],
        ['Mobile', addr.mobile ?? addr.cell],
        ['Role', roleName ?? (roleId ? `(id: ${roleId})` : null)],
        ['Active', fullUser?.active !== undefined ? (fullUser.active ? 'Yes' : 'No') : null],
        ['Department', fullUser?.department ?? fullUser?.dept],
        ['Timezone', fullUser?.timezone ?? fullUser?.tz],
        ['City', addr.city],
        ['State', addr.state],
        ['Country', addr.country],
      ];

      const lines: string[] = [`Your Profile — ${fullName}`, ''];

      for (const [label, value] of fields) {
        if (value !== null && value !== undefined && value !== '') {
          lines.push(`  ${label.padEnd(12)}: ${value}`);
        }
      }

      return textResponse(lines.join('\n'));
    } catch (err) {
      return errorResponse(err, 'fetching your profile');
    }
  },
};

export default getMe;
