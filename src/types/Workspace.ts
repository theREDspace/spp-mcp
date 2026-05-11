// src/types/Workspace.ts
import { DateContainer } from "./Timesheet";

export interface Workspace {
  id: string;             // [Read-only] Unique ID :contentReference[oaicite:12]{index=12}:contentReference[oaicite:13]{index=13}
  name: string;           // [Required] Name :contentReference[oaicite:14]{index=14}:contentReference[oaicite:15]{index=15}
  description?: string;   // Description :contentReference[oaicite:16]{index=16}:contentReference[oaicite:17]{index=17}
  date: DateContainer ;           // [Required] Date :contentReference[oaicite:18]{index=18}:contentReference[oaicite:19]{index=19}
  allow_guests: "1" | "0";     // Guests allowed :contentReference[oaicite:20]{index=20}:contentReference[oaicite:21]{index=21}
  open: "1" | "0";             // Open flag :contentReference[oaicite:22]{index=22}:contentReference[oaicite:23]{index=23}
  global: "1" | "0";           // Global workspace :contentReference[oaicite:24]{index=24}:contentReference[oaicite:25]{index=25}
  global_access?: "R" | "W" | "A"; // Access perms if global=1 :contentReference[oaicite:26]{index=26}:contentReference[oaicite:27]{index=27}
  notes?: string;          // Notes :contentReference[oaicite:28]{index=28}:contentReference[oaicite:29]{index=29}
  userid: string;          // [Required] Owner user ID :contentReference[oaicite:30]{index=30}:contentReference[oaicite:31]{index=31}
  created: DateContainer ;         // [Read-only] Created timestamp :contentReference[oaicite:32]{index=32}:contentReference[oaicite:33]{index=33}
  updated: DateContainer ;         // [Read-only] Last-updated timestamp :contentReference[oaicite:34]{index=34}:contentReference[oaicite:35]{index=35}
}

export interface WorkspaceWrapper {
  Workspace: Workspace;
}
