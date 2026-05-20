import { z } from 'zod';
import type { Tool } from './types';
import { getAuthenticatedClient } from '../helpers/auth';
import { jsonResponse, errorResponse } from '../helpers/responses';
import { dateContainerToDate, formatISODate, parseISODate } from '../helpers/dates';

const listBookings: Tool = {
  name: 'list_bookings',
  description:
    'List resource bookings in SPP, optionally filtered by user, project, and date range. Returns booking ID, user, project, dates, hours, and approval status.',
  inputSchema: z.object({
    user_id: z.string().optional().describe('Filter bookings for a specific user ID'),
    project_id: z.string().optional().describe('Filter bookings for a specific project ID'),
    start_date: z.string().optional().describe('Only include bookings starting on or after this date (YYYY-MM-DD)'),
    end_date: z.string().optional().describe('Only include bookings ending on or before this date (YYYY-MM-DD)'),
    limit: z.number().int().min(1).max(1000).optional().default(100),
    offset: z.number().int().min(0).optional().default(0),
  }),
  async handler(args, _ctx) {
    const { user_id, project_id, start_date, end_date, limit, offset } = args;
    const client = getAuthenticatedClient(_ctx?.token);
    if (!client) return jsonResponse({ error: 'No authentication token found in request context.' });

    try {
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (start_date) {
        startDate = parseISODate(start_date);
        if (!startDate) return jsonResponse({ error: `Invalid start_date: "${start_date}". Use YYYY-MM-DD.` });
      }
      if (end_date) {
        endDate = parseISODate(end_date);
        if (!endDate) return jsonResponse({ error: `Invalid end_date: "${end_date}". Use YYYY-MM-DD.` });
      }

      // Booking field names use no underscores for IDs: userid, projectid
      const filter: Record<string, any> = {};
      if (user_id) filter.userid = user_id;
      if (project_id) filter.projectid = project_id;

      const fetchLimit = (startDate || endDate) ? Math.max(limit * 3, 300) : limit;
      const bookings = (await client.list('Booking', filter, fetchLimit, 0) as any[]) || [];

      // Client-side date filter using startdate / enddate fields on Booking
      const filtered = (startDate || endDate)
        ? bookings.filter((b: any) => {
            if (startDate) {
              const d = dateContainerToDate(b.startdate);
              if (!d || d < startDate) return false;
            }
            if (endDate) {
              const d = dateContainerToDate(b.enddate);
              if (!d || d > endDate) return false;
            }
            return true;
          })
        : bookings;

      const page = filtered.slice(offset, offset + limit);

      // Enrich with user names (non-fatal: falls back to null if User BO is inaccessible)
      const userIds = [...new Set(page.map((b: any) => b.userid).filter(Boolean))] as string[];
      const userMap = new Map<string, string>();
      if (userIds.length) {
        try {
          const users = (await client.batchList('User', userIds.map(id => ({ id })), 1000, 0) as any[]) || [];
          for (const u of users) {
            if (!u?.id) continue;
            const addr = u.addr ?? {};
            const name = [addr.first, addr.last].filter(Boolean).join(' ') || u.nickname || null;
            if (name) userMap.set(String(u.id), name);
          }
        } catch { /* non-fatal — return without enrichment */ }
      }

      return jsonResponse({
        bookings: page.map((b: any) => {
          const startDateVal = dateContainerToDate(b.startdate);
          const endDateVal = dateContainerToDate(b.enddate);
          return {
            id: b.id,
            user_id: b.userid || null,
            user_name: userMap.get(String(b.userid)) ?? null,
            project_id: b.projectid || null,
            project_task_id: b.project_taskid || null,
            customer_id: b.customerid || null,
            start_date: startDateVal ? formatISODate(startDateVal) : null,
            end_date: endDateVal ? formatISODate(endDateVal) : null,
            hours: b.hours ?? null,
            percentage: b.percentage ?? null,
            as_percentage: b.as_percentage === '1',
            approval_status: b.approval_status || null,
            booking_type_id: b.booking_typeid || null,
            notes: b.notes || null,
          };
        }),
        count: page.length,
        total_matching: filtered.length,
        limit,
        offset,
      });
    } catch (err) {
      return errorResponse(err, 'listing bookings', 'Booking');
    }
  },
};

export default listBookings;
