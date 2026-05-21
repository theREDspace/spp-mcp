// Shared timesheet resolution logic for time entry operations
import type SPPClient from '../../clients/SPPClient';
import { dateContainerToDate, formatISODate } from './dates';

type TimesheetResult =
  | { ok: true; timesheet: any }
  | { ok: false; message: string };

/**
 * Finds the user's OPEN timesheet.
 * If targetDate is provided, the timesheet must cover that date.
 * Otherwise returns the most recent open one.
 */
export async function resolveOpenTimesheet(
  client: SPPClient,
  userId: string,
  targetDate?: Date
): Promise<TimesheetResult> {
  try {
    const timesheets = (await client.list('Timesheet', { userid: userId }, 50, 0) as any[]) || [];

    // Filter to open only
    let open = timesheets.filter((ts: any) => ts.status === 'O');

    // If targetDate provided, filter to timesheets covering that date
    if (targetDate) {
      open = open.filter((ts: any) => isDateInTimesheet(targetDate, ts));
    }

    // Sort by starts DESC (most recent first)
    open.sort((a: any, b: any) => {
      const da = dateContainerToDate(a.starts)?.getTime() ?? 0;
      const db = dateContainerToDate(b.starts)?.getTime() ?? 0;
      return db - da;
    });

    if (!open.length) {
      const hint = targetDate ? ` covering ${formatISODate(targetDate)}` : '';
      return {
        ok: false,
        message: `No open timesheet found for user ${userId}${hint}. Please create one in SPP first.`,
      };
    }

    return { ok: true, timesheet: open[0] };
  } catch (err) {
    return {
      ok: false,
      message: `Error resolving open timesheet: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

/**
 * Finds the most recent COMPLETED (non-open) timesheet.
 * If sourceId is provided, reads that specific timesheet and validates it belongs to userId.
 */
export async function resolveSourceTimesheet(
  client: SPPClient,
  userId: string,
  sourceId?: string
): Promise<TimesheetResult> {
  try {
    // If sourceId provided, read that specific timesheet
    if (sourceId) {
      const ts = (await client.read('Timesheet', sourceId)) as any;
      if (!ts) {
        return { ok: false, message: `Timesheet with ID "${sourceId}" not found.` };
      }
      if (ts.userid !== userId) {
        return { ok: false, message: `Timesheet "${sourceId}" does not belong to user ${userId}.` };
      }
      return { ok: true, timesheet: ts };
    }

    // Otherwise, find the most recent completed timesheet
    const timesheets = (await client.list('Timesheet', { userid: userId }, 50, 0) as any[]) || [];

    // Filter to non-open (submitted, approved, or rejected)
    const completed = timesheets.filter((ts: any) => ts.status !== 'O');

    // Sort by starts DESC
    completed.sort((a: any, b: any) => {
      const da = dateContainerToDate(a.starts)?.getTime() ?? 0;
      const db = dateContainerToDate(b.starts)?.getTime() ?? 0;
      return db - da;
    });

    if (!completed.length) {
      return {
        ok: false,
        message: `No completed timesheets found for user ${userId}. Please submit a timesheet first.`,
      };
    }

    return { ok: true, timesheet: completed[0] };
  } catch (err) {
    return {
      ok: false,
      message: `Error resolving source timesheet: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

/**
 * Ensures a timesheet exists (opens/creates if missing).
 */
const timesheetCache = new Map<string, { ok: true; timesheet: any } | { ok: false; message: string }>();

export async function ensureOpenTimesheet(
  client: SPPClient,
  userId: string,
  targetDate?: Date
): Promise<TimesheetResult> {
  const cacheKey = `${userId}:${targetDate?.toISOString() ?? "default"}`;
if (timesheetCache.has(cacheKey)) {
  return timesheetCache.get(cacheKey)!;
}

try {
  const startDate = new Date(targetDate || new Date());
  startDate.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const created = await client.add("Timesheet", {
    userid: userId,
    status: "O",
    starts: startDate.toISOString(),
    ends: endDate.toISOString(),
  });
  return { ok: true, timesheet: created };
} catch (err) {
  if ((err as Error)?.message?.includes("already exists")) {
    const resolved: TimesheetResult = await resolveOpenTimesheet(client, userId, targetDate);
    if (resolved.ok) {
      timesheetCache.set(cacheKey, resolved);
      return resolved;
}
  return { ok: false, message: `Error ensuring open timesheet: ${err instanceof Error ? err.message : "Unknown error"}` };
  }
}

  try {
    const startDate = new Date(targetDate || new Date());
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const created = await client.add("Timesheet", {
      ...(process.env.MUTEX_ID_ENABLED && { mutex_id: cacheKey.toLowerCase() }),
      userid: userId,
      status: "O",
      starts: startDate.toISOString(),
      ends: endDate.toISOString(),
    });
  const result: TimesheetResult = { ok: true, timesheet: created };
  timesheetCache.set(cacheKey, result);
  return result;
  } catch (err) {
return { ok: false, message: (err as Error)?.message || "Unknown error" };
  }
}

/**
 * Validates that a JS Date falls within a timesheet's starts–ends range.
 */
export function isDateInTimesheet(date: Date, timesheet: any): boolean {
  const starts = dateContainerToDate(timesheet.starts);
  const ends = dateContainerToDate(timesheet.ends);

  if (!starts || !ends) return false;

  // Normalize times to midnight for comparison
  const testDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startDate = new Date(starts.getFullYear(), starts.getMonth(), starts.getDate());
  const endDate = new Date(ends.getFullYear(), ends.getMonth(), ends.getDate());

  return testDate >= startDate && testDate <= endDate;
}
