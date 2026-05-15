import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { textResponse, errorResponse } from '../helpers/responses';

const listProjects: Tool = {
  name: 'list_projects',
  description: 'List all projects in Redspace SPP. Optionally accepts filter, limit, and offset.',
  inputSchema: z.object({
    filter: z.record(z.string(), z.any()).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  }),
  async handler(args, _ctx) {
    const { filter = {}, limit = 100, offset = 0 } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return textResponse('No authentication token found in request context.');
    try {
      const projects = (await client.list('Project', filter, limit, offset) as any[]) || [];
      const lines = [
        `Found ${projects.length} project(s):`,
        '',
        ...projects.map((p: any) => `- [${p.id}] ${p.name || '(no name)'}${p.status ? ` — ${p.status}` : ''}`)
      ];
      return textResponse(lines.join('\n'));
    } catch (err) {
      return errorResponse(err, 'listing projects');
    }
  }
};
export default listProjects;
