// src/types/Workspaceuser.ts
import { DateContainer } from "./Timesheet";

export interface Workspaceuser {
  id: string;               // [Read-only] Unique ID :contentReference[oaicite:54]{index=54}:contentReference[oaicite:55]{index=55}
  workspaceid: string;      // [Required] Workspace ID :contentReference[oaicite:56]{index=56}:contentReference[oaicite:57]{index=57}
  userid?: string;          // [Mutually exclusive with projectgroupid] User ID :contentReference[oaicite:58]{index=58}:contentReference[oaicite:59]{index=59}
  projectgroupid?: string;  // [Mutually exclusive with userid] Project‐group ID :contentReference[oaicite:60]{index=60}:contentReference[oaicite:61]{index=61}
  access: "R" | "W" | "A";   // Permissions :contentReference[oaicite:62]{index=62}:contentReference[oaicite:63]{index=63}
  created: DateContainer ;          // [Read-only] Created timestamp :contentReference[oaicite:64]{index=64}:contentReference[oaicite:65]{index=65}
  updated: DateContainer ;          // [Read-only] Last-updated timestamp :contentReference[oaicite:66]{index=66}:contentReference[oaicite:67]{index=67}
}

export interface WorkspaceuserWrapper {
  Workspaceuser: Workspaceuser;
}
