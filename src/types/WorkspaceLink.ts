// src/types/Workspacelink.ts
import { DateContainer } from "./Timesheet";

export interface Workspacelink {
  id: string;             // [Read-only] Unique ID :contentReference[oaicite:36]{index=36}:contentReference[oaicite:37]{index=37}
  workspaceid: string;    // [Read-only] Workspace ID :contentReference[oaicite:38]{index=38}:contentReference[oaicite:39]{index=39}
  table_name: string;     // [Read-only] Associated table name :contentReference[oaicite:40]{index=40}:contentReference[oaicite:41]{index=41}
  recordid: string;       // [Read-only] Record ID :contentReference[oaicite:42]{index=42}:contentReference[oaicite:43]{index=43}
  external: "1" | "0";    // [Read-only] External link flag :contentReference[oaicite:44]{index=44}:contentReference[oaicite:45]{index=45}
  url?: string;           // [Read-only] External URL :contentReference[oaicite:46]{index=46}:contentReference[oaicite:47]{index=47}
  description?: string;   // [Read-only] Description :contentReference[oaicite:48]{index=48}:contentReference[oaicite:49]{index=49}
  created: DateContainer ;        // [Read-only] Created timestamp :contentReference[oaicite:50]{index=50}:contentReference[oaicite:51]{index=51}
  updated: DateContainer ;        // [Read-only] Last-updated timestamp :contentReference[oaicite:52]{index=52}:contentReference[oaicite:53]{index=53}
}

export interface WorkspacelinkWrapper {
  Workspacelink: Workspacelink;
}
