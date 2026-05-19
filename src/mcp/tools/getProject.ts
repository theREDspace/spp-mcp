import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';
import { dateContainerToDate, formatISODate } from '../helpers/dates';

const getProject: Tool = {
  name: 'get_project',
  description:
    'Get full details for a single SPP project by its ID. Use search_projects first if you only have a name.',
  inputSchema: z.object({
    project_id: z.string().min(1).describe('The SPP project ID'),
  }),
  async handler(args, _ctx) {
    const { project_id } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      const p = await client.read('Project', project_id) as any;
      if (!p) return jsonResponse({ error: `Project with id "${project_id}" not found.` });

      const startDate = dateContainerToDate(p.start_date);
      const finishDate = dateContainerToDate(p.finish_date);

      return jsonResponse({
        id: p.id,
        name: p.name || null,
        code: p.code || null,
        externalid: p.externalid || null,
        active: p.active,
        status: p.project_stageid || null,
        budget: p.budget ?? null,
        budget_time: p.budget_time ?? null,
        currency: p.currency || null,
        customer_id: p.customerid || null,
        customer_name: p.customer_name || null,
        start_date: startDate ? formatISODate(startDate) : null,
        finish_date: finishDate ? formatISODate(finishDate) : null,
        notes: p.notes || null,
        userid: p.userid || null,
      });
    } catch (err) {
      return errorResponse(err, 'fetching project');
    }
  },
};

export default getProject;
