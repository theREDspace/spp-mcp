/**
 * Fetches human-readable labels for SPP project stage IDs.
 *
 * SPP stores the current stage of a project as a numeric `project_stageid`.
 * The `ProjectStage` BO holds the mapping from ID → name.
 *
 * The list of stages is static configuration that rarely changes, so we cache
 * it process-wide for a short TTL to avoid an extra round trip on every
 * project read.  Failures are non-fatal; callers fall back to the numeric ID
 * when the map is empty.
 */
import type SPPClient from '../../clients/SPPClient';

const STAGE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface StageCacheEntry {
  map: Map<string, string>;
  expiresAt: number;
}

// Module-level cache shared across all callers in this process
let stageCache: StageCacheEntry | null = null;

/**
 * Resolve a set of stage IDs to names.
 *
 * @param client    - authenticated SPPClient instance
 * @param _stageIds - hint of which IDs the caller needs; currently unused because
 *                    the ProjectStage list is small and we always fetch the full
 *                    set, but kept in the signature so a future implementation
 *                    could batch lookups if SPP added many stages.
 * @returns Map<string, string>  stageId → stageName
 */
export async function resolveProjectStages(
  client: SPPClient,
  _stageIds: Set<string | number>
): Promise<Map<string, string>> {
  // Serve from cache when fresh
  if (stageCache && stageCache.expiresAt > Date.now()) {
    return stageCache.map;
  }

  const map = new Map<string, string>();
  try {
    // Fetch all stages — the list is small (typically <20 entries)
    const stages = (await client.list('ProjectStage', {}, 200, 0) as any[]) || [];
    for (const s of stages) {
      if (s?.id != null) {
        map.set(String(s.id), s.name || s.label || String(s.id));
      }
    }
    // Only cache non-empty successful fetches so a transient failure doesn't
    // poison the cache for 5 minutes.
    if (map.size > 0) {
      stageCache = { map, expiresAt: Date.now() + STAGE_CACHE_TTL_MS };
    }
  } catch {
    // Non-fatal — caller will fall back to raw numeric ID
  }
  return map;
}

/** Reset the cache (intended for tests). */
export function clearProjectStageCache(): void {
  stageCache = null;
}
