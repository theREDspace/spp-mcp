// src/types/Term.ts

/**
 * A term is a custom label used in company settings.
 * Read-only (supports only Read).
 */
export interface Term {
  /** [Read-only] Display text of the term */
  display: string;
  /** [Read-only] Internal name of the term */
  name: string;
}

export interface TermWrapper {
  Term: Term;
}
