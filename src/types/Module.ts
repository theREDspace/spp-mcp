// --- src/types/Module.ts ---

/**
 * Two-letter code and access flag for a SuiteProjects Pro module.
 */
export interface Module {
  /** Two-letter code representing the module */
  abbr: string;
  /** 1 if the authenticated user can access this module; 0 otherwise */
  enabled: 0 | 1;
}

/**
 * Wrapper returned by the SOAP call, containing one Module and a status string.
 */
export interface ModuleWrapper {
  /** The Module payload */
  Module: Module;
  /** Status of the read operation */
  status: string;
}