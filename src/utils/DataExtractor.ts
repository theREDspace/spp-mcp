// src/clients/SPPClient.ts
import {
SPPErrorDetail,
  SPPAuthError,
  SPPBusinessError
} from "../clients/errors";
import { SPPStatus, SPPStatusInfo } from "./errorCodes";
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
          message: potentialStatusContainer.errors || info.description!
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
}
export default DataExtractor;