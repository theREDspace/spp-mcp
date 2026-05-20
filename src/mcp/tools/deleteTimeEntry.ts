import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';
import { resolveMe } from '../helpers/resolvers';

const deleteTimeEntry: Tool = {
  name: 'delete_time_entry',
  description:
    'Remove one or more time entries from your timesheet. All entries must belong to the same (open) timesheet — write operations are limited to one week at a time.',
  inputSchema: z.object({
    entry_ids: z
      .union([z.string().min(1), z.array(z.string().min(1)).min(1)])
      .describe('One entry ID or an array of entry IDs to delete. All must belong to the same week/timesheet.'),
  }),
  async handler(args, _ctx) {
    const { entry_ids } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      // Resolve current user
      const resolved = await resolveMe(client);
      if (!resolved.ok) return jsonResponse({ error: resolved.message });
      const userId = resolved.entity.id;

      // Normalize to array
      const idsToDelete = Array.isArray(entry_ids) ? entry_ids : [entry_ids];

      // Verify each entry belongs to user and collect timesheet IDs
      const timesheetIds = new Set<string>();
      for (const id of idsToDelete) {
        const entry = (await client.read('Task', id)) as any;
        if (!entry) {
          return jsonResponse({ error: `Time entry "${id}" not found.` });
        }
        if (entry.userid !== userId) {
          return jsonResponse({ error: `Time entry "${id}" does not belong to you.` });
        }
        if (entry.timesheetid) {
          timesheetIds.add(entry.timesheetid);
        }
      }

      // Enforce single-week policy: all entries must belong to the same timesheet
      if (timesheetIds.size > 1) {
        return jsonResponse({
          error: `Entries span ${timesheetIds.size} different timesheets (${[...timesheetIds].join(', ')}). Write operations are limited to one week at a time — please call delete_time_entry separately for each timesheet.`,
        });
      }

      // Verify the parent timesheet is open
      for (const timesheetId of timesheetIds) {
        const ts = (await client.read('Timesheet', timesheetId)) as any;
        if (!ts) {
          return jsonResponse({ error: `Timesheet "${timesheetId}" not found.` });
        }
        if (ts.status !== 'O') {
          const statusMap: Record<string, string> = { S: 'submitted', A: 'approved', R: 'rejected', X: 'rejected' };
          const status = statusMap[ts.status] || ts.status;
          return jsonResponse({
            error: `Cannot delete entries from a ${status} timesheet. Only open timesheets allow deletions.`,
          });
        }
      }

      // Delete entries (returns UpdateResult[])
      const results = await client.delete('Task', idsToDelete);
      const resultsArray = Array.isArray(results) ? results : [results];

      // Map to response format
      const deletedCount = resultsArray.filter((r: any) => r.status === 'D').length;

      return jsonResponse({
        success: true,
        entries_deleted: deletedCount,
        total_attempted: idsToDelete.length,
        results: resultsArray.map((r: any) => ({
          entry_id: r.id,
          status: r.status === 'D' ? 'deleted' : 'error',
          errors: r.errors,
        })),
        message: `✅ Deleted ${deletedCount} of ${idsToDelete.length} time entries.`,
      });
    } catch (err) {
      return errorResponse(err, 'deleting time entries', 'Task');
    }
  },
};

export default deleteTimeEntry;
