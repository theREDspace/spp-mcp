// src/types/WorkscheduleWorkhour.ts
import { DateContainer } from "./Timesheet";

export interface WorkscheduleWorkhour {
  id: string;              // [Read-only] Unique ID :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}
  workscheduleid: string;  // [Read-only] ID of the associated workschedule :contentReference[oaicite:2]{index=2}:contentReference[oaicite:3]{index=3}
  workday: string;         // [Read-only] Day of week '0'–'6' :contentReference[oaicite:4]{index=4}:contentReference[oaicite:5]{index=5}
  workhours: number;       // [Read-only] Number of hours worked :contentReference[oaicite:6]{index=6}:contentReference[oaicite:7]{index=7}
  created: DateContainer ;         // [Read-only] Creation timestamp :contentReference[oaicite:8]{index=8}:contentReference[oaicite:9]{index=9}
  updated: DateContainer ;         // [Read-only] Last-modified timestamp :contentReference[oaicite:10]{index=10}:contentReference[oaicite:11]{index=11}
}

export interface WorkscheduleWorkhourWrapper {
  WorkscheduleWorkhour: WorkscheduleWorkhour;
}
