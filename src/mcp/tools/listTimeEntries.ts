import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';
import { resolveMe } from '../helpers/resolvers';
import { dateContainerToDate, parseISODate, formatISODate, getWeekMonday, getWeekSunday } from '../helpers/dates';
import { aggregateSlipsByProject } from '../helpers/slipAggregation';
import type { Slip } from '../../types/Slip';

const listTimeEntries: Tool = {
  name: 'list_time_entries',
  description:
    'List time entries (slips) for a user, optionally filtered by project and date range. Returns hours grouped by project and task with individual entries and notes. user_id defaults to the authenticated user if omitted.',
  inputSchema: z.object({
    user_id: z.string().optional().describe('SPP user ID. Omit to use your own.'),
    project_id: z.string().optional().describe('Filter to a specific project ID'),
    start_date: z.string().optional().describe('Start date in YYYY-MM-DD format (inclusive)'),
    end_date: z.string().optional().describe('End date in YYYY-MM-DD format (inclusive)'),
    timesheet_id: z.string().optional().describe('Filter to a specific timesheet ID'),
    week_offset: z.number().int().min(0).optional().describe('Convenience: 0=this week, 1=last week, etc. Ignored if start_date/end_date are provided.'),
    limit: z.number().int().min(1).max(5000).optional().default(1000),
  }),
  async handler(args, _ctx) {
    const { user_id, project_id, start_date, end_date, timesheet_id, week_offset, limit } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      // Resolve user
      let targetUserId: string;
      if (user_id) {
        targetUserId = user_id;
      } else {
        const resolved = await resolveMe(client);
        if (!resolved.ok) return jsonResponse({ error: resolved.message });
        targetUserId = resolved.entity.id;
      }

      // Resolve date range
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (start_date || end_date) {
        if (start_date) {
          startDate = parseISODate(start_date);
          if (!startDate) return jsonResponse({ error: `Invalid start_date format: "${start_date}". Use YYYY-MM-DD.` });
        }
        if (end_date) {
          endDate = parseISODate(end_date);
          if (!endDate) return jsonResponse({ error: `Invalid end_date format: "${end_date}". Use YYYY-MM-DD.` });
        }
      } else if (week_offset !== undefined) {
        startDate = getWeekMonday(week_offset);
        endDate = getWeekSunday(startDate);
      }

      // Build filter — SPP uses `userid`, `projectid`, `timesheetid` (no underscores)
      const filter: Record<string, any> = { userid: targetUserId, type: 'T' };
      if (project_id) filter.projectid = project_id;
      if (timesheet_id) filter.timesheetid = timesheet_id;

      const slips = (await client.list('Slip', filter, limit, 0) as Slip[]) || [];

      // Client-side date filter (SPP doesn't support date range on Slip list)
      const filtered = (startDate || endDate)
        ? slips.filter((slip) => {
            const d = dateContainerToDate(slip.date);
            if (!d) return false;
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;
            return true;
          })
        : slips;

      const totalHours = filtered.reduce((sum, s) => {
        const min = typeof s.minute === 'number' ? s.minute : 0;
        return sum + (s.decimal_hours ?? ((s.hour ?? 0) + min / 60));
      }, 0);

      const byProject = await aggregateSlipsByProject(filtered, client);

      return jsonResponse({
        user_id: targetUserId,
        period: {
          start: startDate ? formatISODate(startDate) : null,
          end: endDate ? formatISODate(endDate) : null,
        },
        total_hours: Math.round(totalHours * 100) / 100,
        entry_count: filtered.length,
        by_project: byProject,
      });
    } catch (err) {
      return errorResponse(err, 'fetching time entries', 'Slip');
    }
  },
};

export default listTimeEntries;
