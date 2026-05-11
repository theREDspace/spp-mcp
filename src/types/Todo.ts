// src/types/Todo.ts
import { DateContainer } from "./Timesheet";
/**
 * A to-do item on a deal. Read-only.
 *  
 * XML/SOAP fields: contactid, customerid, dealid, userid, date, start, due, finished, name, notes, priority, status, created, createdbyid, updated. :contentReference[oaicite:5]{index=5}:contentReference[oaicite:6]{index=6}
 */
export interface Todo {
  id: string;
  name: string;
  contactid?: string;
  customerid?: string;
  dealid?: string;
  userid?: string;
  date: DateContainer ;
  start?: DateContainer ;
  due?: DateContainer ;
  finished?: DateContainer ;
  notes?: string;
  priority?: number;
  status?: 'A' | 'C' | 'D' | 'N' | 'W';
  created: DateContainer ;
  createdbyid?: string;
  updated: DateContainer ;
}

export interface TodoWrapper {
  Todo: Todo;
}
