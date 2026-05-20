import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';
import { resolveMe } from '../helpers/resolvers';
import { dateContainerToDate, formatISODate } from '../helpers/dates';
import { aggregateSlipsByProject } from '../helpers/slipAggregation';
import type { Slip } from '../../types/Slip';

const STATUS_MAP: Record<string, string> = {
  A: 'approved',
  S: 'submitted',
  O: 'open',
  R: 'rejected',
  X: 'rejected',
};

const getTimesheet: Tool = {
  name: 'get_timesheet',
  description:
    'Get full details of a timesheet including per-project and per-task hour breakdowns with individual time entries. If timesheet_id is omitted, returns the most recent timesheet for the authenticated user.',
  inputSchema: z.object({
    timesheet_id: z.string().optional().describe('SPP timesheet ID. Omit to get your most recent timesheet.'),
  }),
  async handler(args, _ctx) {
    const { timesheet_id } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      let ts: any;

      if (timesheet_id) {
        ts = await client.read('Timesheet', timesheet_id) as any;
        if (!ts) return jsonResponse({ error: `Timesheet with id "${timesheet_id}" not found.` });
      } else {
        // Get current user's most recent timesheet
        const resolved = await resolveMe(client);
        if (!resolved.ok) return jsonResponse({ error: resolved.message });

        const timesheets = (await client.list('Timesheet', { userid: resolved.entity.id }, 50, 0) as any[]) || [];
        if (!timesheets.length) return jsonResponse({ error: 'No timesheets found for current user.' });

        timesheets.sort((a: any, b: any) => {
          const da = dateContainerToDate(a.starts)?.getTime() ?? 0;
          const db = dateContainerToDate(b.starts)?.getTime() ?? 0;
          return db - da;
        });
        ts = timesheets[0];
      }

      const startsDate = dateContainerToDate(ts.starts);
      const endsDate = dateContainerToDate(ts.ends);
      const submittedDate = dateContainerToDate(ts.submitted);
      const approvedDate = dateContainerToDate(ts.approved);

      // Resolve approver name
      let approver: { id: string; name: string } | null = null;
      if (ts.approved_by) {
        try {
          const u = await client.read('User', ts.approved_by) as any;
          const addr = u?.addr ?? {};
          approver = {
            id: ts.approved_by,
            name: [addr.first, addr.last].filter(Boolean).join(' ') || u?.nickname || ts.approved_by,
          };
        } catch { /* non-fatal */ }
      }

      // Fetch slips for this timesheet
      const slips = (await client.list('Slip', { timesheetid: ts.id, type: 'T' }, 1000, 0) as Slip[]) || [];
      const byProject = await aggregateSlipsByProject(slips, client);

      return jsonResponse({
        id: ts.id,
        period_start: startsDate ? formatISODate(startsDate) : null,
        period_end: endsDate ? formatISODate(endsDate) : null,
        status: STATUS_MAP[ts.status] || ts.status || 'open',
        total_hours: ts.total ?? 0,
        submitted: submittedDate ? formatISODate(submittedDate) : null,
        approved: approvedDate ? formatISODate(approvedDate) : null,
        approver,
        user_id: ts.userid || null,
        by_project: byProject,
      });
    } catch (err) {
      return errorResponse(err, 'fetching timesheet', 'Timesheet');
    }
  },
};

export default getTimesheet;
