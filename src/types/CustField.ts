// src/types/CustField.ts
import { DateContainer } from "./Timesheet";

/**
 * Custom field definition.
 * Supports Read only.
 */
export interface CustField {
  id: string;
  internal_name: string;
  external_id?: string;
  field_type: string;
  label: string;
  active?: '1' | '0';
  association?: string;
  checked?: '1' | '0';
  decpos?: number;
  defnow?: '1' | '0';
  description?: string;
  divider?: '1' | '0';
  divider_text?: string;
  force_unique?: '1' | '0';
  hidden_data_entry?: '1' | '0';
  hint?: string;
  maxlength?: number;
  mover?: '1' | '0';
  name?: string;
  never_copy?: '1' | '0';
  next_seq?: number;
  pick_source?: string;
  picker?: string;
  required?: '1' | '0';
  rows?: number;
  seq?: number;
  size?: number;
  title?: string;
  url?: string;
  userid?: string;
  valuelist?: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface CustFieldWrapper {
  CustField: CustField;
}
