import { DateContainer } from "./Timesheet";

/**
 * A job code is a general job category with a generic cost that can be used for estimation and billing.
 * Supports Add, Read, Modify, Upsert.
 */
export interface Jobcode {
  /** [Read-only] Unique internal ID */
  id: string;
  /** A 1/0 flag indicating if the job code is active */
  active: '1' | '0';
  /** Optional accounting code for external integrations */
  code?: string;
  /** Currency code for monetary values */
  currency: string;
  /** Optional external system record ID */
  externalid?: string;
  /** Loaded cost per hour for this job code */
  loaded_cost: number;
  /** Display name of the job code */
  name: string;
  /** Free-form notes */
  notes?: string;
  /** Internal ID of the generic resource used for FTE forecasting */
  userid_fte?: string;
  /** [Read-only] When the record was created */
  created: DateContainer;
  /** [Read-only] When the record was last updated */
  updated: DateContainer;
}

/** Wrapper returned by callSPPXML for list/read calls */
export interface JobcodeWrapper {
  Jobcode: Jobcode;
}
