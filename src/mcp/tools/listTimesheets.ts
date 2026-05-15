import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { textResponse, errorResponse } from '../helpers/responses';
import { resolveMe } from '../helpers/resolvers';
import { dateContainerToDate, formatMMDDYYYY, parseMMDDYYYY } from '../helpers/dates';

const STATUS_MAP: Record<string, string> = {
  A: 'Approved',
  S: 'Submitted — pending approval',
  O: 'Open — not submitted',
  R: 'Rejected',
  X: 'Rejected',
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
    'List your timesheets, optionally filtered by status and date range. Shows period, status, hours, and submission dates.',
  inputSchema: z.object({
    status: z.enum(['open', 'submitted', 'approved', 'rejected']).optional(),
    since: z.string().optional().describe('Start date in MM/DD/YYYY format'),
    until: z.string().optional().describe('End date in MM/DD/YYYY format'),
    limit: z.number().int().min(1).max(50).optional().default(10),
  }),

  async handler(args, _ctx) {
    const { status, since, until, limit } = args;

    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return textResponse('No authentication token found in request context.');

    try {
      const resolved = await resolveMe(client);
      if (!resolved.ok) return textResponse(resolved.message);

      const timesheets = (await client.list('Timesheet', { userid: resolved.entity.id }, limit * 3, 0) as any[]) || [];

      if (!timesheets.length) {
        return textResponse('You have no timesheets.');
      }

      let sinceDate: Date | null = null;
      let untilDate: Date | null = null;

      if (since) {
        sinceDate = parseMMDDYYYY(since);
        if (!sinceDate) return textResponse(`Invalid "since" date format: ${since}. Use MM/DD/YYYY.`);
      }

      if (until) {
        untilDate = parseMMDDYYYY(until);
        if (!untilDate) return textResponse(`Invalid "until" date format: ${until}. Use MM/DD/YYYY.`);
      }

      const statusCodes = status ? STATUS_TO_CODE[status] : null;

      let filtered = timesheets.filter((ts: any) => {
        if (statusCodes && !statusCodes.includes(ts.status)) return false;
        if (sinceDate) {
          const tsStartsDate = dateContainerToDate(ts.starts);
          if (!tsStartsDate || tsStartsDate < sinceDate) return false;
        }
        if (untilDate) {
          const tsEndsDate = dateContainerToDate(ts.ends);
          if (!tsEndsDate || tsEndsDate > untilDate) return false;
        }
        return true;
      });

      filtered.sort((a: any, b: any) => {
        const dateA = dateContainerToDate(a.starts)?.getTime() ?? 0;
        const dateB = dateContainerToDate(b.starts)?.getTime() ?? 0;
        return dateB - dateA;
      });

      const displayed = filtered.slice(0, limit);

      if (!displayed.length) {
        const filterDesc = status ? ` with status "${status}"` : '';
        const dateDesc = since || until ? ` from ${since || '?'} to ${until || '?'}` : '';
        return textResponse(`No timesheets found${filterDesc}${dateDesc}.`);
      }

      const lines: string[] = [
        `Your timesheets (showing ${displayed.length} of ${filtered.length}):`,
        '',
      ];

      displayed.forEach((ts: any, idx: number) => {
        const startsDate = dateContainerToDate(ts.starts);
        const endsDate = dateContainerToDate(ts.ends);
        const periodStr =
          startsDate && endsDate
            ? `${formatMMDDYYYY(startsDate)}–${formatMMDDYYYY(endsDate)}`
            : '(unknown period)';
        const statusCode = ts.status || 'O';
        const statusText = STATUS_MAP[statusCode] || `Unknown (${statusCode})`;
        const totalHours = ts.total ?? 0;
        lines.push(`${idx + 1}. ${periodStr}   ${statusText}   ${totalHours.toFixed(1)}h   (id: ${ts.id})`);
      });

      lines.push('');
      lines.push('Use get_timesheet_details {id} to drill into a specific timesheet.');

      return textResponse(lines.join('\n'));
    } catch (err) {
      return errorResponse(err, 'listing your timesheets');
    }
  },
};

export default listTimesheets;
