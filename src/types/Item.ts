// src/types/Item.ts
import { DateContainer } from "./Timesheet";
/**
 * A purchasable good or service category used on receipts and slips.
 * Supports Add, Read, Modify, Delete.
 */
export interface Item {
  id: string;
  name: string;
  active: '1' | '0';
  code?: string;
  currency?: string;
  cost?: number;
  cost_centerid?: string;
  cost_is_fixed?: '1' | '0';
  picklist_label?: string;
  tax_location_id?: string;
  taxable?: '1' | '0';
  tp_comp?: 'ge' | 'gt';
  tp_cost?: number;
  tp_notes_required?: '1' | '0';
  tp_unit_or_total?: 'U' | 'T';
  type?: 'R' | 'M';
  unitm?: string;
  externalid?: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface ItemWrapper {
  Item: Item;
}
