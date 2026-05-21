import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';
import { resolveMe } from '../helpers/resolvers';
import { dateContainerToDate, formatISODate } from '../helpers/dates';
import { ensureOpenTimesheet, resolveSourceTimesheet, isDateInTimesheet } from '../helpers/timesheetResolver';
import type { Slip } from '../../types/Slip';

const cloneTimesheet: Tool = {
  name: 'clone_timesheet',
  description:
    'Clone time entries from your most recent timesheet into the current open timesheet. Optionally override or skip specific days. Perfect for recurring work weeks.',
  inputSchema: z.object({
    source_timesheet_id: z
      .string()
      .optional()
      .describe('Timesheet ID to clone FROM. Omit to use the most recent completed timesheet.'),
    target_timesheet_id: z
      .string()
      .optional()
      .describe('Timesheet ID to clone INTO. Omit to use the current open timesheet.'),
    overrides: z
      .array(
        z.object({
          day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
          action: z.enum(['replace', 'skip']).default('replace'),
          project_id: z.string().optional(),
          project_task_id: z.string().optional(),
          hours: z.number().positive().max(24).optional(),
          notes: z.string().optional(),
        })
      )
      .optional()
      .default([])
      .describe('Override specific days instead of cloning them from the source.'),
    exclude_days: z
      .array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']))
      .optional()
      .default([])
      .describe('Days to skip entirely (e.g., for holidays).'),
  }),
  async handler(args, _ctx) {
    const { source_timesheet_id, target_timesheet_id, overrides, exclude_days } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      // Resolve current user
      const resolved = await resolveMe(client);
      if (!resolved.ok) return jsonResponse({ error: resolved.message });
      const userId = resolved.entity.id;

      // Resolve source and target timesheets
      const sourceResult = await resolveSourceTimesheet(client, userId, source_timesheet_id);
      if (!sourceResult.ok) return jsonResponse({ error: sourceResult.message });
      const sourceTs = sourceResult.timesheet;

      // Resolve target: explicit ID takes priority, otherwise find the open timesheet
      let targetTs: any;
      if (target_timesheet_id) {
        targetTs = (await client.read('Timesheet', target_timesheet_id)) as any;
        if (!targetTs) {
          return jsonResponse({ error: `Target timesheet with ID "${target_timesheet_id}" not found.` });
        }
        if (targetTs.userid !== userId) {
          return jsonResponse({ error: `Target timesheet "${target_timesheet_id}" does not belong to you.` });
        }
      } else {
        const targetResult = await resolveOpenTimesheet(client, userId);
        if (!targetResult.ok) return jsonResponse({ error: targetResult.message });
        targetTs = targetResult.timesheet;
      }

      // Validate target timesheet is open
      if (targetTs.status !== 'O') {
        const statusMap: Record<string, string> = { S: 'submitted', A: 'approved', R: 'rejected', X: 'rejected' };
        const status = statusMap[targetTs.status] || targetTs.status;
        return jsonResponse({
          error: `Target timesheet is ${status}. Only open timesheets can receive cloned entries.`,
        });
      }

      // Fetch source slips
      const sourceSlips = (await client.list('Slip', { timesheetid: sourceTs.id, userid: userId, type: 'T' }, 1000, 0) as Slip[]) || [];

      if (!sourceSlips.length) {
        return jsonResponse({ error: 'Source timesheet has no entries to clone.' });
      }

      // Build day-of-week map from source (0=Mon, 1=Tue, ..., 6=Sun)
      const sourceMonday = dateContainerToDate(sourceTs.starts);
      if (!sourceMonday) {
        return jsonResponse({ error: 'Could not parse source timesheet start date.' });
      }

      const dayMap = new Map<number, Slip[]>();
      for (const slip of sourceSlips) {
        const slipDate = dateContainerToDate(slip.date);
        if (slipDate) {
          const dayOffset = Math.floor((slipDate.getTime() - sourceMonday.getTime()) / (24 * 60 * 60 * 1000));
          if (dayOffset >= 0 && dayOffset <= 6) {
            if (!dayMap.has(dayOffset)) {
              dayMap.set(dayOffset, []);
            }
            dayMap.get(dayOffset)!.push(slip);
          }
        }
      }

      // Build target date map
      const targetMonday = dateContainerToDate(targetTs.starts);
      if (!targetMonday) {
        return jsonResponse({ error: 'Could not parse target timesheet start date.' });
      }

      const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const targetDates = dayNames.map((_, i) => {
        const d = new Date(targetMonday.getTime() + i * 24 * 60 * 60 * 1000);
        return formatISODate(d);
      });

      // Validate overrides and build override map
      const overrideMap = new Map<number, (typeof overrides)[0]>();
      const excludeSet = new Set(exclude_days.map((d: string) => dayNames.indexOf(d)));

      for (const override of overrides) {
        const dayIdx = dayNames.indexOf(override.day);
        if (dayIdx < 0) continue;

        if (override.action === 'replace') {
          if (!override.project_id || !override.project_task_id || override.hours === undefined) {
            return jsonResponse({
              error: `Override for ${override.day} with action='replace' requires project_id, project_task_id, and hours.`,
            });
          }
        }
        overrideMap.set(dayIdx, override);
      }

      // Build payloads and summary
      const payloads: any[] = [];
      const summary: any[] = [];

      for (let i = 0; i < 7; i++) {
        const dayName = dayNames[i];

        // Check if day is excluded
        if (excludeSet.has(i)) {
          summary.push({ day: dayName, action: 'skipped', reason: 'excluded' });
          continue;
        }

        // Check for override
        const override = overrideMap.get(i);
        if (override?.action === 'skip') {
          summary.push({ day: dayName, action: 'skipped', reason: 'override' });
          continue;
        }

        if (override?.action === 'replace') {
          const payload = {
            userid: userId,
            projectid: override.project_id,
            projecttaskid: override.project_task_id,
            timesheetid: targetTs.id,
            date: targetDates[i],
            decimal_hours: override.hours,
            ...(override.notes && { notes: override.notes }),
          };
          payloads.push(payload);
          summary.push({
            day: dayName,
            action: 'override',
            hours: override.hours,
            project_id: override.project_id,
            task_id: override.project_task_id,
          });
          continue;
        }

        // Clone entries for this day
        const sourceSlipsForDay = dayMap.get(i) ?? [];
        if (sourceSlipsForDay.length === 0) {
          summary.push({ day: dayName, action: 'no_entries' });
          continue;
        }

        let dayTotal = 0;
        for (const slip of sourceSlipsForDay) {
          const minuteValue = typeof slip.minute === 'number' ? slip.minute : 0;
          const slipHours = slip.decimal_hours ?? ((slip.hour ?? 0) + (minuteValue / 60));
          const payload = {
            userid: userId,
            projectid: slip.projectid,
            projecttaskid: slip.projecttaskid,
            timesheetid: targetTs.id,
            date: targetDates[i],
            decimal_hours: slipHours,
            ...(slip.notes && { notes: slip.notes }),
          };
          payloads.push(payload);
          dayTotal += slipHours;
        }

        summary.push({
          day: dayName,
          action: 'cloned',
          entries: sourceSlipsForDay.length,
          hours: Math.round(dayTotal * 100) / 100,
        });
      }

      // If no payloads to create, return early
      if (payloads.length === 0) {
        return jsonResponse({
          warning: 'No entries to clone after applying exclusions and overrides.',
          summary,
        });
      }

      // Create all entries in one API call
      const created = (await client.add('Task', payloads)) as any[];
      const createdArray = Array.isArray(created) ? created : [created];

      const totalHours = payloads.reduce((sum, p) => sum + p.decimal_hours, 0);

      return jsonResponse({
        success: true,
        source_timesheet: {
          id: sourceTs.id,
          period: `${formatISODate(sourceMonday)} to ${formatISODate(new Date(sourceMonday.getTime() + 6 * 24 * 60 * 60 * 1000))}`,
          entries: sourceSlips.length,
        },
        target_timesheet: {
          id: targetTs.id,
          period: `${formatISODate(targetMonday)} to ${formatISODate(new Date(targetMonday.getTime() + 6 * 24 * 60 * 60 * 1000))}`,
        },
        result: {
          entries_created: createdArray.length,
          total_hours: Math.round(totalHours * 100) / 100,
          by_day: summary,
        },
        message: `✅ Cloned ${createdArray.length} entries (${Math.round(totalHours * 100) / 100}h) into ${formatISODate(targetMonday)}–${formatISODate(new Date(targetMonday.getTime() + 6 * 24 * 60 * 60 * 1000))}.`,
      });
    } catch (err) {
      return errorResponse(err, 'cloning timesheet', 'Slip');
    }
  },
};

export default cloneTimesheet;
