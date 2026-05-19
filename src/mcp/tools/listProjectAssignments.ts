import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';

const listProjectAssignments: Tool = {
  name: 'list_project_assignments',
  description:
    'List all users assigned to a project. Returns user IDs, allocation percentages, and job codes. Use search_projects to find a project_id first.',
  inputSchema: z.object({
    project_id: z.string().min(1).describe('The SPP project ID'),
    include_inactive: z.boolean().optional().default(false).describe('Include deleted/inactive assignments'),
    limit: z.number().int().min(1).max(1000).optional().default(200),
    offset: z.number().int().min(0).optional().default(0),
  }),
  async handler(args, _ctx) {
    const { project_id, include_inactive, limit, offset } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      // Key fix: filter field is `projectid` (no underscore), not `project_id`
      const assignments = (await client.list('ProjectAssign', { projectid: project_id }, limit, offset) as any[]) || [];

      const active = include_inactive
        ? assignments
        : assignments.filter((a: any) => Number(a.deleted) !== 1);

      if (!active.length) {
        return jsonResponse({ project_id, assignments: [], count: 0 });
      }

      // Enrich with basic user info
      const userIds = [...new Set(active.map((a: any) => a.userid).filter(Boolean))] as string[];
      let users: any[] = [];
      if (userIds.length) {
        try {
          users = (await client.batchList('User', userIds.map(id => ({ id })), 1000, 0) as any[]) || [];
        } catch { /* non-fatal — return without enrichment */ }
      }

      const userMap = new Map<string, any>();
      for (const u of users) {
        if (u?.id) userMap.set(u.id, u);
      }

      const result = active.map((a: any) => {
        const u = userMap.get(a.userid);
        const addr = u?.addr ?? {};
        return {
          user_id: a.userid || null,
          name: u ? ([addr.first, addr.last].filter(Boolean).join(' ') || u.nickname || a.userid) : null,
          email: addr.email || null,
          allocation: a.allocation != null ? a.allocation : null,
          job_code_id: a.job_code_id || a.jobcodeid || null,
          active: u ? (Number(u.active) === 1) : null,
          deleted: Number(a.deleted) === 1,
        };
      });

      return jsonResponse({ project_id, assignments: result, count: result.length });
    } catch (err) {
      return errorResponse(err, 'listing project assignments');
    }
  },
};

export default listProjectAssignments;
