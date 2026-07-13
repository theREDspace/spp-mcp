// src/clients/SPPClient.ts
import {
SPPErrorDetail,
  SPPAuthError,
  SPPBusinessError
} from "../clients/errors";
import { SPPStatus, SPPStatusInfo } from "./errorCodes";

/** Outcome of one <Add>/<Modify>/<Delete> block in an SPP write response. */
export interface WriteBlockResult {
  /** Numeric SPP status for this block (0 = success). */
  status: number;
  /** The unwrapped BO record returned by the block, when present. */
  record?: any;
  /** SPP error text/description for a non-zero status, when derivable. */
  errorMessage?: string | undefined;
}

export class DataExtractor {
  static extractData(response: any): any[] {
    // 1) Auth-block errors (remains the same)
    if (response.Auth && response.Auth["#text"]?.includes("invalid access token")) {
      throw new SPPAuthError({
        code:    SPPStatus.AuthInvalid.toString(),
        message: SPPStatusInfo[SPPStatus.AuthInvalid]?.description || "Invalid access token",
      });
    }
    // 2) Strip off Auth envelope
    let node = { ...response };
    delete node.Auth;
    if (!Object.keys(node).length) return [];
    // --- Status Code Handling ---
    let potentialStatusContainer: any = null;
    // If the initial `node` has a status, use that.
    if (node.status != null) {
      potentialStatusContainer = node;
    } else {
      // Otherwise, try to find the first nested object that might contain a status.
      const topLevelKeys = Object.keys(node);
      if (topLevelKeys.length > 0) {
        const firstKey = topLevelKeys[0]!;
        if (typeof node[firstKey] === 'object' && node[firstKey] !== null) {
          potentialStatusContainer = node[firstKey];
        }
      }
    }
    if (potentialStatusContainer) {
      const rawStatus = potentialStatusContainer.status;
      const status    = typeof rawStatus === "string" ? Number(rawStatus) : rawStatus;
      if (status != null && status !== SPPStatus.Success) {
        // auth invalid
        if (status === SPPStatus.AuthInvalid) {
          throw new SPPAuthError({
            code:    status.toString(),
            message: SPPStatusInfo[SPPStatus.AuthInvalid]?.description || "Invalid token"
          });
        }
        // general business error
        const statusEnum = status as SPPStatus;
        const info       = SPPStatusInfo[statusEnum] || SPPStatusInfo[SPPStatus.UnknownError];
        const detail: SPPErrorDetail = {
          code:    statusEnum.toString(),
          message: (typeof potentialStatusContainer.errors === 'string' && potentialStatusContainer.errors) ? potentialStatusContainer.errors : (info.description ?? 'Unknown SPP error')
        };
        throw new SPPBusinessError(statusEnum, detail);
      }
    }
    // --- End of Status Code Handling ---
    // 3) Drill down until we hit an array or a single-record object
    //    We skip over any ‘status’ keys at each level.
    //    Wrapper nodes (e.g. Read, Modify) typically have a single child object
    //    plus an optional ‘status’. Once we reach a node with multiple non-status
    //    keys or a mix of primitives and objects, we’ve reached the record level.
    while (true) {
      const keys = Object.keys(node).filter(k => k !== "status");
      if (keys.length === 0) break;
      // If there are multiple non-status keys, this is a record — stop drilling
      if (keys.length > 1) break;
      const next = node[keys[0]!];
      // If this is an array of objects, we’re done
      if (Array.isArray(next) && next.every(item => typeof item === "object")) {
        node = next;
        break;
      }
      // If it’s a single object, descend into it (this is a wrapper node)
      if (typeof next === "object" && next !== null) {
        node = next;
        continue;
      }
      // Otherwise stop
      break;
    }
    // 4) At this point `node` is either:
    //    - an array of record objects, or
    //    - a single record object
    const arr = Array.isArray(node) ? node : [node];
    // 5) Handle special flattening cases before returning
    const processedArr = arr.map(item => {
      if (typeof item === 'object' && item !== null) {
        // Flatten all address fields that might have Address wrapper
        const addressFields = ['addr', 'billingaddr', 'contactaddr'];
        addressFields.forEach(field => {
          if (item[field] && typeof item[field] === 'object' && item[field].Address) {
            item[field] = item[field].Address;
          }
        });
      }
      return item;
    });
    
    // 6) Finally, flatten any further nested arrays (just in case)
    return processedArr.flat(Infinity);
  }

  /**
   * Extract per-block results from a write response (<Add>/<Modify>/<Delete>).
   *
   * Unlike `extractData`, this NEVER throws on a business status: SPP executes
   * each write block independently and reports a status per block, so a
   * non-zero status is data about that record, not a request-level failure.
   * (Throwing here is what caused a successful delete to surface as an error
   * while the record was really gone.) Auth failures still throw, since they
   * invalidate the whole request.
   *
   * Blocks are returned in document order, which matches the order the write
   * commands were emitted — callers zip them with their inputs by index.
   */
  static extractWriteResults(response: any, opTags: string[]): WriteBlockResult[] {
    if (response.Auth && response.Auth["#text"]?.includes("invalid access token")) {
      throw new SPPAuthError({
        code:    SPPStatus.AuthInvalid.toString(),
        message: SPPStatusInfo[SPPStatus.AuthInvalid]?.description || "Invalid access token",
      });
    }

    const results: WriteBlockResult[] = [];
    for (const tag of opTags) {
      const raw = response[tag];
      if (raw == null) continue;
      const blocks = Array.isArray(raw) ? raw : [raw];
      for (const block of blocks) {
        if (typeof block !== "object" || block === null) continue;

        const rawStatus = block.status;
        const status = rawStatus == null ? SPPStatus.Success : Number(rawStatus);

        if (status === SPPStatus.AuthInvalid) {
          throw new SPPAuthError({
            code:    status.toString(),
            message: SPPStatusInfo[SPPStatus.AuthInvalid]?.description || "Invalid token",
          });
        }

        // The record (when present) is the single child that isn't status metadata.
        let record: any;
        for (const key of Object.keys(block)) {
          if (key === "status" || key === "errors" || key === "comment") continue;
          record = block[key];
          break;
        }

        let errorMessage: string | undefined;
        if (status !== SPPStatus.Success) {
          const rawErr = block.errors;
          if (typeof rawErr === "string" && rawErr) {
            errorMessage = rawErr;
          } else if (rawErr && typeof rawErr === "object") {
            errorMessage = JSON.stringify(rawErr);
          } else {
            errorMessage =
              SPPStatusInfo[status as SPPStatus]?.description ??
              `SPP write failed with status ${status}`;
          }
        }

        results.push({ status, record, errorMessage });
      }
    }
    return results;
  }
}
export default DataExtractor;