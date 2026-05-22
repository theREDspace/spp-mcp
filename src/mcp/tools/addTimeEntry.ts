import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';
import { resolveMe } from '../helpers/resolvers';
import { parseISODate, formatISODate, dateContainerToDate } from '../helpers/dates';
import { ensureOpenTimesheet, isDateInTimesheet, resolveOpenTimesheet } from '../helpers/timesheetResolver';

const addTimeEntry: Tool = {
  name: 'add_time_entry',
  description:
    'Log one or more time entries for a project and task. All entries must fall within the same week — write operations are limited to one timesheet at a time. Hours are automatically added to your open timesheet for that week.',
  inputSchema: z.object({
    project_id: z.string().min(1).describe('SPP project ID'),
    project_task_id: z.string().min(1).describe('SPP project task ID'),
    entries: z
      .array(
        z.object({
          date: z.string().describe('Entry date in YYYY-MM-DD format'),
          hours: z.number().positive().max(24).describe('Hours to log (e.g., 7.5)'),
          notes: z.string().optional().describe('Optional notes for this entry'),
        })
      )
      .min(1)
      .describe('One or more date/hours pairs to log'),
    timesheet_id: z.string().optional().describe('Target timesheet ID. Omit to auto-resolve the current open timesheet.'),
    time_type_id: z.string().optional().describe('Time type ID override (defaults to timesheet default).'),
    description: z.string().optional().describe('Description applied to all entries'),
  }),
  async handler(args, _ctx) {
    const { project_id, project_task_id, entries, timesheet_id, time_type_id, description } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      // Resolve current user
      const resolved = await resolveMe(client);
      if (!resolved.ok) return jsonResponse({ error: resolved.message });
      const userId = resolved.entity.id;

      // Validate and parse dates
      const parsedEntries: Array<{ date: Date; isoDate: string; hours: number; notes?: string }> = [];
      for (const entry of entries) {
        const dateObj = parseISODate(entry.date);
        if (!dateObj) {
          return jsonResponse({
            error: `Invalid date format: "${entry.date}". Use YYYY-MM-DD.`,
          });
        }
        parsedEntries.push({
          date: dateObj,
          isoDate: entry.date,
          hours: entry.hours,
          notes: entry.notes,
        });
      }

      // Determine target timesheet
      let targetTimesheet: any;
      if (timesheet_id) {
        targetTimesheet = (await client.read('Timesheet', timesheet_id)) as any;
        if (!targetTimesheet) {
          return jsonResponse({ error: `Timesheet with ID "${timesheet_id}" not found.` });
        }
        if (targetTimesheet.userid !== userId) {
          return jsonResponse({ error: `Timesheet "${timesheet_id}" does not belong to you.` });
        }
      } else {
        // Auto-resolve requires all entries to share the same week.
        // (resolveOpenTimesheet picks one timesheet by date — entries from a different
        // week would fail isDateInTimesheet downstream with a confusing message.)
        const firstEntry = parsedEntries[0];
        if (!firstEntry) {
          return jsonResponse({ error: 'No entries provided.' });
        }
        // Check all entries are within ±6 days of the first (i.e., same calendar week)
        const firstTime = firstEntry.date.getTime();
        const outOfRange = parsedEntries.find(
          (e) => Math.abs(e.date.getTime() - firstTime) > 6 * 24 * 60 * 60 * 1000
        );
        if (outOfRange) {
          return jsonResponse({
            error: `Entries span more than one week (${firstEntry.isoDate} and ${outOfRange.isoDate}). Please call add_time_entry separately for each week, or pass an explicit timesheet_id.`,
          });
        }
        const resolveResult = await resolveOpenTimesheet(client, userId, firstEntry.date);
        if (!resolveResult.ok) {
          return jsonResponse({ error: resolveResult.message });
        }
        targetTimesheet = resolveResult.timesheet;
      }

      // Validate timesheet is open
      if (targetTimesheet.status !== 'O') {
        const statusMap: Record<string, string> = { S: 'submitted', A: 'approved', R: 'rejected', X: 'rejected' };
        const status = statusMap[targetTimesheet.status] || targetTimesheet.status;
        return jsonResponse({
          error: `Cannot log hours to a ${status} timesheet. Only open timesheets accept new entries.`,
        });
      }

      // Validate task belongs to project
      const task = (await client.read('ProjectTask', project_task_id)) as any;
      if (!task) {
        return jsonResponse({ error: `Project task with ID "${project_task_id}" not found.` });
      }
      if (task.projectid !== project_id) {
        return jsonResponse({
          error: `Project task "${project_task_id}" does not belong to project "${project_id}".`,
        });
      }

      // Validate all dates fall within timesheet period
      for (const entry of parsedEntries) {
        if (!isDateInTimesheet(entry.date, targetTimesheet)) {
          const startsDate = dateContainerToDate(targetTimesheet.starts);
          const endsDate = dateContainerToDate(targetTimesheet.ends);
          const starts = startsDate ? formatISODate(startsDate) : 'unknown';
          const ends = endsDate ? formatISODate(endsDate) : 'unknown';
          return jsonResponse({
            error: `Entry date ${entry.isoDate} is outside the timesheet period (${starts} to ${ends}).`,
          });
        }
      }

      // Build Task payloads
      const payloads = parsedEntries.map((entry) => ({
        userid: userId,
        projectid: project_id,
        projecttaskid: project_task_id,
        timesheetid: targetTimesheet.id,
        date: entry.isoDate, // XmlBuilder auto-converts YYYY-MM-DD to <Date> XML
        decimal_hours: entry.hours,
        notes: entry.notes,
        ...(description && { description }),
        ...(time_type_id && { timetypeid: time_type_id }),
        ...(!time_type_id && targetTimesheet.default_timetypeid && { timetypeid: targetTimesheet.default_timetypeid }),
      }));

      // Create all entries in a single API call
      const created = (await client.add('Task', payloads)) as any[];
      const createdArray = Array.isArray(created) ? created : [created];

      // Calculate total hours
      const totalHours = parsedEntries.reduce((sum, e) => sum + e.hours, 0);

      return jsonResponse({
        success: true,
        timesheet_id: targetTimesheet.id,
        entries_created: createdArray.length,
        total_hours: Math.round(totalHours * 100) / 100,
        entries: parsedEntries.map((e, i) => ({
          date: e.isoDate,
          hours: e.hours,
          entry_id: createdArray[i]?.id,
        })),
        message: `✅ Logged ${Math.round(totalHours * 100) / 100}h across ${parsedEntries.length} day(s) on ${task.name} (${task.project_name}).`,
      });
    } catch (err) {
      return errorResponse(err, 'adding time entries', 'Task');
    }
  },
};

export default addTimeEntry;
