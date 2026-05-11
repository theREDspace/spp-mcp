import { DateContainer } from "./Timesheet";

export interface ScheduleRequest {
  id: string;
  approval_status: 'O' | 'P' | 'A' | 'R';            
  attachmentid: string;                            
  categoryid: number;                              
  created: DateContainer;                               
  customerid: number;                              
  date: DateContainer;                                   
  date_approved?: DateContainer                         
  date_submitted?: DateContainer;                      
  description?: string;                              
  enddate: DateContainer;                                  
  externalid?: string;                                                                     
  name?: string;                                   
  notes?: string;                                  
  number: number;                                  
  prefix: string;                                  
  project_taskid: string                          
  projectid: string;                               
  startdate: DateContainer;                        
  timetype: 'R' | 'P';                             
  timetypeid: string;                              
  updated: DateContainer;                          
  userid: string;                                  
}