import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient, authRequiredResponse } from '../helpers/auth';
import { textResponse, errorResponse } from '../helpers/responses';
import { resolveUserByNameOrId } from '../helpers/resolvers';
import { dateContainerToDate, getWeekMonday, getWeekSunday, parseMMDDYYYY, formatMMDDYYYY } from '../helpers/dates';

const getUserWorkLastWeek: Tool = {
  name: 'get_user_work_last_week',
  description: 'Get projects and tasks a user worked on during a specific week or day. Requires at least person_name or user_id. Returns time entries grouped by project and task.',
  inputSchema: z.object({
    person_name: z.string().optional(),
    user_id: z.string().optional(),
    week_offset: z.number().optional(),
    day: z.string().optional(),
  }),
  async handler(args, _ctx) {
    const { person_name, user_id, week_offset = 1, day } = args;

    if (!_ctx?.email) {
      return textResponse('Missing required email for per-user SPP authentication.');
    }

    if (!person_name && !user_id) {
      return textResponse('Please provide either a person_name or user_id.');
    }

    const client = getAuthenticatedClient(_ctx.email);
    if (!client) return authRequiredResponse(_ctx!.email);

    let finalUserId: string;
    let userName: string;
    let startDate: Date;
    let endDate: Date;

    try {
      const resolvedUser = await resolveUserByNameOrId(client, { user_id, person_name });
      if (!resolvedUser.ok) return textResponse(resolvedUser.message);
      finalUserId = resolvedUser.entity.id;
      const entity = resolvedUser.entity as any;
      const addr = entity?.addr ?? {};
      userName = [addr.first, addr.last].filter(Boolean).join(' ') || entity?.nickname || finalUserId;

      if (day) {
        const parsed = parseMMDDYYYY(day);
        if (!parsed) return textResponse(`Invalid day format: ${day}. Use MM/DD/YYYY.`);
        startDate = parsed;
        endDate = parsed;
      } else {
        const monday = getWeekMonday(week_offset);
        startDate = monday;
        endDate = getWeekSunday(monday);
      }
    } catch (err) {
      return errorResponse(err, 'resolving user', '', _ctx!.email);
    }

    try {
      const slips = (await client.list('Slip', { userid: finalUserId, type: 'T' }, 1000, 0) as any[]) || [];
      const filteredSlips = slips.filter((slip: any) => {
        const slipDate = dateContainerToDate(slip.date);
        if (!slipDate) return false;
        return slipDate >= startDate && slipDate <= endDate;
      });
       if (!filteredSlips.length) {
         return textResponse(`${userName} logged no time from ${formatMMDDYYYY(startDate)} to ${formatMMDDYYYY(endDate)}.`);
       }
       // Helper: Normalize and truncate slip note
       function normalizeSlipNote(note: any, maxLen = 150): string | null {
         if (!note || typeof note !== 'string') return null;
         const clean = note.trim();
         if (!clean) return null;
         if (clean.length > maxLen) return clean.slice(0, maxLen).trim() + '…';
         return clean;
       }

       // Extended project map: collect slips array per task
       const projectMap: Record<string, { hours: number; tasks: Record<string, { hours: number; slips: any[] }> }> = {};
       filteredSlips.forEach((slip: any) => {
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
                  note: normalizeSlipNote(slip.notes)
                });
              }
            }
          }
       });
       const projectIds = Object.keys(projectMap);
       const projectFilters = projectIds.map((id: string) => ({ id }));
       let projects: any[] = [];
       try {
         projects = (await client.batchList('Project', projectFilters, 1000, 0) as any[]) || [];
       } catch { projects = []; }
       const projectMap2: Record<string, any> = {};
       projects.forEach((p: any) => { if (p?.id) projectMap2[p.id] = p; });
       const taskIds = Object.values(projectMap).flatMap((p: any) => Object.keys(p.tasks));
       const uniqueTaskIds = [...new Set(taskIds)];
       const taskFilters = uniqueTaskIds.map((id: string) => ({ id }));
       let projectTasks: any[] = [];
       try {
         projectTasks = (await client.batchList('ProjectTask', taskFilters, 1000, 0) as any[]) || [];
       } catch { projectTasks = []; }
       const taskMap: Record<string, any> = {};
       projectTasks.forEach((t: any) => { if (t?.id) taskMap[t.id] = t; });
       const lines: string[] = [
         `${userName} — work logged from ${formatMMDDYYYY(startDate)} to ${formatMMDDYYYY(endDate)}:`,
         ''
       ];
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
            // Now surface each slip line with notes (if present)
            if (Array.isArray(taskData.slips)) {
              taskData.slips.sort((a, b) => {
                // Sort by date ascending (earliest first)
                const d1 = dateContainerToDate(a.date)?.getTime() ?? 0;
                const d2 = dateContainerToDate(b.date)?.getTime() ?? 0;
                return d1 - d2;
              });
              taskData.slips.forEach(slipEntry => {
                const slipDate: Date | null = dateContainerToDate(slipEntry.date);
                const slipDateStr = slipDate ? formatMMDDYYYY(slipDate) : '??/??/????';
                let slipLine = `    • ${slipDateStr} — ${slipEntry.hours.toFixed(2)}h`;
                if (slipEntry.note) {
                  slipLine += ` — note: ${slipEntry.note}`;
                }
                lines.push(slipLine);
              });
            }
          });
        });
       return textResponse(lines.join('\n'));

    } catch (err) {
      return errorResponse(err, 'fetching work', '', _ctx!.email);
    }
  }
};
export default getUserWorkLastWeek;
