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

      // Fetch slips for project/task breakdown
      const slips = (await client.list('Slip', { timesheetid: latest.id, type: 'T' }, 1000, 0) as any[]) || [];

      // Build output
      const lines: string[] = [
        'Your Latest Timesheet',
        `  Period    : ${periodStr}`,
        `  Status    : ${statusText}`,
        `  Total     : ${totalHours.toFixed(1)}h`,
        `  Submitted : ${submittedStr}`,
        `  Approved  : ${approvedStr}`,
        `  Approver  : ${approverName}`,
        `  ID        : ${latest.id}`,
      ];

      // Add brief project/task preview if slips exist
      if (slips.length > 0) {
        lines.push('');
        lines.push('Quick Breakdown:');

        // Aggregate by project → task
        const projectMap: Record<string, { hours: number; tasks: Record<string, { hours: number }> }> = {};
        slips.forEach((slip: any) => {
          const projId = slip.projectid || '(no-project)';
          const minuteValue = typeof slip.minute === 'number' ? slip.minute : 0;
          const hours = slip.decimal_hours ?? ((slip.hour ?? 0) + (minuteValue / 60));

          // Ensure project entry exists
          if (!projectMap[projId]) {
            projectMap[projId] = { hours: 0, tasks: {} };
          }
          projectMap[projId]!.hours += hours;

          // Ensure task entry exists if task is present
          if (slip.projecttaskid) {
            if (!projectMap[projId]!.tasks[slip.projecttaskid]) {
              projectMap[projId]!.tasks[slip.projecttaskid] = { hours: 0 };
            }
            projectMap[projId]!.tasks[slip.projecttaskid]!.hours += hours;
          }
        });

        // Batch-resolve project names
        const projectIds = Object.keys(projectMap);
        const projectFilters = projectIds.map((id: string) => ({ id }));
        let projects: any[] = [];
        try {
          projects = (await client.batchList('Project', projectFilters, 1000, 0) as any[]) || [];
        } catch {
          projects = [];
        }
        const projectMap2: Record<string, any> = {};
        projects.forEach((p: any) => {
          if (p?.id) projectMap2[p.id] = p;
        });

        // Batch-resolve task names
        const taskIds = Object.values(projectMap).flatMap((p: any) => Object.keys(p.tasks));
        const uniqueTaskIds = [...new Set(taskIds)];
        const taskFilters = uniqueTaskIds.map((id: string) => ({ id }));
        let projectTasks: any[] = [];
        try {
          projectTasks = (await client.batchList('ProjectTask', taskFilters, 1000, 0) as any[]) || [];
        } catch {
          projectTasks = [];
        }
        const taskMap: Record<string, any> = {};
        projectTasks.forEach((t: any) => {
          if (t?.id) taskMap[t.id] = t;
        });

        // Format output
        projectIds.forEach((projId: string) => {
          const projData = projectMap[projId];
          if (!projData) return;
          const proj = projectMap2[projId];
          const projName = proj?.name || '(unknown project)';
          const projCode = proj?.code ? `[${proj.code}]` : '';
          lines.push(`  • ${projCode} ${projName} — ${projData.hours.toFixed(1)}h`);

          const taskIds = Object.keys(projData.tasks);
          taskIds.forEach((taskId: string) => {
            const taskData = projData.tasks[taskId];
            if (!taskData) return;
            const task = taskMap[taskId];
            const taskName = task?.name || '(unknown task)';
            lines.push(`    ◦ ${taskName} — ${taskData.hours.toFixed(1)}h`);
          });
        });

        lines.push('');
        lines.push('For full details with timestamps and notes, call get_timesheet_details with ID above.');
      }

      return textResponse(lines.join('\n'));
    } catch (err) {
      return errorResponse(err, 'fetching your latest timesheet', '', _ctx!.email);
    }
  },
};

export default getMyLatestTimesheet;
