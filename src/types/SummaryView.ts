// src/types/SummaryView.ts

/**
 * SummaryView represents a custom reporting view defined in OpenAir.
 * It is read-only. Supports only Read via method="all" or method="equal to".
 */
export interface SummaryView {
en_approved?: string; // [Read-only] The date when the summary view was last approved.
en_open?: string; // [Read-only] The date when the summary view was last opened.
en_rejected?: string; // [Read-only] The date when the summary view was last rejected.
en_submitted?: string; // [Read-only] The date when the summary view was last submitted.
en_waiting?: string; // [Read-only] The date when the summary view was last in a waiting state.
tm_approved?: string; // [Read-only] The date when the summary view was last approved in the time management context.
tm_open?: string; // [Read-only] The date when the summary view was last opened in the time management context.
tm_rejected?: string; // [Read-only] The date when the summary view was last rejected in the time management context.
tm_submitted?: string; // [Read-only] The date when the summary view was last submitted in the time management context.
tm_waiting?: string; // [Read-only] The date when the summary view was last in a waiting state in the time management context.
}

export interface SummaryViewWrapper {
  SummaryView: SummaryView;
}
