import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';
import { resolveProjectStages } from '../helpers/projectStage';

const listProjects: Tool = {
  name: 'list_projects',
  description:
    'List projects in SPP with optional filters. Returns id, name, code, and status for each project. Use search_projects to find a project by name.',
  inputSchema: z.object({
    active_only: z.boolean().optional().default(false).describe('When true, only return active projects'),
    filter: z.record(z.string(), z.any()).optional().describe('Additional SPP filter fields'),
    limit: z.number().int().min(1).max(1000).optional().default(100),
    offset: z.number().int().min(0).optional().default(0),
  }),
  async handler(args, _ctx) {
    const { active_only, filter = {}, limit, offset } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      const effectiveFilter = { ...filter, ...(active_only ? { active: 1 } : {}) };
      const projects = (await client.list('Project', effectiveFilter, limit, offset) as any[]) || [];

      // Resolve all unique stage IDs to human-readable names in one batch
      const stageIds = new Set(projects.map((p: any) => p.project_stageid).filter((id: any) => id != null));
      const stageMap = stageIds.size > 0
        ? await resolveProjectStages(client, stageIds)
        : new Map<string, string>();

      return jsonResponse({
        projects: projects.map((p: any) => {
          const stageId = p.project_stageid ?? null;
          return {
            id: p.id,
            name: p.name || null,
            code: p.code || null,
            active: p.active,
            status: stageId,
            status_label: stageId != null ? (stageMap.get(String(stageId)) ?? null) : null,
            customer_id: p.customerid || null,
          };
        }),
        count: projects.length,
        limit,
        offset,
      });
    } catch (err) {
      return errorResponse(err, 'listing projects', 'Project');
    }
  },
};

export default listProjects;
