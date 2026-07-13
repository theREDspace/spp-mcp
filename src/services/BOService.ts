import SPPClient from "../clients/SPPClient";
import { XmlBuilder } from "../utils/XmlBuilder";
import type { BORecordMap, Wrapper, WrapperWithStatus } from "./BORecordMap";
import { SPPStatus, SPPStatusInfo } from "../utils/errorCodes";
import { SPPBusinessError, SPPResponseError } from "../clients/errors";
import { DataExtractor, WriteBlockResult } from "../utils/DataExtractor";
import { Logger } from "../utils/Logger";

export interface UpdateResult {
  id: string | null; // The ID of the record attempted to delete
  status: string; // 'D' for deleted, '-1' for error, etc.
  errors?: { code: string; comment?: string; text?: string }[]; // Array of error details
}

/** Per-record outcome of a (possibly multi-record) write operation. */
export interface WriteResult<T = any> {
  /** Input id (update/delete) or the created record's id (add), when known. */
  id: string | null;
  /** Whether SPP reported success for this record. */
  ok: boolean;
  /** SPP status code as a string ('0' = success; delete success keeps 'D' for back-compat). */
  status: string;
  /** The record returned by SPP for this block, when present. */
  record?: T | undefined;
  errors?: { code: string; comment?: string; text?: string }[];
}

export interface CreateUserOptions {
  enableCustom?: boolean;
  excludeFlags?: boolean;
  lookup?: string;
}

/**
 * SPP returns code "1" (UnknownError) for many cases that are really just
 * "no records matched" or "the record you queried isn't visible to this user".
 * In list/read contexts we want to treat these as "empty result" rather than
 * propagating an exception that would surface to MCP clients as a hard error.
 *
 * NOTE: We do NOT swallow auth errors here — those still need to bubble up so
 * the client can prompt the user to re-authenticate.
 */
const NOT_FOUND_CODES: Set<string> = new Set([
  String(SPPStatus.UnknownError),  // "1" — SPP commonly returns this for "not found"
  String(SPPStatus.NotFound),       // "601"
  String(SPPStatus.LookupNotLocated), // "910"
]);

function isNotFoundError(err: unknown): boolean {
  if (err instanceof SPPResponseError) {
    const code = String(err.detail?.code ?? '');
    return NOT_FOUND_CODES.has(code);
  }
  return false;
}

export class BOService {
  constructor(protected client: SPPClient) {}

  async list<BO extends keyof BORecordMap>(
    bo: BO,
    filter: Record<string, any> = {},
    limit = 1000,
    offset = 0,
    method:
      | "equal to"
      | "not equal to"
      | "all"
      | "newer-than"
      | "older-than" = "equal to"
  ): Promise<BORecordMap[BO][]> {
    const xml = XmlBuilder.buildGet(String(bo), filter, limit, offset, method);

    // Parse the XML response into wrapper objects
    let records: BORecordMap[BO][] | BORecordMap[BO];
    try {
      records = await this.client.callSPPXML<BORecordMap[BO][]>(xml);
    } catch (err) {
      // SPP returns "not found" as an exception even when it's really "no matches".
      // Convert to an empty result so callers don't have to special-case it.
      if (isNotFoundError(err)) {
        Logger.debug('BOService', `list(${String(bo)}): SPP reported not-found, returning [] (filter=${JSON.stringify(filter)})`);
        return [];
      }
      throw err;
    }

    // Normalize to array
    if (records == null) {
      return [];
    }
    if (!Array.isArray(records)) {
      records = [records as BORecordMap[BO]];
    }

    return records;
  }

  async batchList<BO extends keyof BORecordMap>(
    bo: BO,
    filter: Record<string, any>[] = [],
    limit = 1000,
    offset = 0,
    method:
      | "equal to"
      | "not equal to"
      | "all"
      | "newer-than"
      | "older-than" = "equal to"
  ): Promise<BORecordMap[BO][]> {
    // Concatenate all individual XML queries into a single string
    const combinedXml = filter
      .map((curr) =>
        XmlBuilder.buildGet(String(bo), curr, limit, offset, method)
      )
      .join("\n"); // Join with a newline for readability in the XML, if needed

    // Send the combined XML as a single request
    let records: BORecordMap[BO][] | BORecordMap[BO];
    try {
      records = await this.client.callSPPXML<BORecordMap[BO][]>(combinedXml);
    } catch (err) {
      if (isNotFoundError(err)) {
        Logger.debug('BOService', `batchList(${String(bo)}): SPP reported not-found, returning []`);
        return [];
      }
      throw err;
    }

    // Normalize to array
    if (records == null) {
      return [];
    }
    if (!Array.isArray(records)) {
      records = [records as BORecordMap[BO]];
    }

    return records;
  }

  async read<BO extends keyof BORecordMap>(
    bo: BO,
    id: string,
    idField: string = 'id'
  ): Promise<BORecordMap[BO] | undefined> {
    const results = await this.list(bo, { [idField]: id }, 1, 0);
    return results[0];
  }

  /**
   * Turn one parsed write block into a per-record result, zipped with the
   * caller's input id. A missing block (SPP returned fewer blocks than we sent
   * commands) is reported as a failure rather than assumed successful.
   *
   * Blocks are matched to inputs positionally (document order) — SPP doesn't
   * echo a correlation id, so if it ever returned blocks in a different order
   * or count than requested, a status could get misattributed to the wrong
   * record. Modify/Add success blocks do echo the record id, so when we have
   * an expected id (update) we cross-check it against the block's and refuse
   * to report success on a mismatch rather than silently trusting position.
   */
  private static toWriteResult<T>(
    block: WriteBlockResult | undefined,
    inputId: string | null,
    successStatus = "0"
  ): WriteResult<T> {
    if (!block) {
      return {
        id: inputId,
        ok: false,
        status: String(SPPStatus.UnknownError),
        errors: [
          {
            code: String(SPPStatus.UnknownError),
            text: "SPP returned no response block for this record",
          },
        ],
      };
    }
    if (block.status === SPPStatus.Success) {
      const record = block.record as T | undefined;
      const recordId = (record as any)?.id != null ? String((record as any).id) : null;
      if (inputId != null && recordId != null && recordId !== inputId) {
        return {
          id: inputId,
          ok: false,
          status: String(SPPStatus.UnknownError),
          record,
          errors: [
            {
              code: "ID_MISMATCH",
              text: `Response block at this position echoed id ${recordId}, expected ${inputId} — response order may not match the request, so this result is not trusted`,
            },
          ],
        };
      }
      return { id: inputId ?? recordId, ok: true, status: successStatus, record };
    }
    return {
      id: inputId,
      ok: false,
      status: String(block.status),
      record: block.record as T | undefined,
      errors: [
        {
          code: String(block.status),
          text:
            block.errorMessage ??
            SPPStatusInfo[block.status as SPPStatus]?.description ??
            `SPP write failed with status ${block.status}`,
        },
      ],
    };
  }

  /** Throw the classified SPP error for a failed single-record write. */
  private static throwWriteError(result: WriteResult, operation: string): never {
    const code = Number(result.status);
    throw new SPPBusinessError(code as SPPStatus, {
      code: result.status,
      message:
        result.errors?.[0]?.text ??
        `SPP ${operation} failed with status ${result.status}`,
    });
  }

  async add<BO extends keyof BORecordMap>(
    bo: BO,
    payload: Partial<BORecordMap[BO]>
  ): Promise<BORecordMap[BO]>;
  async add<BO extends keyof BORecordMap>(
    bo: BO,
    payload: Partial<BORecordMap[BO]>[]
  ): Promise<WriteResult<BORecordMap[BO]>[]>;
  async add<BO extends keyof BORecordMap>(
    bo: BO,
    payload: Partial<BORecordMap[BO]> | Partial<BORecordMap[BO]>[]
  ): Promise<BORecordMap[BO] | WriteResult<BORecordMap[BO]>[]> {
    const isArray = Array.isArray(payload);
    const payloads = isArray ? payload : [payload];
    const xml = XmlBuilder.buildAdd(String(bo), payloads);
    const response = await this.client.callSPPXMLParsed(xml);
    const blocks = DataExtractor.extractWriteResults(response, ["Add"]);
    const results = payloads.map((_, i) =>
      BOService.toWriteResult<BORecordMap[BO]>(blocks[i], null)
    );

    if (isArray) return results;
    // Single-record contract: return the record on success, throw on failure.
    const [result] = results;
    if (!result!.ok) BOService.throwWriteError(result!, "add");
    return result!.record as BORecordMap[BO];
  }

  async update<BO extends keyof BORecordMap>(
    bo: BO,
    id: string,
    changes: Partial<BORecordMap[BO]>
  ): Promise<BORecordMap[BO]>;
  async update<BO extends keyof BORecordMap>(
    bo: BO,
    updates: { id: string; changes: Partial<BORecordMap[BO]> }[]
  ): Promise<WriteResult<BORecordMap[BO]>[]>;
  async update<BO extends keyof BORecordMap>(
    bo: BO,
    idOrUpdates: string | { id: string; changes: Partial<BORecordMap[BO]> }[],
    changes?: Partial<BORecordMap[BO]>
  ): Promise<BORecordMap[BO] | WriteResult<BORecordMap[BO]>[]> {
    let updates: { id: string; changes: Partial<BORecordMap[BO]> }[];
    let isArray: boolean;

    if (Array.isArray(idOrUpdates)) {
      updates = idOrUpdates;
      isArray = true;
    } else {
      if (!changes) throw new Error("Missing changes for single update.");
      updates = [{ id: idOrUpdates, changes }];
      isArray = false;
    }

    const xml = XmlBuilder.buildUpdate(String(bo), updates);
    const response = await this.client.callSPPXMLParsed(xml);
    const blocks = DataExtractor.extractWriteResults(response, ["Modify"]);
    const results = updates.map((u, i) =>
      BOService.toWriteResult<BORecordMap[BO]>(blocks[i], u.id)
    );

    if (isArray) return results;
    const [result] = results;
    if (!result!.ok) BOService.throwWriteError(result!, "update");
    return result!.record as BORecordMap[BO];
  }

  async delete<BO extends keyof BORecordMap>(
    bo: BO,
    ids: string
  ): Promise<WriteResult[]>;
  async delete<BO extends keyof BORecordMap>(
    bo: BO,
    ids: string[]
  ): Promise<WriteResult[]>;
  async delete<BO extends keyof BORecordMap>(
    bo: BO,
    ids: string | string[]
  ): Promise<WriteResult[]> {
    const isArray = Array.isArray(ids);
    const idsToDelete = isArray ? ids : [ids];

    // Transport/auth/build errors propagate — fabricating per-record failure
    // results here would hide the real error class (and, worse, could report
    // failure for a delete SPP actually performed).
    const xml = XmlBuilder.buildDelete(String(bo), idsToDelete);
    const response = await this.client.callSPPXMLParsed(xml);
    const blocks = DataExtractor.extractWriteResults(response, ["Delete"]);
    const results = idsToDelete.map((id, i) =>
      // 'D' kept as the delete success marker for back-compat with UpdateResult.
      BOService.toWriteResult(blocks[i], id, "D")
    );

    if (!isArray) {
      const [result] = results;
      if (!result!.ok) BOService.throwWriteError(result!, "delete");
    }
    return results;
  }

  // ─── CREATE USER ──────────────────────────────────────────────────
  async createUser(
    user: Record<string, any>,
    company?: Record<string, any>,
    options: CreateUserOptions = {}
  ): Promise<any> {
    // Ensure company object exists - required for CreateUser API
    const companyObj = company || { nickname: "Default" };

    const xml = XmlBuilder.buildCreateUser(user, companyObj, options);
    const result = await this.client.callSPPXML<any>(xml);

    // Return the first result (CreateUser typically returns a single user)
    return Array.isArray(result) ? result[0] : result;
  }
}
