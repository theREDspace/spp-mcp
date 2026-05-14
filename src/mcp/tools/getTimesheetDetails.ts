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

const getTimesheetDetails: Tool = {
  name: 'get_timesheet_details',
  description:
    'Get detailed breakdown of a timesheet by project and task, including individual time entries and notes.',
  inputSchema: z.object({
    timesheet_id: z.string().min(1),
  }),

  async handler(args, _ctx) {
    const { timesheet_id } = args;

    if (!_ctx?.email) {
      return textResponse('Missing required email for per-user SPP authentication.');
    }

    const client = getAuthenticatedClient(_ctx?.email);
    if (!client) return authRequiredResponse(_ctx!.email);

    try {
      // Resolve current user by email
      const resolved = await resolveMe(client, _ctx.email);
      if (!resolved.ok) return textResponse(resolved.message);

      // Fetch timesheet
      const timesheet = await client.read('Timesheet', timesheet_id);

      // Security check: ensure timesheet belongs to current user
      if (timesheet.userid !== resolved.entity.id) {
        return textResponse('Timesheet not found or does not belong to you.');
      }

      // Extract dates
      const startsDate = dateContainerToDate(timesheet.starts);
      const endsDate = dateContainerToDate(timesheet.ends);
      const submittedDate = dateContainerToDate(timesheet.submitted);
      const approvedDate = dateContainerToDate(timesheet.approved);

      // Format period
      const periodStr =
        startsDate && endsDate
          ? `${formatMMDDYYYY(startsDate)} to ${formatMMDDYYYY(endsDate)}`
          : '(unknown period)';

      // Decode status
      const statusCode = timesheet.status || 'O';
      const statusText = STATUS_MAP[statusCode] || `Unknown (${statusCode})`;

      // Total hours
      const totalHours = timesheet.total ?? 0;

      // Submitted date
      const submittedStr = submittedDate ? formatMMDDYYYY(submittedDate) : '—';

      // Approved date
      const approvedStr = approvedDate ? formatMMDDYYYY(approvedDate) : '—';

      // Approver name (non-fatal if fails)
      let approverName = '—';
      if (timesheet.approved_by) {
        try {
          const approver = await client.read('User', timesheet.approved_by);
          const approverFirst = approver?.addr?.first || '';
          const approverLast = approver?.addr?.last || '';
          approverName = [approverFirst, approverLast].filter(Boolean).join(' ') || approver?.nickname || timesheet.approved_by;
        } catch {
          // Non-fatal — approver name stays as "—"
        }
      }

      // Build header
      const lines: string[] = [
        `Timesheet — ${periodStr}`,
        `Status    : ${statusText}`,
        `Total     : ${totalHours.toFixed(1)}h`,
        `Submitted : ${submittedStr}`,
        `Approved  : ${approvedStr}`,
        `Approver  : ${approverName}`,
      ];

      // Fetch slips (time entries)
      const slips = (await client.list('Slip', { timesheetid: timesheet_id, type: 'T' }, 1000, 0) as any[]) || [];

      if (!slips.length) {
        // No slips, return summary only
        return textResponse(lines.join('\n'));
      }

      // Helper: Normalize and truncate slip note
      function normalizeSlipNote(note: any, maxLen = 150): string | null {
        if (!note || typeof note !== 'string') return null;
        const clean = note.trim();
        if (!clean) return null;
        if (clean.length > maxLen) return clean.slice(0, maxLen).trim() + '…';
        return clean;
      }

      // Aggregate slips by project → task
      const projectMap: Record<string, { hours: number; tasks: Record<string, { hours: number; slips: any[] }> }> = {};

      slips.forEach((slip: any) => {
        const projId = slip.projectid || '(no-project)';
        if (!projectMap[projId]) projectMap[projId] = { hours: 0, tasks: {} };

        const minuteValue = typeof slip.minute === 'number' ? slip.minute : 0;
        const hours = slip.decimal_hours ?? ((slip.hour ?? 0) + (minuteValue / 60));
        projectMap[projId].hours += hours;

        if (slip.projecttaskid) {
          const proj = projectMap[projId];
          if (proj) {
            if (!proj.tasks[slip.projecttaskid]) proj.tasks[slip.projecttaskid] = { hours: 0, slips: [] };
            const task = proj.tasks[slip.projecttaskid];
            if (task) {
              task.hours += hours;
              // Attach slip to this task (with note)
              task.slips.push({
                date: slip.date, // dateContainer
                hours,
                note: normalizeSlipNote(slip.notes),
              });
            }
          }
        }
      });

      // Batch-resolve Project names
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

      // Batch-resolve ProjectTask names
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

      // Format breakdown by project
      lines.push('');
      lines.push('Breakdown by Project:');

      projectIds.forEach((projId: string) => {
        const projData = projectMap[projId];
        if (!projData) return;

        const proj = projectMap2[projId];
        const projName = proj?.name || '(unknown project)';
        const projCode = proj?.code ? `[${proj.code}]` : '';
        lines.push(`- ${projCode} ${projName} — ${projData.hours.toFixed(1)}h`);

        const taskIds = Object.keys(projData.tasks);
        taskIds.forEach((taskId: string) => {
          const taskData = projData.tasks[taskId];
          if (!taskData) return;

          const task = taskMap[taskId];
          const taskName = task?.name || '(unknown task)';
          lines.push(`  • ${taskName} — ${taskData.hours.toFixed(1)}h`);

          // Surface each slip line with notes (if present)
          if (Array.isArray(taskData.slips)) {
            taskData.slips.sort((a, b) => {
              // Sort by date ascending (earliest first)
              const d1 = dateContainerToDate(a.date)?.getTime() ?? 0;
              const d2 = dateContainerToDate(b.date)?.getTime() ?? 0;
              return d1 - d2;
            });

            taskData.slips.forEach((slipEntry) => {
              const slipDate: Date | null = dateContainerToDate(slipEntry.date);
              const slipDateStr = slipDate ? formatMMDDYYYY(slipDate) : '??/??/????';
              let slipLine = `      ${slipDateStr} — ${slipEntry.hours.toFixed(2)}h`;
              if (slipEntry.note) {
                slipLine += ` — note: "${slipEntry.note}"`;
              }
              lines.push(slipLine);
            });
          }
        });
      });

      return textResponse(lines.join('\n'));
    } catch (err) {
      return errorResponse(err, 'fetching timesheet details', '', _ctx!.email);
    }
  },
};

export default getTimesheetDetails;
