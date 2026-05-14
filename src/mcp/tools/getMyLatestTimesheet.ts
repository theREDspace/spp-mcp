import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient, authRequiredResponse } from '../helpers/auth';
import { textResponse, errorResponse } from '../helpers/responses';
import { resolveMe } from '../helpers/resolvers';
import { dateContainerToDate, formatMMDDYYYY } from '../helpers/dates';

const STATUS_MAP: Record<string, string> = {
  A: 'Approved',
  S: 'Submitted — pending approval',
  O: 'Open — not submitted',
  R: 'Rejected',
  X: 'Rejected',
};

const getMyLatestTimesheet: Tool = {
  name: 'get_my_latest_timesheet',
  description:
    'Get your latest (most recent) timesheet with submission status and total hours. Shows period, approval status, and allows drilling into details.',
  inputSchema: z.object({}),

  async handler(_args, _ctx) {
    if (!_ctx?.email) {
      return textResponse('Missing required email for per-user SPP authentication.');
    }

    const client = getAuthenticatedClient(_ctx?.email);
    if (!client) return authRequiredResponse(_ctx!.email);

    try {
      // Resolve current user by email
      const resolvedUser = await resolveMe(client, _ctx.email);
      if (!resolvedUser.ok) return textResponse(resolvedUser.message);
      const userId = resolvedUser.entity.id;

      // Fetch timesheets for this user
      const timesheets = (await client.list('Timesheet', { userid: userId }, 50, 0) as any[]) || [];

      if (!timesheets.length) {
        return textResponse('You have no timesheets yet.');
      }

      // Sort by starts date descending (most recent first)
      timesheets.sort((a: any, b: any) => {
        const dateA = dateContainerToDate(a.starts)?.getTime() ?? 0;
        const dateB = dateContainerToDate(b.starts)?.getTime() ?? 0;
        return dateB - dateA;
      });

      const latest = timesheets[0];

      // Extract dates
      const startsDate = dateContainerToDate(latest.starts);
      const endsDate = dateContainerToDate(latest.ends);
      const submittedDate = dateContainerToDate(latest.submitted);
      const approvedDate = dateContainerToDate(latest.approved);

      // Format period
      const periodStr =
        startsDate && endsDate
          ? `${formatMMDDYYYY(startsDate)} to ${formatMMDDYYYY(endsDate)}`
          : '(unknown period)';

      // Decode status
      const statusCode = latest.status || 'O';
      const statusText = STATUS_MAP[statusCode] || `Unknown (${statusCode})`;

      // Total hours
      const totalHours = latest.total ?? 0;

      // Submitted date
      const submittedStr = submittedDate ? formatMMDDYYYY(submittedDate) : '—';

      // Approved date
      const approvedStr = approvedDate ? formatMMDDYYYY(approvedDate) : '—';

      // Approver name (non-fatal if fails)
      let approverName = '—';
      if (latest.approved_by) {
        try {
          const approver = await client.read('User', latest.approved_by);
          const approverFirst = approver?.addr?.first || '';
          const approverLast = approver?.addr?.last || '';
          approverName = [approverFirst, approverLast].filter(Boolean).join(' ') || approver?.nickname || latest.approved_by;
        } catch {
          // Non-fatal — approver name stays as "—"
        }
      }

      // Build output
      const lines: string[] = [
        'Your Latest Timesheet',
        `  Period    : ${periodStr}`,
        `  Status    : ${statusText}`,
        `  Total     : ${totalHours.toFixed(1)}h`,
        `  Submitted : ${submittedStr}`,
        `  Approved  : ${approvedStr}`,
        `  Approver  : ${approverName}`,
        `  ID        : ${latest.id} (for details)`,
      ];

      return textResponse(lines.join('\n'));
    } catch (err) {
      return errorResponse(err, 'fetching your latest timesheet', '', _ctx!.email);
    }
  },
};

export default getMyLatestTimesheet;
