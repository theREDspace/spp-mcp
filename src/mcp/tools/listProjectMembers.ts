import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { textResponse, errorResponse } from '../helpers/responses';
import { resolveProjectByNameOrId } from '../helpers/resolvers';

const listProjectMembers: Tool = {
  name: 'list_project_members',
  description:
    'List all users (resources) assigned to a given SPP project. Accepts either a project ID or project name. Returns member details including name, email, and allocation percentage.',
  inputSchema: z.object({
    project_id: z.string().optional(),
    project_name: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    include_inactive: z.boolean().optional(),
  }),
  async handler(args, _ctx) {
    const { project_id, project_name, limit = 1000, offset = 0, include_inactive = false } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return textResponse('No authentication token found in request context.');

    const res = await resolveProjectByNameOrId(client, { project_id, project_name });
    if (!res.ok) {
      if ('candidates' in res) {
        const lines = [
          `Multiple projects found matching "${project_name}":`,
          '',
          ...res.candidates.map((p: any) => `- [${p.id}] ${p.name || '(no name)'}${p.code ? ` (Code: ${p.code})` : ''}${p.externalid ? ` (ExternalID: ${p.externalid})` : ''}`),
          '',
          'Please specify your project by ID to continue.',
        ];
        return textResponse(lines.join('\n'));
      }
      return textResponse(res.message);
    }

    const finalProjectId = res.entity.id;
    let projectName = res.entity.name;
    try {
      let projectDetails: any = null;
      try {
        projectDetails = await client.read('Project', finalProjectId);
        if (projectDetails?.name) projectName = projectDetails.name;
      } catch {}
      const assignments = (await client.list('ProjectAssign', { project_id: finalProjectId }, limit, offset) as any[]) || [];
      if (assignments.length === 0) {
        return textResponse(`Project "${projectName}" (id ${finalProjectId}) has no assigned members.`);
      }
      const userIds = assignments
        .filter((a: any) => include_inactive ? true : Number(a.deleted) !== 1)
        .map((a: any) => a.user_id)
        .filter(Boolean)
        .filter((id: string, idx: number, arr: string[]) => arr.indexOf(id) === idx);
      if (!userIds.length) {
        return textResponse(`Project "${projectName}" (id ${finalProjectId}) has no active assigned members.`);
      }
      const userFilters = userIds.map((id: string) => ({ id }));
      let users: any[] = [];
      try {
        users = (await client.batchList('User', userFilters, limit, 0) as any[]) || [];
      } catch {
        users = [];
      }
      const userMap: Record<string, any> = {};
      users.forEach((u: any) => { if (u?.id) userMap[u.id] = u; });
      const enrichedAssignments = assignments
        .filter((a: any) => {
          if (include_inactive) return true;
          const user = userMap[a.user_id];
          return Number(a.deleted) !== 1 && user && Number(user.active) === 1;
        })
        .map((a: any) => {
          const user = userMap[a.user_id];
          const firstName = user?.addr?.first || '(unknown)';
          const lastName = user?.addr?.last || '';
          const email = user?.addr?.email || '(no email)';
          const allocation = a.allocation != null ? `${a.allocation}%` : 'N/A';
          return {
            id: a.user_id,
            name: `${firstName} ${lastName}`.trim(),
            email,
            allocation,
            job_code_id: a.job_code_id || 'N/A',
            deleted: a.deleted,
            user_active: user?.active,
          };
        });
      const lines = [
        `Project "${projectName}" (id ${finalProjectId}) has ${enrichedAssignments.length} member(s):`,
        '',
        ...enrichedAssignments.map((m: any) =>
          `- [${m.id}] ${m.name} <${m.email}> — allocation: ${m.allocation} — job_code: ${m.job_code_id}`
        ),
      ];
      return textResponse(lines.join('\n'));
    } catch (err) {
      let extra = '';
      if (project_name && !project_id) extra = '\n(Tried to resolve project_name via filters: name/code/externalid and in-memory match)';
      return errorResponse(err, 'listing project members', extra);
    }
  }
};
export default listProjectMembers;
