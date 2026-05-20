import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';
import { resolveMe } from '../helpers/resolvers';
import { parseISODate, formatISODate, dateContainerToDate } from '../helpers/dates';
import { isDateInTimesheet } from '../helpers/timesheetResolver';

const updateTimeEntry: Tool = {
  name: 'update_time_entry',
  description:
    'Modify an existing time entry. Update hours, date, notes, or reassign to a different project/task. Entry must belong to an open timesheet, and a new date (if provided) must stay within that same week — write operations are limited to one week at a time.',
  inputSchema: z.object({
    entry_id: z.string().min(1).describe('The time entry ID (from list_time_entries)'),
    hours: z.number().positive().max(24).optional().describe('New hours value'),
    date: z.string().optional().describe('Move entry to a different date (YYYY-MM-DD)'),
    notes: z.string().optional().describe('Replace or clear notes'),
    description: z.string().optional().describe('Update description'),
    project_id: z.string().optional().describe('Change to a different project'),
    project_task_id: z.string().optional().describe('Change to a different task'),
  }),
  async handler(args, _ctx) {
    const { entry_id, hours, date, notes, description, project_id, project_task_id } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      // Validate at least one change field is provided
      const hasChanges = hours !== undefined || date !== undefined || notes !== undefined || description !== undefined || project_id !== undefined || project_task_id !== undefined;
      if (!hasChanges) {
        return jsonResponse({
          error: 'No changes specified. Provide at least one of: hours, date, notes, description, project_id, or project_task_id.',
        });
      }

      // Resolve current user
      const resolved = await resolveMe(client);
      if (!resolved.ok) return jsonResponse({ error: resolved.message });
      const userId = resolved.entity.id;

      // Read existing entry
      const existing = (await client.read('Task', entry_id)) as any;
      if (!existing) {
        return jsonResponse({ error: `Time entry with ID "${entry_id}" not found.` });
      }

      // Verify ownership
      if (existing.userid !== userId) {
        return jsonResponse({ error: `Time entry "${entry_id}" does not belong to you.` });
      }

      // Verify parent timesheet is open
      const parentTimesheet = (await client.read('Timesheet', existing.timesheetid)) as any;
      if (!parentTimesheet) {
        return jsonResponse({ error: `Timesheet with ID "${existing.timesheetid}" not found.` });
      }
      if (parentTimesheet.status !== 'O') {
        const statusMap: Record<string, string> = { S: 'submitted', A: 'approved', R: 'rejected', X: 'rejected' };
        const status = statusMap[parentTimesheet.status] || parentTimesheet.status;
        return jsonResponse({
          error: `Cannot modify entry in a ${status} timesheet. Only open timesheets allow modifications.`,
        });
      }

      // If date provided, validate it
      let validateDate: Date | null = null;
      if (date !== undefined) {
        validateDate = parseISODate(date);
        if (!validateDate) {
          return jsonResponse({
            error: `Invalid date format: "${date}". Use YYYY-MM-DD.`,
          });
        }
        if (!isDateInTimesheet(validateDate, parentTimesheet)) {
          const startsDate = dateContainerToDate(parentTimesheet.starts);
          const endsDate = dateContainerToDate(parentTimesheet.ends);
          const starts = startsDate ? formatISODate(startsDate) : 'unknown';
          const ends = endsDate ? formatISODate(endsDate) : 'unknown';
          return jsonResponse({
            error: `Date ${date} is outside the timesheet period (${starts} to ${ends}).`,
          });
        }
      }

      // If project_task_id provided, validate it belongs to the (possibly new) project
      const finalProjectId = project_id ?? existing.projectid;
      if (project_task_id !== undefined) {
        const task = (await client.read('ProjectTask', project_task_id)) as any;
        if (!task) {
          return jsonResponse({ error: `Project task with ID "${project_task_id}" not found.` });
        }
        if (task.projectid !== finalProjectId) {
          return jsonResponse({
            error: `Project task "${project_task_id}" does not belong to project "${finalProjectId}".`,
          });
        }
      }

      // Build changes object
      const changes: Record<string, any> = {};
      if (hours !== undefined) changes.decimal_hours = hours;
      if (date !== undefined) changes.date = date; // XmlBuilder auto-converts YYYY-MM-DD
      if (notes !== undefined) changes.notes = notes;
      if (description !== undefined) changes.description = description;
      if (project_id !== undefined) changes.projectid = project_id;
      if (project_task_id !== undefined) changes.projecttaskid = project_task_id;

      // Update entry
      const updated = (await client.update('Task', entry_id, changes)) as any;

      return jsonResponse({
        success: true,
        entry_id,
        timesheet_id: existing.timesheetid,
        updated_fields: Object.keys(changes),
        message: `✅ Updated time entry ${entry_id}. Changes: ${Object.keys(changes).join(', ')}.`,
      });
    } catch (err) {
      return errorResponse(err, 'updating time entry', 'Task');
    }
  },
};

export default updateTimeEntry;
