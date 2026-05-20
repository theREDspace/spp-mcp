import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';
import { parseISODate, formatISODate, dateContainerToDate } from '../helpers/dates';

const getBookingSummary: Tool = {
  name: 'get_booking_summary',
  description: 'Summarize a user\'s booked (planned) vs actual hours for a date range, with breakdown by project. Computes total booked/actual/utilization/variance.',
  inputSchema: z.object({
    user_id: z.string().optional().describe('SPP user ID to summarize. Omit to use authenticated user.'),
    start_date: z.string().describe('Start of period (YYYY-MM-DD)'),
    end_date: z.string().describe('End of period (YYYY-MM-DD)'),
  }),
  async handler(args, _ctx) {
    const { user_id, start_date, end_date } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    let realUserId = user_id;
    if (!realUserId) {
      try {
        const user = await client.whoami();
        if (!user?.id) return jsonResponse({ error: 'Unable to resolve current user ID.' });
        realUserId = user.id;
      } catch (err) {
        return errorResponse(err, 'fetching current user for booking summary', 'User');
      }
    }
    // Validate dates
    const startDate = parseISODate(start_date);
    const endDate = parseISODate(end_date);
    if (!startDate || !endDate) return jsonResponse({ error: 'Invalid date format. Use YYYY-MM-DD.' });

    try {
      // Bookings
      const bookingFilter: Record<string, any> = { userid: realUserId };
      const bookings = (await client.list('Booking', bookingFilter, 1000, 0) as any[]) || [];
      // Client-side filter
      const filteredBookings = bookings.filter((b: any) => {
        const bStart = dateContainerToDate(b.startdate);
        const bEnd = dateContainerToDate(b.enddate);
        // Booking overlaps window if any part is in-range
        return bStart && bEnd && bEnd >= startDate && bStart <= endDate;
      });
      // Actuals: Slips (time entries only; limit capped at 1000 — SPP API maximum)
      const slipFilter: Record<string, any> = { userid: realUserId, type: 'T' };
      const slips = (await client.list('Slip', slipFilter, 1000, 0) as any[]) || [];
      const filteredSlips = slips.filter((s: any) => {
        const slipDate = dateContainerToDate(s.transdate || s.date);
        return slipDate && slipDate >= startDate && slipDate <= endDate;
      });
      // Project ID/name lookup (aggregate all projectids)
      const allProjIds = [
        ...new Set([
          ...filteredBookings.map((b: any) => b.projectid),
          ...filteredSlips.map((s: any) => s.projectid),
        ]),
      ].filter(Boolean);
      let projectNames: Record<string, string> = {};
      if (allProjIds.length) {
        try {
          const projs = (await client.batchList('Project', allProjIds.map((id: string) => ({ id })), allProjIds.length, 0)) || [];
          for (const p of projs) {
            if (p?.id) projectNames[p.id] = p.name || p.code || '(unknown project)';
          }
        } catch {}
      }
      // Aggregate
      const byProject: Record<string, { booked: number; actual: number }> = Object.create(null);
      for (const b of filteredBookings) {
        if (!b.projectid) continue;
        const hours = typeof b.hours === 'number' ? b.hours : (typeof b.hours === 'string' ? Number(b.hours) : 0);
        const proj = (byProject[b.projectid] ??= { booked: 0, actual: 0 });
        proj.booked += hours ?? 0;
      }
      for (const s of filteredSlips) {
        if (!s.projectid) continue;
        const hours = typeof s.hours === 'number' ? s.hours : (typeof s.hours === 'string' ? Number(s.hours) : 0);
        const proj = (byProject[s.projectid] ??= { booked: 0, actual: 0 });
        proj.actual += hours ?? 0;
      }
      const outProjects = Object.keys(byProject).map(project_id => ({
        project_id,
        project_name: projectNames[project_id] || null,
        booked_hours: byProject[project_id]?.booked ?? 0,
        actual_hours: byProject[project_id]?.actual ?? 0,
      }));
      const total_booked_hours = outProjects.reduce((sum, x) => sum + x.booked_hours, 0);
      const total_actual_hours = outProjects.reduce((sum, x) => sum + x.actual_hours, 0);
      const utilization_percent = total_booked_hours > 0 ? Math.round((total_actual_hours / total_booked_hours) * 100) : null;
      const variance_hours = total_actual_hours - total_booked_hours;
      return jsonResponse({
        user_id: realUserId,
        period: {
          start_date: formatISODate(startDate),
          end_date: formatISODate(endDate),
        },
        total_booked_hours,
        total_actual_hours,
        utilization_percent,
        variance_hours,
        by_project: outProjects,
      });
    } catch (err) {
      return errorResponse(err, 'booking summary computation', 'Booking/Slip');
    }
  },
};

export default getBookingSummary;
