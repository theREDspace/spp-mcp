import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient, authRequiredResponse } from '../helpers/auth';
import { textResponse, errorResponse } from '../helpers/responses';

const listProjects: Tool = {
  name: 'list_projects',
  description: 'List all projects in Redspace SPP. If the user is not authenticated, returns an authentication link. Optionally accepts filter, limit, and offset.',
  inputSchema: z.object({
    filter: z.record(z.any()).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  }),
  async handler(args) {
    const { filter = {}, limit = 100, offset = 0 } = args;
    const client = getAuthenticatedClient();
    if (!client) return authRequiredResponse();
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
