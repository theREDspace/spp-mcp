// Shared slip aggregation logic — groups time entries by project → task → entry
import type SPPClient from '../../clients/SPPClient';
import type { Slip } from '../../types/Slip';
import { dateContainerToDate, formatISODate } from './dates';

export interface SlipEntry {
  date: string;        // ISO YYYY-MM-DD
  hours: number;
  notes: string | null;
}

export interface AggregatedTask {
  task_id: string;
  task_name: string;
  total_hours: number;
  entries: SlipEntry[];
}

export interface AggregatedProject {
  project_id: string;
  project_name: string;
  project_code: string | null;
  total_hours: number;
  tasks: AggregatedTask[];
}

function slipHours(slip: Slip): number {
  const minuteValue = typeof slip.minute === 'number' ? slip.minute : 0;
  return slip.decimal_hours ?? ((slip.hour ?? 0) + minuteValue / 60);
}

function normalizeNote(note: any, maxLen = 200): string | null {
  if (!note || typeof note !== 'string') return null;
  const clean = note.trim();
  if (!clean) return null;
  return clean.length > maxLen ? clean.slice(0, maxLen).trim() + '…' : clean;
}

export async function aggregateSlipsByProject(
  slips: Slip[],
  client: SPPClient
): Promise<AggregatedProject[]> {
  if (!slips.length) return [];

  // Group by project
  const projectMap = new Map<string, { hours: number; tasks: Map<string, { hours: number; entries: SlipEntry[] }> }>();

  for (const slip of slips) {
    const projId = slip.projectid || '(no-project)';
    if (!projectMap.has(projId)) {
      projectMap.set(projId, { hours: 0, tasks: new Map() });
    }
    const proj = projectMap.get(projId)!;
    const hours = slipHours(slip);
    proj.hours += hours;

    if (slip.projecttaskid) {
      if (!proj.tasks.has(slip.projecttaskid)) {
        proj.tasks.set(slip.projecttaskid, { hours: 0, entries: [] });
      }
      const task = proj.tasks.get(slip.projecttaskid)!;
      task.hours += hours;
      const slipDate = dateContainerToDate(slip.date);
      task.entries.push({
        date: slipDate ? formatISODate(slipDate) : 'unknown',
        hours,
        notes: normalizeNote(slip.notes),
      });
    }
  }

  // Batch-fetch projects
  const projectIds = [...projectMap.keys()].filter(id => id !== '(no-project)');
  let projects: any[] = [];
  if (projectIds.length) {
    try {
      projects = (await client.batchList('Project', projectIds.map(id => ({ id })), 1000, 0) as any[]) || [];
    } catch { /* non-fatal */ }
  }
  const projectLookup = new Map<string, { name: string; code: string | null }>();
  for (const p of projects) {
    if (p?.id) projectLookup.set(p.id, { name: p.name || '(unknown project)', code: p.code || null });
  }

  // Batch-fetch tasks
  const taskIds = [...projectMap.values()].flatMap(p => [...p.tasks.keys()]);
  const uniqueTaskIds = [...new Set(taskIds)];
  let projectTasks: any[] = [];
  if (uniqueTaskIds.length) {
    try {
      projectTasks = (await client.batchList('ProjectTask', uniqueTaskIds.map(id => ({ id })), 1000, 0) as any[]) || [];
    } catch { /* non-fatal */ }
  }
  const taskLookup = new Map<string, string>();
  for (const t of projectTasks) {
    if (t?.id) taskLookup.set(t.id, t.name || '(unknown task)');
  }

  // Build result
  const result: AggregatedProject[] = [];
  for (const [projId, projData] of projectMap.entries()) {
    const projInfo = projectLookup.get(projId);
    const tasks: AggregatedTask[] = [];

    for (const [taskId, taskData] of projData.tasks.entries()) {
      // Sort entries by date ascending
      taskData.entries.sort((a, b) => a.date.localeCompare(b.date));
      tasks.push({
        task_id: taskId,
        task_name: taskLookup.get(taskId) || '(unknown task)',
        total_hours: Math.round(taskData.hours * 100) / 100,
        entries: taskData.entries,
      });
    }

    result.push({
      project_id: projId,
      project_name: projInfo?.name || '(unknown project)',
      project_code: projInfo?.code ?? null,
      total_hours: Math.round(projData.hours * 100) / 100,
      tasks,
    });
  }

  return result;
}
