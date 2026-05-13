import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient, authRequiredResponse } from '../helpers/auth';
import { textResponse, errorResponse } from '../helpers/responses';

const getMe: Tool = {
  name: 'get_me',
  description:
    'Get your own user profile information from SPP. Uses the email from your request headers to fetch your authenticated user account details including contact info, role, department, timezone, and location.',
  inputSchema: z.object({}),

  async handler(_args, _ctx) {
    if (!_ctx?.email) {
      return textResponse('Missing required email for per-user SPP authentication.');
    }

    const client = getAuthenticatedClient(_ctx?.email);
    if (!client) return authRequiredResponse(_ctx!.email);

    try {
      // Look up user by email
      const userResults = (await client.list('User', { email: _ctx.email }, 1000, 0) as any[]) || [];

      if (!userResults.length) {
        return textResponse(
          `No user found with email "${_ctx.email}". Please check that you are authenticated with the correct account.`
        );
      }

      if (userResults.length > 1) {
        return textResponse(
          `Multiple users found with email "${_ctx.email}". This is unusual — contact your SPP administrator.`
        );
      }

      const user = userResults[0];
      const userId: string = user?.id;

      // Always fetch full user record to guarantee a complete, fresh response
      const fullUser = await client.read('User', userId);

      // Optionally resolve role name
      let roleName: string | null = null;
      const roleId: string | undefined = fullUser?.role_id ?? fullUser?.roleid;
      if (roleId) {
        try {
          const role = await client.read('Role', roleId);
          roleName = role?.name ?? role?.title ?? null;
        } catch {
          // Non-fatal — role name stays null
        }
      }

      // Build human-readable output
      const addr = fullUser?.addr ?? {};
      const firstName: string = addr.first ?? '';
      const lastName: string = addr.last ?? '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || fullUser?.nickname || userId;

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
      return errorResponse(err, 'fetching your profile', '', _ctx!.email);
    }
  },
};

export default getMe;
