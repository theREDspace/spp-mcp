// SPPClient API Service - (OAuth2 token passthrough, XML wrapper)
// Usage: construct with { sppUrl, accessToken } — credentials are held by the MCP Client, not this server.

import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { SPPErrorDetail, SPPRequestError, SPPAuthError, SPPResponseError, SPPApiError, SPPBusinessError } from "./errors";
import { SPPStatus, SPPStatusInfo } from "../utils/errorCodes";
import { BORecordMap } from "../services/BORecordMap";
import { BOService, CreateUserOptions } from "../services/BOService";
import { User } from "../types/User";
import { Company } from "../types/Company";
import { XmlBuilder } from "../utils/XmlBuilder";
import DataExtractor from "../utils/DataExtractor";
import { Logger } from "../utils/Logger";

export interface SPPClientOptions {
  sppUrl?: string;
  accessToken?: string;
  onError?: (err: any) => {};
  logging?: boolean | {
    enabled?: boolean;
    level?: 'debug' | 'info' | 'log' | 'warn' | 'error' | 'none';
  };
}

class SPPClient {
  private sppUrl: string;
  private apiUrl: string;
  private accessToken: string | undefined | null;
  private onError: (err: any) => void;

  constructor(options: SPPClientOptions) {
    this.sppUrl = options?.sppUrl || process.env.SPP_URL!;
    if (!this.sppUrl) {
      throw new Error(
        "Missing SPP URL. Please ensure you have passed the SuiteProjects Pro URL in the constructor OR set the SPP_URL environment variable."
      );
    }
    this.apiUrl = `${this.sppUrl}/api.pl`;
    this.accessToken = options?.accessToken ?? null;

    if (options?.onError) {
      this.onError = options.onError;
    } else {
      this.onError = (err: any): void => {
        if (err instanceof SPPApiError) {
          const code = err.detail.code;
          const statusKey = Number(code) as SPPStatus;
          const info =
            statusKey in SPPStatusInfo
              ? SPPStatusInfo[statusKey as SPPStatus]
              : SPPStatusInfo[SPPStatus.UnknownError];
          Logger.error('SPPClient', 'Error:');
          Logger.error('SPPClient', '  Type:      ', err.name);
          Logger.error('SPPClient', '  Code:      ', code);
          Logger.error('SPPClient', '  Meaning:   ', info?.description || 'Unknown error code');
          Logger.error('SPPClient', '  Message:   ', err.detail.message);
          if (err.detail.requestId) {
            Logger.error('SPPClient', '  Request ID:', err.detail.requestId);
          }
          Logger.error('SPPClient', '  Stack:     ', err.stack);
        } else {
          Logger.error('SPPClient', 'Unknown Error:', err);
        }
      };
    }

    if (options?.logging === true) {
      Logger.configure({ enabled: true, level: 'log' });
    } else if (typeof options?.logging === 'object') {
      Logger.configure({
        enabled: options.logging.enabled ?? true,
        level: options.logging.level ?? 'log',
      });
    } else {
      Logger.configure({ enabled: false, level: 'log' });
    }
  }

  setAccessToken(token: string | undefined | null): void {
    this.accessToken = token;
  }

  private _wrapXml(query: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n    <request API_version="1.0" client="Xero Connector" client_ver="1.1" namespace="${process.env.SPP_NAMESPACE}" key="${process.env.SPP_KEY}">\n      <Auth><Login><access_token>__ACCESS_TOKEN__</access_token></Login></Auth>\n      ${query}\n    </request>`;
  }

  async callSPPXML<T = any>(rawXml: string): Promise<T[]> {
    if (!this.accessToken) {
      throw new SPPAuthError({
        code: SPPStatus.AuthInvalid.toString(),
        message:
          SPPStatusInfo[SPPStatus.AuthInvalid]?.description ||
          "Missing access token",
      });
    }

    const wrappedXml = this._wrapXml(rawXml)
      .replace(/__ACCESS_TOKEN__/g, this.accessToken);

    Logger.debug('callSPPXML', 'Sending XML:');
    Logger.debug('callSPPXML', wrappedXml);

    let resp;
    try {
      resp = await axios.post(this.apiUrl, wrappedXml, {
        headers: { "Content-Type": "text/xml; charset=UTF-8" },
      });
    } catch (httpErr: any) {
      Logger.error('callSPPXML', 'HTTP error:', httpErr.message);
      const detail: SPPErrorDetail = {
        code: String(httpErr.response?.status || "NETWORK_ERROR"),
        message: httpErr.message,
        requestId: httpErr.response?.headers["x-request-id"],
      };
      const wrapped = new SPPRequestError(detail);
      this.onError(wrapped);
      throw wrapped;
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });
    Logger.debug('callSPPXML', 'Raw response data:', resp.data);
    const parsed = parser.parse(resp.data);

    // Check for auth failure in SPP XML response — throw so the caller can surface it
    const authNode = parsed.response?.Auth;
    if (authNode?.status !== undefined && authNode.status !== "0") {
      Logger.log('callSPPXML', `Detected Auth.status=${authNode.status} (auth failure)`);
      throw new SPPAuthError({
        code: SPPStatus.AuthInvalid.toString(),
        message: `SPP authentication failed (Auth.status=${authNode.status}). Token may be expired.`,
      });
    }

    try {
      return DataExtractor.extractData(parsed.response) as T[];
    } catch (extractErr: any) {
      const detail: SPPErrorDetail = {
        code: SPPStatus.UnknownError.toString(),
        message: extractErr.message || "Unknown error in extractData()",
      };
      const wrapped = new SPPResponseError(detail);
      this.onError(wrapped);
      throw wrapped;
    }
  }

  /** List records for any Business Object (BO) by name. */
  list<BO extends keyof BORecordMap>(
    bo: BO,
    filter: Record<string, any> = {},
    limit = 1000,
    offset = 0
  ): Promise<BORecordMap[BO][]> {
    return new BOService(this).list(bo, filter, limit, offset);
  }

  batchList<BO extends keyof BORecordMap>(
    bo: BO,
    filter: Record<string, any>[] = [],
    limit = 1000,
    offset = 0
  ): Promise<BORecordMap[BO][]> {
    return new BOService(this).batchList(bo, filter, limit, offset);
  }

  read<BO extends keyof BORecordMap>(
    bo: BO,
    id: string,
    idField: string = 'id'
  ): Promise<BORecordMap[BO] | undefined> {
    return new BOService(this).read(bo, id, idField);
  }

  add<BO extends keyof BORecordMap>(
    bo: BO,
    payload: Partial<BORecordMap[BO]> | Partial<BORecordMap[BO]>[]
  ): Promise<BORecordMap[BO][]> {
    return new BOService(this).add(bo, payload);
  }

  update<BO extends keyof BORecordMap>(
    bo: BO,
    idOrUpdates: string | { id: string; changes: Partial<BORecordMap[BO]> }[],
    changes?: Partial<BORecordMap[BO]>
  ): Promise<BORecordMap[BO] | BORecordMap[BO][]> {
    return new BOService(this).update(bo, idOrUpdates, changes);
  }

  delete<BO extends keyof BORecordMap>(
    bo: BO,
    id: string | string[]
  ): Promise<BORecordMap[BO][]> {
    return new BOService(this).delete(bo, id);
  }

  /**
   * CreateUser command - Adds or Updates a User object
   * Note: OpenAir requires BOTH User and Company objects for CreateUser
   */
  createUser(
    user: Partial<User>,
    company: Partial<Company>,
    options?: CreateUserOptions
  ): Promise<User> {
    return new BOService(this).createUser(user, company, options);
  }

  async whoami(): Promise<User | undefined> {
    const xml = XmlBuilder.buildCustom("<Whoami />");
    const result = await this.callSPPXML<User>(xml);
    return result[0];
  }

  /** Logging controls (static) */
  static enableLogging(): void {
    Logger.enable();
  }

  static disableLogging(): void {
    Logger.disable();
  }

  static setLogLevel(level: 'debug' | 'info' | 'log' | 'warn' | 'error' | 'none'): void {
    Logger.setLevel(level);
  }

  static configureLogging(config: { enabled?: boolean; level?: 'debug' | 'info' | 'log' | 'warn' | 'error' | 'none' }): void {
    Logger.configure(config);
  }
}

export default SPPClient;
