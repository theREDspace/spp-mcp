import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';

const searchProjects: Tool = {
  name: 'search_projects',
  description:
    'Search for SPP projects by name, code, or external ID. Returns a list of matching projects with their IDs. Use this to find a project_id before calling other tools.',
  inputSchema: z.object({
    query: z.string().min(1).describe('Project name, code, or external ID to search for'),
    limit: z.number().int().min(1).max(100).optional().default(20),
  }),
  async handler(args, _ctx) {
    const { query, limit } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      const seen = new Set<string>();
      const results: any[] = [];

      for (const filter of [{ name: query }, { code: query }, { externalid: query }]) {
        try {
          const rows = (await client.list('Project', filter, limit, 0) as any[]) || [];
          for (const p of rows) {
            if (p?.id && !seen.has(p.id)) {
              seen.add(p.id);
              results.push({ id: p.id, name: p.name || null, code: p.code || null, status: p.project_stageid || null, active: p.active, externalid: p.externalid || null });
            }
          }
        } catch { /* try next filter */ }
        if (results.length >= limit) break;
      }

      return jsonResponse({ results: results.slice(0, limit), count: results.length });
    } catch (err) {
      return errorResponse(err, 'searching projects', 'Project');
    }
  },
};

export default searchProjects;
