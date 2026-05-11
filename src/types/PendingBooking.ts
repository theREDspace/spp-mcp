
import { DateContainer } from './Timesheet.js';

export interface PendingBooking {
  id: string;                             // [Read-only] 
  approval_status: 'O'|'S'|'A'|'R';       // Open, Submitted, Approved, Rejected 
  as_percentage: 0|1;                     // 1=percentage used, 0=hours used 
  bookingtype_id?: string;             
  customerid?: string;                 
  date_submitted?: DateContainer;       
  date_approved?: DateContainer;        
  startdate: DateContainer;             
  enddate?: DateContainer;              
  hours?: number;                       
  percentage?: number;                  
  projectid?: string;                  
  project_task_id?: string;             
  notes?: string;                       
  created: DateContainer;                 // [Read-only]  
  updated: DateContainer;                 // [Read-only]  
  dirty: '0'|'1'|'2';                     // 1=dirty, 0=clean 2=almost clean
  endtime?: string;                     // Optional, if not set, the end time is assumed to be the end of the day
  externalid?: string;                // Optional external system ID
  job_codeid?: string;                // Optional job code ID
  locationid?: string;                // Optional location ID
  notify_owner?: '1'|'0';             // Optional, if set to 1, the owner will be notified of changes
  ownerid?: string;                   // Optional owner ID
  project_assignment_profileid?: string; // Optional project assignment profile ID
  repeatid?: string;                // Optional repeat ID
  resource_request_queue_id?: string; // Optional resource request queue ID
  starttime?: string; // Optional start time
  userid: string; // User ID of the person who created the booking
}

export interface PendingBookingWrapper {
  PendingBooking: PendingBooking;
  status: string;
}