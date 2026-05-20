import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';

const listProjectTasks: Tool = {
  name: 'list_project_tasks',
  description: 'List tasks for a project. Filters by project_id, and by default returns open/active (not closed/deleted) tasks.',
  inputSchema: z.object({
    project_id: z.string().describe('The SPP project ID.'),
    active_only: z.boolean().optional().default(true).describe('Only return tasks that are not closed or deleted.'),
    limit: z.number().int().min(1).max(1000).optional().default(200),
    offset: z.number().int().min(0).optional().default(0),
  }),
  async handler(args, _ctx) {
    const { project_id, active_only, limit, offset } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      const filter: Record<string, any> = { projectid: project_id };
      // Note: SPP does not support filtering ProjectTask by closed/deleted via the Read API.
      // Fetch all tasks for the project and filter client-side.
      const allTasks = (await client.list('ProjectTask', filter, 1000, 0) as any[]) || [];
      const filtered = active_only
        ? allTasks.filter((t: any) => !t.closed && !t.deleted)
        : allTasks;
      // Apply offset/limit client-side
      const tasks = filtered.slice(offset, offset + limit);
      return jsonResponse({
        tasks: tasks.map((t: any) => ({
          id: t.id,
          name: t.name || null,
          project_id: t.projectid,
          classification: t.classification === 'M' ? 'milestone' : t.classification === 'P' ? 'phase' : 'task',
          percent_complete: t.percent_complete ?? null,
          planned_hours: t.planned_hours ?? null,
          priority: t.priority ?? null,
          is_billable: t.non_billable != null ? !t.non_billable : null,
          parent_id: t.parentid ?? null,
          notes: t.notes ?? null,
        })),
        count: tasks.length,
        total_count: filtered.length,
        project_id,
        limit,
        offset,
      });
    } catch (err) {
      return errorResponse(err, 'listing project tasks', 'ProjectTask');
    }
  },
};

export default listProjectTasks;
