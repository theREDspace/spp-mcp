import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient, authRequiredResponse } from '../helpers/auth';
import { textResponse, errorResponse } from '../helpers/responses';

const listBookings: Tool = {
  name: 'list_bookings',
  description: 'List all bookings in Redspace SPP. If the user is not authenticated, returns an authentication link. Optionally accepts filter, limit, and offset.',
  inputSchema: z.object({
    filter: z.record(z.string(), z.any()).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  }),
  async handler(args, _ctx) {
    const { filter = {}, limit = 100, offset = 0 } = args;
    if (!_ctx?.email) {
      return textResponse('Missing required email for per-user SPP authentication.');
    }
    const client = getAuthenticatedClient(_ctx?.email);
    if (!client) return authRequiredResponse(_ctx!.email);
    try {
      const bookings = (await client.list('Booking', filter, limit, offset) as any[]) || [];
      const lines = [
        `Found ${bookings.length} booking(s):`,
        '',
        ...bookings.map((b: any) =>
          `- [${b.id}] Project: ${b.projectName || b.project_id || '—'} | Date: ${b.date || '—'} | Amount: ${b.amount || '—'}`
        )
      ];
      return textResponse(lines.join('\n'));
    } catch (err) {
      return errorResponse(err, 'listing bookings', '', _ctx!.email);
    }
  }
};
export default listBookings;
