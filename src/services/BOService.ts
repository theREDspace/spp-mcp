import SPPClient from "../clients/SPPClient";
import { XmlBuilder } from "../utils/XmlBuilder";
import type { BORecordMap, Wrapper, WrapperWithStatus } from "./BORecordMap";
import { SPPStatus } from "../utils/errorCodes";
import { SPPResponseError } from "../clients/errors";
import { Logger } from "../utils/Logger.js";

export interface UpdateResult {
  id: string | null; // The ID of the record attempted to delete
  status: string; // 'D' for deleted, '-1' for error, etc.
  errors?: { code: string; comment?: string; text?: string }[]; // Array of error details
}

export interface CreateUserOptions {
  enableCustom?: boolean;
  excludeFlags?: boolean;
  lookup?: string;
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
    let records: BORecordMap[BO][] | BORecordMap[BO] =
      await this.client.callSPPXML<BORecordMap[BO][]>(xml);

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
    let records: BORecordMap[BO][] | BORecordMap[BO] =
      await this.client.callSPPXML<BORecordMap[BO][]>(combinedXml);

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
    id: string
  ): Promise<BORecordMap[BO] | undefined> {
    const results = await this.list(bo, { id }, 1, 0);
    return results[0];
  }

  async add<BO extends keyof BORecordMap>(
    bo: BO,
    payload: Partial<BORecordMap[BO]> | Partial<BORecordMap[BO]>[]
  ): Promise<BORecordMap[BO] | BORecordMap[BO][]> {
    const isArray = Array.isArray(payload);
    const payloads = isArray ? payload : [payload];
    const xml = XmlBuilder.buildAdd(String(bo), payloads);
    const wrappers = await this.client.callSPPXML<Wrapper<BO>>(xml);
    const results = wrappers.map((w) =>
      bo in w ? ((w as any)[bo] as BORecordMap[BO]) : (w as BORecordMap[BO])
    );
    // Return a single object if input was a single object, else return array
    return isArray ? results : results[0];
  }

  async update<BO extends keyof BORecordMap>(
    bo: BO,
    idOrUpdates: string | { id: string; changes: Partial<BORecordMap[BO]> }[],
    changes?: Partial<BORecordMap[BO]>
  ): Promise<BORecordMap[BO] | BORecordMap[BO][]> {
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
    const wrappers = await this.client.callSPPXML<Wrapper<BO>>(xml);
    const results = wrappers.map((w) =>
      bo in w ? ((w as any)[bo] as BORecordMap[BO]) : (w as BORecordMap[BO])
    );
    return isArray ? results : results[0];
  }

  async delete<BO extends keyof BORecordMap>(
    bo: BO,
    ids: string | string[]
  ): Promise<UpdateResult[]> {
    const idsToDelete = Array.isArray(ids) ? ids : [ids];
    let response: any;
    try {
      const xml = XmlBuilder.buildDelete(String(bo), idsToDelete);
      response = await this.client.callSPPXML<any>(xml);
    } catch (err: any) {
      Logger.error('BOService', `Error calling delete for ${bo}:`, err);
      const failResult: UpdateResult = {
        id: "",
        status: "-1",
        errors: [
          {
            code: err.code ?? "CLIENT_ERROR",
            comment: err.message,
            text: err.detail?.message ?? err.message,
          },
        ],
      };
      // mark *all* as failed
      return idsToDelete.map((id) => ({ ...failResult, id }));
    }
    // extract the status object (first element if array)
    const statusObj = Array.isArray(response) ? response[0] : response;
    const codeNum = Number(statusObj.status);
    const succeeded = codeNum === SPPStatus.Success;
    // build a uniform UpdateResult for each ID
    return idsToDelete.map((id) => {
      if (succeeded) {
        return { id, status: "D" };
      }
      // parse any errors into an array form
      const errs: UpdateResult["errors"] = [];
      const rawErr = statusObj.errors;
      if (rawErr) {
        if (Array.isArray(rawErr)) errs.push(...(rawErr as any));
        else if (typeof rawErr === "object") errs.push(rawErr as any);
        else if (typeof rawErr === "string")
          errs.push({ code: codeNum.toString(), text: rawErr });
      } else {
        errs.push({
          code: codeNum.toString(),
          text: `Delete failed with status ${codeNum}`,
          comment: statusObj.comment,
        });
      }
      return { id, status: "-1", errors: errs };
    });
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
