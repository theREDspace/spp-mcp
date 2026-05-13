// Date/time helpers for MCP tools
import type { DateContainer } from '../../types/Timesheet';

export function dateContainerToDate(dc: DateContainer | null | undefined): Date | null {
  if (!dc?.Date) return null;
  const d = dc.Date;
  try {
    return new Date(d.year, d.month - 1, d.day, d.hour || 0, d.minute || 0, d.second || 0);
  } catch {
    return null;
  }
}

export function getWeekMonday(date: Date, offsetWeeks: number = 0): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - offsetWeeks * 7);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function parseMMDDYYYY(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match || !match[1] || !match[2] || !match[3]) return null;
  try {
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return d;
  } catch {
    return null;
  }
}

export function formatMMDDYYYY(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  return `${m}/${d}/${y}`;
}
