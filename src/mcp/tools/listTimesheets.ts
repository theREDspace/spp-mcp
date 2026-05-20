import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';
import { resolveMe } from '../helpers/resolvers';
import { dateContainerToDate, formatISODate, parseISODate } from '../helpers/dates';

const STATUS_MAP: Record<string, string> = {
  A: 'approved',
  S: 'submitted',
  O: 'open',
  R: 'rejected',
  X: 'rejected',
};

const STATUS_TO_CODE: Record<string, string[]> = {
  open: ['O'],
  submitted: ['S'],
  approved: ['A'],
  rejected: ['R', 'X'],
};

const listTimesheets: Tool = {
  name: 'list_timesheets',
  description:
    'List timesheets for a user, optionally filtered by status and date range. user_id defaults to the authenticated user if omitted. Managers can pass a user_id to view another user\'s timesheets.',
  inputSchema: z.object({
    user_id: z.string().optional().describe('SPP user ID. Omit to list your own timesheets.'),
    status: z.enum(['open', 'submitted', 'approved', 'rejected']).optional(),
    start_date: z.string().optional().describe('Only include timesheets starting on or after this date (YYYY-MM-DD)'),
    end_date: z.string().optional().describe('Only include timesheets ending on or before this date (YYYY-MM-DD)'),
    limit: z.number().int().min(1).max(100).optional().default(10),
    offset: z.number().int().min(0).optional().default(0),
  }),
  async handler(args, _ctx) {
    const { user_id, status, start_date, end_date, limit, offset } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      let targetUserId: string;

      if (user_id) {
        targetUserId = user_id;
      } else {
        const resolved = await resolveMe(client);
        if (!resolved.ok) return jsonResponse({ error: resolved.message });
        targetUserId = resolved.entity.id;
      }

      let sinceDate: Date | null = null;
      let untilDate: Date | null = null;

      if (start_date) {
        sinceDate = parseISODate(start_date);
        if (!sinceDate) return jsonResponse({ error: `Invalid start_date: "${start_date}". Use YYYY-MM-DD.` });
      }
      if (end_date) {
        untilDate = parseISODate(end_date);
        if (!untilDate) return jsonResponse({ error: `Invalid end_date: "${end_date}". Use YYYY-MM-DD.` });
      }

      const statusCodes = status ? STATUS_TO_CODE[status] : null;

      // Fetch enough to allow client-side filtering, then paginate
      const fetchLimit = (sinceDate || untilDate || statusCodes) ? Math.max(limit * 5, 50) : limit;
      const timesheets = (await client.list('Timesheet', { userid: targetUserId }, fetchLimit, 0) as any[]) || [];

      let filtered = timesheets.filter((ts: any) => {
        if (statusCodes && !statusCodes.includes(ts.status)) return false;
        if (sinceDate) {
          const d = dateContainerToDate(ts.starts);
          if (!d || d < sinceDate) return false;
        }
        if (untilDate) {
          const d = dateContainerToDate(ts.ends);
          if (!d || d > untilDate) return false;
        }
        return true;
      });

      filtered.sort((a: any, b: any) => {
        const da = dateContainerToDate(a.starts)?.getTime() ?? 0;
        const db = dateContainerToDate(b.starts)?.getTime() ?? 0;
        return db - da;
      });

      const page = filtered.slice(offset, offset + limit);

      return jsonResponse({
        user_id: targetUserId,
        timesheets: page.map((ts: any) => {
          const startsDate = dateContainerToDate(ts.starts);
          const endsDate = dateContainerToDate(ts.ends);
          const submittedDate = dateContainerToDate(ts.submitted);
          const approvedDate = dateContainerToDate(ts.approved);
          return {
            id: ts.id,
            period_start: startsDate ? formatISODate(startsDate) : null,
            period_end: endsDate ? formatISODate(endsDate) : null,
            status: STATUS_MAP[ts.status] || ts.status || 'open',
            total_hours: ts.total ?? 0,
            submitted: submittedDate ? formatISODate(submittedDate) : null,
            approved: approvedDate ? formatISODate(approvedDate) : null,
          };
        }),
        count: page.length,
        total_matching: filtered.length,
        limit,
        offset,
      });
    } catch (err) {
      return errorResponse(err, 'listing timesheets', 'Timesheet');
    }
  },
};

export default listTimesheets;
