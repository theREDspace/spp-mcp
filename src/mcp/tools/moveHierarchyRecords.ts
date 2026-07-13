import type { Tool } from './types';
import SPPClient from '../../clients/SPPClient';
import { ok, fail } from '../helpers/toolResult';
import type { HierarchyNode } from '../../types/HierarchyNode';
import { Logger } from '../../utils/Logger';
import { z } from 'zod';

/** Hard cap on records processed in one call — the move is sequential
 *  (read → add → verify → delete → verify per record), so this bounds runtime. */
const MAX_MOVE_BATCH = 200;

const inputSchema = z.object({
  hierarchyNodeIdFrom: z.string().describe('Source hierarchy node id the records currently sit under.'),
  hierarchyNodeIdTo: z.string().describe('Target hierarchy node id to move the records to. Must belong to the same hierarchy as the source node.'),
  recordIds: z
    .array(z.string())
    .min(1)
    .max(MAX_MOVE_BATCH)
    .optional()
    .describe('Record ids (e.g. User ids) to move. OMIT to move EVERY record currently under the source node — the tool enumerates them itself.'),
  dryRun: z.boolean().optional().describe('If true, report what would be done (including the enumerated record ids) without performing any write.'),
});

type Outcome = 'moved' | 'skipped' | 'partially_moved' | 'failed' | 'planned';

interface MoveResult {
  recordId: string;
  outcome: Outcome;
  oldAssociationIds: string[];
  newAssociationId: string | null;
  errors?: string[];
  note?: string;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function listAssociations(
  sppClient: SPPClient,
  filter: Record<string, any>,
  limit = 1000,
  offset = 0
): Promise<HierarchyNode[]> {
  const rows = await sppClient.list('HierarchyNode', filter, limit, offset);
  return rows as HierarchyNode[];
}

/**
 * Enumerate every record id currently under the given node. The SPP list
 * endpoint has been observed returning unstable subsets for the same filter,
 * so a single listing cannot be trusted for "all": we sweep repeatedly and
 * union the results until two consecutive sweeps agree (max 3 sweeps).
 */
async function enumerateRecordIds(sppClient: SPPClient, nodeId: string): Promise<string[]> {
  const sweep = async (): Promise<Set<string>> => {
    const found = new Set<string>();
    const pageSize = 500;
    // A page shorter than pageSize means we've reached the end.
    // (parentid filters return association rows AND child sub-nodes — only
    // rows with a real recordid are memberships.)
    for (let offset = 0; ; offset += pageSize) {
      const rows = await listAssociations(sppClient, { parentid: nodeId }, pageSize, offset);
      for (const row of rows) {
        if (row.recordid && String(row.recordid) !== '0') found.add(String(row.recordid));
      }
      if (rows.length < pageSize) break;
    }
    return found;
  };

  const union = new Set<string>();
  let previousSize = -1;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await sweep();
    for (const id of result) union.add(id);
    if (union.size === previousSize) break; // two consecutive sweeps agree
    previousSize = union.size;
  }
  return [...union];
}

const moveHierarchyRecords: Tool = {
  name: 'move_hierarchy_records',
  description:
    'Move records (e.g. Users) from one hierarchy node to another within the same hierarchy. ' +
    'Hierarchy membership in SuiteProjects Pro is stored as HierarchyNode association rows (parentid = node id, recordid = record id) ' +
    'and SPP does not allow updating an association in place, so this tool performs the move safely: ' +
    'it CREATES the new association first, VERIFIES it by reading it back, and only then deletes the old one — a failure can leave a record under both nodes but never under none. ' +
    'Omit recordIds to move EVERY record currently under the source node. ' +
    'The tool is idempotent: re-run it after a partial failure and it resumes (already-moved records report "skipped"); for full-node moves, re-run until a pass reports moved=0. ' +
    'Use dryRun:true first to preview exactly what will be moved.',
  inputSchema,
  handler: async (
    { hierarchyNodeIdFrom, hierarchyNodeIdTo, recordIds, dryRun = false }: {
      hierarchyNodeIdFrom: string;
      hierarchyNodeIdTo: string;
      recordIds?: string[];
      dryRun?: boolean;
    },
    { sppClient }: { sppClient: SPPClient }
  ) => {
    // ── PREFLIGHT ─────────────────────────────────────────────────────────
    if (hierarchyNodeIdFrom === hierarchyNodeIdTo) {
      return fail(new Error('Source and target hierarchy nodes are the same.'));
    }

    const [toRows, fromRows] = await Promise.all([
      listAssociations(sppClient, { id: hierarchyNodeIdTo }),
      listAssociations(sppClient, { id: hierarchyNodeIdFrom }),
    ]);
    const toNode = toRows[0];
    const fromNode = fromRows[0];
    if (!toNode) return fail(new Error(`Target hierarchy node ${hierarchyNodeIdTo} not found.`));
    if (!fromNode) return fail(new Error(`Source hierarchy node ${hierarchyNodeIdFrom} not found.`));
    if (String(toNode.is_a_node) !== '1') {
      return fail(new Error(`Target ${hierarchyNodeIdTo} is not a node (is_a_node=${toNode.is_a_node}).`));
    }
    if (String(toNode.hierarchyid) !== String(fromNode.hierarchyid)) {
      return fail(new Error(
        `Source and target nodes belong to different hierarchies (${fromNode.hierarchyid} vs ${toNode.hierarchyid}); cross-hierarchy moves are not supported.`
      ));
    }
    const hierarchyId = String(toNode.hierarchyid);

    // ── ENUMERATE (when recordIds omitted) ────────────────────────────────
    let targets = recordIds;
    let enumerated: number | undefined;
    let truncated = false;
    if (!targets) {
      const all = await enumerateRecordIds(sppClient, hierarchyNodeIdFrom);
      enumerated = all.length;
      if (all.length > MAX_MOVE_BATCH) {
        truncated = true;
        targets = all.slice(0, MAX_MOVE_BATCH);
      } else {
        targets = all;
      }
      if (targets.length === 0) {
        return ok({
          ok: true,
          hierarchyId,
          from: hierarchyNodeIdFrom,
          to: hierarchyNodeIdTo,
          enumerated: 0,
          results: [],
          summary: { moved: 0, skipped: 0, partiallyMoved: 0, failed: 0 },
          note: 'No records found under the source node.',
        });
      }
    }

    // ── PER RECORD (sequential; one failure does not stop the rest) ──────
    const results: MoveResult[] = [];
    for (const recordId of targets) {
      const result: MoveResult = {
        recordId,
        outcome: 'failed',
        oldAssociationIds: [],
        newAssociationId: null,
      };
      results.push(result);

      try {
        // Targeted filters (parentid + recordid) are order-independent, unlike
        // full child listings — this is the source of truth for verification.
        const [targetAssocs, oldAssocs] = await Promise.all([
          listAssociations(sppClient, { parentid: hierarchyNodeIdTo, recordid: recordId }),
          listAssociations(sppClient, { parentid: hierarchyNodeIdFrom, recordid: recordId }),
        ]);
        result.oldAssociationIds = oldAssocs.map((a) => String(a.id));
        const existingTarget = targetAssocs[0];
        if (existingTarget) result.newAssociationId = String(existingTarget.id);

        if (existingTarget && oldAssocs.length === 0) {
          result.outcome = 'skipped';
          result.note = 'Already under the target node.';
          continue;
        }
        if (!existingTarget && oldAssocs.length === 0) {
          result.outcome = 'failed';
          result.errors = ['Record is not under the source node (and not under the target node either).'];
          continue;
        }

        if (dryRun) {
          result.outcome = 'planned';
          result.note = existingTarget
            ? `Would delete stale association(s) ${result.oldAssociationIds.join(', ')} (target association already exists — resuming a previous partial move).`
            : `Would create a new association under node ${hierarchyNodeIdTo}, verify it, then delete association(s) ${result.oldAssociationIds.join(', ')}.`;
          continue;
        }

        // ── ADD (unless resuming a previous partial move) ──────────────
        if (!existingTarget) {
          const template = oldAssocs[0]!;
          const payload: Partial<HierarchyNode> = {
            hierarchyid: hierarchyId,
            parentid: hierarchyNodeIdTo,
            recordid: recordId,
            is_a_level: template.is_a_level ?? '0',
            is_a_node: template.is_a_node ?? '0',
            levelid: template.levelid != null ? String(template.levelid) : '0',
          };
          if (template.name) payload.name = template.name;

          try {
            await sppClient.add('HierarchyNode', payload);
          } catch (e) {
            result.outcome = 'failed';
            result.errors = [`Creating the new association failed — record untouched, still under the source node: ${errMsg(e)}`];
            continue;
          }

          // VERIFY-ADD by read-back — write statuses have misreported before,
          // so the read is authoritative. Do NOT delete anything unverified.
          const verifyAdd = await listAssociations(sppClient, {
            parentid: hierarchyNodeIdTo,
            recordid: recordId,
          });
          const created = verifyAdd[0];
          if (!created) {
            result.outcome = 'failed';
            result.errors = ['New association did not appear on read-back after Add — record untouched, old association NOT deleted. Re-run to retry.'];
            continue;
          }
          result.newAssociationId = String(created.id);
        }

        // ── DELETE OLD ASSOCIATION(S), verifying each ───────────────────
        const staleIds: string[] = [];
        const deleteErrors: string[] = [];
        for (const oldAssoc of oldAssocs) {
          const oldId = String(oldAssoc.id);
          try {
            await sppClient.delete('HierarchyNode', oldId);
          } catch (e) {
            // The write status has misreported before — fall through to the
            // read-back below, which decides whether the row is really gone.
            deleteErrors.push(`Delete of association ${oldId} reported: ${errMsg(e)}`);
          }
          const verifyDelete = await listAssociations(sppClient, { id: oldId });
          if (verifyDelete.length > 0) staleIds.push(oldId);
        }

        if (staleIds.length > 0) {
          result.outcome = 'partially_moved';
          result.errors = deleteErrors;
          result.note =
            `Record is under BOTH nodes: new association ${result.newAssociationId} exists but old association(s) ${staleIds.join(', ')} could not be removed. ` +
            'Re-run this tool to resume, or delete the stale association ids manually.';
          continue;
        }

        result.outcome = 'moved';
        if (deleteErrors.length > 0) {
          // Delete reported an error but read-back confirmed the row is gone.
          result.note = `Delete reported an error but read-back confirmed removal (${deleteErrors.join('; ')}).`;
        }
      } catch (e) {
        result.outcome = 'failed';
        result.errors = [...(result.errors ?? []), errMsg(e)];
        Logger.error('moveHierarchyRecords', `record ${recordId}:`, e);
      }
    }

    const summary = {
      moved: results.filter((r) => r.outcome === 'moved').length,
      skipped: results.filter((r) => r.outcome === 'skipped').length,
      partiallyMoved: results.filter((r) => r.outcome === 'partially_moved').length,
      failed: results.filter((r) => r.outcome === 'failed').length,
      planned: results.filter((r) => r.outcome === 'planned').length,
    };

    return ok({
      ok: results.every((r) => r.outcome === 'moved' || r.outcome === 'skipped' || r.outcome === 'planned'),
      dryRun,
      hierarchyId,
      from: hierarchyNodeIdFrom,
      to: hierarchyNodeIdTo,
      ...(enumerated !== undefined ? { enumerated } : {}),
      ...(truncated
        ? { truncated: true, note: `Source node has ${enumerated} records; only the first ${MAX_MOVE_BATCH} were processed this call. Re-run to continue (already-moved records are skipped).` }
        : {}),
      results,
      summary,
    });
  },
};

export default moveHierarchyRecords;
