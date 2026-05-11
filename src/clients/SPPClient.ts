// SPPClient API Service - (OAuth2, XML wrapper, token refresh)
// Usage: see JSDoc at class bottom or README for config and .env vars

import axios from "axios";
import { XMLParser } from "fast-xml-parser";
// These must exist in your codebase - stubs provided for now, please replace with real implementations.
import { SPPErrorDetail, SPPRequestError, SPPAuthError, SPPResponseError, SPPApiError, SPPBusinessError } from "./errors";
import { SPPStatus, SPPStatusInfo } from "../utils/errorCodes";
import { BORecordMap } from "../services/BORecordMap";
import { BOService, CreateUserOptions } from "../services/BOService";
import { User } from "../types/User";
import { Company } from "../types/Company";
import { XmlBuilder } from "../utils/XmlBuilder";
import DataExtractor from "../utils/DataExtractor";
import { Logger } from "../utils/Logger";

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}
export interface WhoAmIResponse {
  User: User;
}
export interface SPPClientOptions {
  sppUrl?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  callbackUrl?: string;
  onError?: (err: any) => {};
  onRefresh?: (tokens: any) => Promise<void>;
  logging?: boolean | {
    enabled?: boolean;
    level?: 'debug' | 'info' | 'log' | 'warn' | 'error' | 'none';
  };
}

class SPPClient {
  private clientId: string;
  private clientSecret: string;
  private sppUrl: string;
  private apiUrl: string;
  private callbackUrl: string;
  private accessToken: string | undefined | null;
  private refreshToken: string | undefined | null;
  private onRefresh: (tokens: any) => Promise<void> = () => Promise.resolve();
  private onError: (err: any) => void;

  constructor(options: SPPClientOptions) {
    this.sppUrl = options?.sppUrl || process.env.SPP_URL!;
    if (!this.sppUrl) {
      throw new Error(
        "Missing SPP URL. Please ensure you have passed the SuiteProjects Pro URL to your account in the constructor OR make sure you have set the SPP_URL environment variable."
      );
    }
    this.clientId = options?.clientId || process.env.SPP_CLIENT_ID!;
    if (!this.clientId) {
      throw new Error(
        "Missing SPP CLIENT_ID. Please ensure you have passed the client ID to your account in the constructor OR make sure you have set the SPP_CLIENT_ID environment variable."
      );
    }
    this.callbackUrl = options?.callbackUrl || process.env.SPP_CALLBACK_URL!;
    if (!this.callbackUrl) {
      throw new Error(
        "Missing SPP CALLBACK_URL. Please ensure you have passed the callback URL to your account in the constructor OR make sure you have set the SPP_CALLBACK_URL environment variable."
      );
    }
    this.clientSecret = options?.clientSecret || process.env.SPP_CLIENT_SECRET!;
    this.apiUrl = `${this.sppUrl}/api.pl`;
    this.accessToken = options?.accessToken ?? null;
    this.refreshToken = options?.refreshToken ?? null;
    if (options?.onRefresh) {
      this.onRefresh = options.onRefresh;
    }
    //use error enums
    if (options?.onError) {
      this.onError = options.onError;
    } else {
      this.onError = (err: any): void => {
        if (err instanceof SPPApiError) {
          // Look up human-readable info from SPPStatusInfo enum
          const code = err.detail.code;
          const statusKey = Number(code) as SPPStatus;
          //only look up value if number exists in the enum
          const info =
            statusKey in SPPStatusInfo
              ? SPPStatusInfo[statusKey as SPPStatus] // **** Add testing for branch coverage ****
              : SPPStatusInfo[SPPStatus.UnknownError];
          Logger.error('SPPClient', 'Error:');
          Logger.error('SPPClient', '  Type:      ', err.name);
          Logger.error('SPPClient', '  Code:      ', code);
          Logger.error('SPPClient',
            '  Meaning:   ',
            info?.description || 'Unknown error code'
          );
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
    // Configure logger based on options
    // Default: disabled
    // logging: true -> enabled with 'log' level
    // logging: { enabled: true, level: 'debug' } -> full control
    if (options?.logging === true) {
      // Simple enable: logging: true
      Logger.configure({
        enabled: true,
        level: 'log',
      });
    } else if (typeof options?.logging === 'object') {
      // Advanced config: logging: { enabled: true, level: 'debug' }
      Logger.configure({
        enabled: options.logging.enabled ?? true,
        level: options.logging.level ?? 'log',
      });
    } else {
      // Default: logging disabled
      Logger.configure({
        enabled: false,
        level: 'log',
      });
    }
  }
  getAuthUrl(): string {
    // guard against missing configuration
    const missing: string[] = [];
    if (!this.sppUrl) missing.push("sppUrl");
    if (!this.callbackUrl) missing.push("callbackUrl");
    if (!this.clientId) missing.push("clientId");
    //shows which values are missing
    if (missing.length) {
      throw new Error( // **** Add testing for branch coverage ****
        `SPPClient#getAuthUrl(): missing configuration value(s): ${missing.join(
          ", "
        )}`
      );
    }
    return `${this.sppUrl}/login/oauth2/v1/authorize?response_type=code&redirect_uri=${this.callbackUrl}&scope=xml+rest&client_id=${this.clientId}`;
  }
  setAccessToken(token: string | undefined | null): void {
    this.accessToken = token;
  }
  async refreshUserToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const tokenUrl = `${this.sppUrl}/login/oauth2/v1/token`;
    const authHeader = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString("base64");
    try {
      const response = await axios.request({
        method: "POST",
        url: tokenUrl,
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          redirect_uri: this.callbackUrl,
        }).toString(),
      });
      const { access_token, refresh_token } = response.data;
      this.accessToken = access_token;
      this.refreshToken = refresh_token;
      if (this.onRefresh) {
        await this.onRefresh({ access_token, refresh_token });
      }
      return { access_token, refresh_token };
    } catch (e: any) {
      const detail = {
        code: String(e.response?.status || "Unknown"),
        message:
          e.response?.data?.error_description ||
          e.response?.statusText ||
          `Request failed with status code ${e.response?.status}`,
        requestId:
          e.response?.headers?.["x-request-id"] || "Unknown Request ID",
      };
      const error = new SPPRequestError(detail);
      this.onError(error);
      throw error;
    }
  }
  private _wrapXml(query: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n    <request API_version="1.0" client="Xero Connector" client_ver="1.1" namespace="${process.env.SPP_NAMESPACE}" key="${process.env.SPP_KEY}">\n      <Auth><Login><access_token>__ACCESS_TOKEN__</access_token></Login></Auth>\n      ${query}\n    </request>`;
  }
  async callSPPXML<T = any>(rawXml: string, retry = true): Promise<T[]> {
    if (!this.accessToken) {
      throw new SPPAuthError({
        code: SPPStatus.AuthInvalid.toString(),
        message:
          SPPStatusInfo[SPPStatus.AuthInvalid]?.description ||
          "Missing access token",
      });
    }
    // Wrap the raw XML before sending
    const wrappedXml = this._wrapXml(rawXml)
      .replace(/__ACCESS_TOKEN__/g, this.accessToken)
      .replace(/__CLIENT_ID__/g, this.clientId)
      .replace(/__CLIENT_SECRET__/g, this.clientSecret);
    Logger.debug('callSPPXML', 'Sending XML:');
    Logger.debug('callSPPXML', wrappedXml);
    // 1) Send the XML payload
    let resp;
    try {
      resp = await axios.post(this.apiUrl, wrappedXml, {
        headers: { "Content-Type": "text/xml; charset=UTF-8" },
      });
    } catch (httpErr: any) {
      Logger.error('callSPPXML', 'HTTP error:', httpErr.message);
      // HTTP-level retry
      if (httpErr.response?.status === 401 && retry && this.refreshToken) {
        await this.refreshUserToken(this.refreshToken);
        return this.callSPPXML<T>(rawXml, false); // Pass rawXml, not wrappedXml, for retry
      }
      // re-wrap any other HTTP error
      const detail: SPPErrorDetail = {
        code: String(httpErr.response?.status || "NETWORK_ERROR"),
        message: httpErr.message,
        requestId: httpErr.response?.headers["x-request-id"],
      };
      const wrapped = new SPPRequestError(detail);
      this.onError(wrapped);
      throw wrapped;
    }
    // 2) Parse the XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });
    Logger.debug('callSPPXML', 'Raw response data:', resp.data);
    const parsed = parser.parse(resp.data);
    // 3) BUSINESS-LEVEL AUTH RETRY
    const authNode = parsed.response?.Auth;
    if (
      retry &&
      this.refreshToken &&
      authNode?.status !== undefined &&
      authNode.status !== "0"
    ) {
      Logger.log('callSPPXML', `Detected Auth.status=${authNode.status} (auth failure), refreshing…`);
      await this.refreshUserToken(this.refreshToken);
      return this.callSPPXML<T>(rawXml, false); // Pass rawXml, not wrappedXml, for retry
    }
    // 4) Now extract data (and catch any genuine XML/data errors)
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
    id: string
  ): Promise<BORecordMap[BO] | undefined> {
    return new BOService(this).read(bo, id);
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
