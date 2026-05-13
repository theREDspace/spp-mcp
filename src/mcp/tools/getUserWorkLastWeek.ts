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
  async handler(args) {
    const { person_name, user_id, week_offset = 1, day } = args;
    const client = getAuthenticatedClient();
    if (!client) return authRequiredResponse();
    const resolvedUser = await resolveUserByNameOrId(client, { user_id, person_name });
    if (!resolvedUser.ok) return textResponse(resolvedUser.message);
    const finalUserId = resolvedUser.entity.id;
    const userName = resolvedUser.entity.name;
    let startDate: Date, endDate: Date;
    if (day) {
      const parsed = parseMMDDYYYY(day);
      if (!parsed) return textResponse('Invalid day format. Please use MM/DD/YYYY (e.g., 01/15/2026).');
      startDate = parsed;
      endDate = new Date(parsed);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      const monday = getWeekMonday(now, week_offset);
      startDate = monday;
      endDate = getWeekSunday(monday);
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
      const projectMap: Record<string, { hours: number; tasks: Record<string, { hours: number }> }> = {};
      filteredSlips.forEach((slip: any) => {
        const projId = slip.projectid || '(no-project)';
        if (!projectMap[projId]) projectMap[projId] = { hours: 0, tasks: {} };
        const hours = slip.decimal_hours ?? (slip.hour ?? 0) + ((slip.minute ?? 0) / 60);
        projectMap[projId].hours += hours;
        if (slip.projecttaskid) {
          if (!projectMap[projId].tasks[slip.projecttaskid]) projectMap[projId].tasks[slip.projecttaskid] = { hours: 0 };
          projectMap[projId].tasks[slip.projecttaskid].hours += hours;
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
        const proj = projectMap2[projId];
        const projName = proj?.name || '(unknown project)';
        const projCode = proj?.code ? `[${proj.code}]` : '';
        lines.push(`- ${projCode} ${projName} — ${projData.hours.toFixed(1)}h`);
        const taskIds = Object.keys(projData.tasks);
        taskIds.forEach((taskId: string) => {
          const taskData = projData.tasks[taskId];
          const task = taskMap[taskId];
          const taskName = task?.name || '(unknown task)';
          lines.push(`  • ${taskName} — ${taskData.hours.toFixed(1)}h`);
        });
      });
      return textResponse(lines.join('\n'));
    } catch (err) {
      return errorResponse(err, 'fetching work');
    }
  }
};
export default getUserWorkLastWeek;
