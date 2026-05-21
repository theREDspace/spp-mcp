import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';
import { resolveMe } from '../helpers/resolvers';
import { dateContainerToDate, formatISODate } from '../helpers/dates';
import { ensureOpenTimesheet } from '../helpers/timesheetResolver';
import { XmlBuilder } from '../../utils/XmlBuilder';

const STATUS_MAP: Record<string, string> = {
  S: 'submitted',
  A: 'approved',
  R: 'rejected',
  X: 'rejected',
};

const submitTimesheet: Tool = {
  name: 'submit_timesheet',
  description:
    'Submit your timesheet for manager approval. Timesheet must be open and contain logged hours. If timesheet_id is omitted, submits the current open timesheet.',
  inputSchema: z.object({
    timesheet_id: z
      .string()
      .optional()
      .describe('Timesheet ID to submit. Omit to submit the current open timesheet.'),
  }),
  async handler(args, _ctx) {
    const { timesheet_id } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      // Resolve current user
      const resolved = await resolveMe(client);
      if (!resolved.ok) return jsonResponse({ error: resolved.message });
      const userId = resolved.entity.id;

      // Resolve timesheet
      let timesheet: any;
      if (timesheet_id) {
        timesheet = (await client.read('Timesheet', timesheet_id)) as any;
        if (!timesheet) {
          return jsonResponse({ error: `Timesheet with ID "${timesheet_id}" not found.` });
        }
        if (timesheet.userid !== userId) {
          return jsonResponse({ error: `Timesheet "${timesheet_id}" does not belong to you.` });
        }
      } else {
        // Get current open timesheet
        const resolveResult = await resolveOpenTimesheet(client, userId);
        if (!resolveResult.ok) {
          return jsonResponse({ error: resolveResult.message });
        }
        timesheet = resolveResult.timesheet;
      }

      // Validate timesheet is open
      if (timesheet.status !== 'O') {
        const status = STATUS_MAP[timesheet.status] || timesheet.status;
        return jsonResponse({
          error: `This timesheet is already ${status}. Only open timesheets can be submitted.`,
        });
      }

      // Optionally check min/max hours (as a warning, not a blocker)
      let warning: string | null = null;
      if (timesheet.min_hours) {
        const minHours = parseFloat(timesheet.min_hours);
        const totalHours = timesheet.total ?? 0;
        if (totalHours < minHours) {
          warning = `⚠️ Warning: You've logged ${totalHours}h but the minimum is ${minHours}h. Submitting anyway...`;
        }
      }

      // Format period BEFORE submitting, so any parse failure doesn't mask submit success
      const startsDate = dateContainerToDate(timesheet.starts);
      const endsDate = dateContainerToDate(timesheet.ends);
      const starts = startsDate ? formatISODate(startsDate) : 'unknown';
      const ends = endsDate ? formatISODate(endsDate) : 'unknown';

      // Build and execute submit XML
      const submitXml = XmlBuilder.buildSubmit('Timesheet', timesheet.id);
      await client.callSPPXML(submitXml);

      return jsonResponse({
        success: true,
        timesheet_id: timesheet.id,
        period: `${starts} to ${ends}`,
        total_hours: timesheet.total ?? 0,
        status: 'submitted',
        warning,
        message: `✅ Timesheet for ${starts} to ${ends} submitted successfully (${timesheet.total ?? 0}h). Awaiting manager approval.`,
      });
    } catch (err) {
      return errorResponse(err, 'submitting timesheet', 'Timesheet');
    }
  },
};

export default submitTimesheet;
