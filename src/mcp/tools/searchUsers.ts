import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';

const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const searchUsers: Tool = {
  name: 'search_users',
  description:
    'Search for SPP users by name, nickname, or email. Returns all matching users with their IDs. Use this to find a user_id before calling other tools.',
  inputSchema: z.object({
    query: z.string().min(1).describe('Full name, nickname, or email address to search for'),
  }),
  async handler(args, _ctx) {
    const { query } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      const seen = new Set<string>();
      const results: any[] = [];
      let strategy = 'none';

      const addUser = (u: any) => {
        if (u?.id && !seen.has(String(u.id))) {
          seen.add(String(u.id));
          const addr = u.addr ?? {};
          results.push({
            id: u.id,
            name: [addr.first, addr.last].filter(Boolean).join(' ') || u.nickname || null,
            email: addr.email || null,
            nickname: u.nickname || null,
            active: u.active,
          });
        }
      };

      const q = query.toLowerCase().trim();

      if (looksLikeEmail(query)) {
        // Email query: use SPP API exact filter
        try {
          const byEmail = (await client.list('User', { email: query }, 100, 0)) || [];
          byEmail.forEach(addUser);
          if (results.length > 0) strategy = 'email';
        } catch (e) {}

        // Also try nickname (some SPP setups use email as nickname)
        if (!seen.size) {
          try {
            const byNickname = (await client.list('User', { nickname: query }, 100, 0)) || [];
            // SPP does broad nickname match — only keep exact (case-insensitive)
            byNickname
              .filter((u: any) => (u.nickname || '').toLowerCase() === q)
              .forEach(addUser);
            if (results.length > 0) strategy = 'nickname_exact';
          } catch (e) {}
        }
      } else {
        // Name query: always use in-memory; SPP nickname filter is too broad to be useful
        const words = q.split(/\s+/).filter(Boolean);
        try {
          const allUsers = (await client.list('User', {}, 1000, 0)) || [];
          for (const u of allUsers) {
            const addr = u.addr ?? {};
            const fullName = `${addr.first || ''} ${addr.last || ''}`.toLowerCase().trim();
            // All words must appear in the full name
            if (words.length > 0 && words.every((w: string) => fullName.includes(w))) {
              addUser(u);
            }
          }
          if (results.length > 0) strategy = 'name_inmemory';
        } catch (e) {}
      }

      return jsonResponse({
        results,
        count: results.length,
        search_method: strategy,
      });
    } catch (err) {
      return errorResponse(err, 'searching users', 'User');
    }
  },
};

export default searchUsers;
