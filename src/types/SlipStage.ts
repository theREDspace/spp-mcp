// src/types/Slipstage.ts
import { DateContainer } from "./Timesheet";
/**
 * A charge stage can be used to classify slips (e.g. Open, Billed, or custom stages).
 * Supports Add, Read, Modify, Upsert. :contentReference[oaicite:50]{index=50}:contentReference[oaicite:51]{index=51} :contentReference[oaicite:52]{index=52}:contentReference[oaicite:53]{index=53}
 */
export interface Slipstage {
  id: string;                       // [Read-only] Unique ID :contentReference[oaicite:54]{index=54}:contentReference[oaicite:55]{index=55}
  name: string;                     // [Required] Name :contentReference[oaicite:56]{index=56}:contentReference[oaicite:57]{index=57}
  notes?: string;                   // Notes :contentReference[oaicite:58]{index=58}:contentReference[oaicite:59]{index=59}
  position?: number;                // Position/order :contentReference[oaicite:60]{index=60}:contentReference[oaicite:61]{index=61}
  enable_slip_tab?: '1' | '0';      // Separate-tab flag :contentReference[oaicite:62]{index=62}:contentReference[oaicite:63]{index=63}
  exclude_from_invoicing?: '1' | '0';// Exclude-from-invoice flag :contentReference[oaicite:64]{index=64}:contentReference[oaicite:65]{index=65}
  created: DateContainer;                  // [Read-only] Created timestamp :contentReference[oaicite:66]{index=66}:contentReference[oaicite:67]{index=67}
  updated: DateContainer;                  // [Read-only] Updated timestamp :contentReference[oaicite:68]{index=68}:contentReference[oaicite:69]{index=69}
}

export interface SlipstageWrapper {
  Slipstage: Slipstage;
}
