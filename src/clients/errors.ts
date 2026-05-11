/* --------------------------------------------------------------------------
 *  SPP – error classes
 *  --------------------------------------------------------------------------
 *  All SPP-specific exceptions inherit from `SPPApiError`.
 *  We keep them in `src/SPP/` (not in `types/`) because they emit
 *  real JavaScript at runtime and can be `instanceof`-checked.
 * ------------------------------------------------------------------------ */
import { SPPStatus } from "../utils/errorCodes";

export interface SPPErrorDetail {
    code: string | SPPStatus; /** numeric or string code from SPP (or http status) */
    message: string; /** human-readable explanation */
    requestId?: string; /** x-request-id or similar, when the API provides it */
  }
  
  export class SPPApiError extends Error { // Extends built in node class, works with try/catch
    readonly detail: SPPErrorDetail;
  
    constructor(detail: SPPErrorDetail) {
      super(detail.message); // Feeds us Error's built-in 'message' 
      this.name = "SPPApiError";
      this.detail = detail; // Stores full detail object 
  
      // Maintains proper stack trace (only on V8 engines), cleaner logs
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  
  /** Thrown when we cannot obtain or refresh an access-token */
  export class SPPAuthError extends SPPApiError {
    constructor(detail: SPPErrorDetail) {
      super(detail);
      this.name = "SPPAuthError";
    }
  }
  
  /** Thrown for network / axios-level failures (no response body) */
  export class SPPRequestError extends SPPApiError {
    constructor(detail: SPPErrorDetail) {
      super(detail);
      this.name = "SPPRequestError";
    }
  }
  
  /** Thrown when SPP returns a non-zero status or malformed paylSPPd */
  export class SPPResponseError extends SPPApiError {
    constructor(detail: SPPErrorDetail) {
      super(detail);
      this.name = "SPPResponseError";
    }
  }


export class SPPBusinessError extends SPPResponseError {
  readonly statusCode: SPPStatus;
  constructor(statusCode: SPPStatus, detail: SPPErrorDetail) {
    super(detail);
    this.name       = "SPPBusinessError";
    this.statusCode = statusCode;
  }
}
