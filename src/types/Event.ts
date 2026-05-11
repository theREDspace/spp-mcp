// src/types/Event.ts

import { DateContainer } from "./Timesheet";

/**
 * A historical record of activity (todo, email, call) for a customer/prospect.
 * Supports Add, Read, Modify, Upsert. :contentReference[oaicite:12]{index=12}:contentReference[oaicite:13]{index=13}
 */
export interface Event {
  id: string;
  contactid?: string;
  customerid?: string;
  dealid?: string;
  userid: string;
  name: string;
  notes?: string;
  occurred: DateContainer;
  created: DateContainer;
  updated: DateContainer;
}

export interface EventWrapper {
  Event: Event;
}
