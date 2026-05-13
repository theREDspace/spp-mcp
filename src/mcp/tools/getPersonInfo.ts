import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient, authRequiredResponse } from '../helpers/auth';
import { textResponse, errorResponse } from '../helpers/responses';
import { resolveUserByNameOrId } from '../helpers/resolvers';

const getPersonInfo: Tool = {
  name: 'get_person_info',
  description:
    'Get detailed information about a person from SPP. Accepts a person name or user ID and returns profile fields including contact info, role, department, timezone, and location.',
  inputSchema: z.object({
    person_name: z.string().trim().min(1).optional().describe('Full name, nickname, or email of the person'),
    user_id: z.string().trim().min(1).optional().describe('SPP user ID'),
  }),

  async handler(args, _ctx) {
     const { person_name, user_id } = args as { person_name?: string; user_id?: string };

     if (!_ctx?.email) {
       return textResponse('Missing required email for per-user SPP authentication.');
     }

     if (!person_name && !user_id) {
       return textResponse('Please provide either a person_name or user_id.');
     }

     const client = getAuthenticatedClient(_ctx?.email);
     if (!client) return authRequiredResponse();


    // Resolve user — handles disambiguation and not-found messaging
    // Build args object without undefined keys to satisfy exactOptionalPropertyTypes
    const resolverArgs: { user_id?: string; person_name?: string } = {};
    if (user_id) resolverArgs.user_id = user_id;
    if (person_name) resolverArgs.person_name = person_name;
    let userId: string;
    let user: any;
    try {
      const resolved = await resolveUserByNameOrId(client, resolverArgs);
      if (!resolved.ok) return textResponse(resolved.message);
      userId = resolved.entity.id;
      // Always fetch full user record to guarantee a complete, fresh response
      user = await client.read('User', userId);
    } catch (err) {
      return errorResponse(err, 'fetching person info');
    }

    // Optionally resolve role name
    let roleName: string | null = null;
    const roleId: string | undefined = user?.role_id ?? user?.roleid;
    if (roleId) {
      try {
        const role = await client.read('Role', roleId);
        roleName = role?.name ?? role?.title ?? null;
      } catch {
        // Non-fatal — role name stays null
      }
    }

    // Build human-readable output
    const addr = user?.addr ?? {};
    const firstName: string = addr.first ?? '';
    const lastName: string = addr.last ?? '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || user?.nickname || userId;

    const fields: [string, string | null | undefined][] = [
      ['ID', user?.id],
      ['Name', fullName],
      ['Nickname', user?.nickname],
      ['Email', addr.email ?? user?.email],
      ['Phone', addr.phone],
      ['Mobile', addr.mobile ?? addr.cell],
      ['Role', roleName ?? (roleId ? `(id: ${roleId})` : null)],
      ['Active', user?.active !== undefined ? (user.active ? 'Yes' : 'No') : null],
      ['Department', user?.department ?? user?.dept],
      ['Timezone', user?.timezone ?? user?.tz],
      ['City', addr.city],
      ['State', addr.state],
      ['Country', addr.country],
    ];

    const lines: string[] = [`Person Info — ${fullName}`, ''];

    for (const [label, value] of fields) {
      if (value !== null && value !== undefined && value !== '') {
        lines.push(`  ${label.padEnd(12)}: ${value}`);
      }
    }

    return textResponse(lines.join('\n'));
  },
};

export default getPersonInfo;
