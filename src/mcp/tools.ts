import SPPClient from '../clients/SPPClient.js';
import tokenStore from '../routes/tokenStore.js';
import { z } from 'zod';

const getAuthUrl = () => new SPPClient({}).getAuthUrl();

/** Helper to instantiate an authenticated SPPClient with token refresh handling */
function getAuthenticatedClient() {
  const { accessToken, refreshToken } = tokenStore.get();
  if (!accessToken || !refreshToken) {
    return null;
  }
  return new SPPClient({
    sppUrl: process.env.SPP_URL as string,
    clientId: process.env.SPP_CLIENT_ID as string,
    clientSecret: process.env.SPP_CLIENT_SECRET as string,
    callbackUrl: process.env.SPP_CALLBACK_URL as string,
    accessToken,
    refreshToken,
    onRefresh: async ({ access_token, refresh_token }: { access_token: string; refresh_token: string }) => {
      tokenStore.set(access_token, refresh_token);
    },
  });
}

/** Standardized response when no token is present or token is expired. */
function authRequiredResponse() {
  const auth_url = getAuthUrl();
  return {
    content: [
      {
        type: "text" as const,
        text: [
          "🔒 Authentication required.",
          "",
          `Please authenticate by clicking the link below, then **retry your original request**:`,
          "",
          auth_url,
          "",
          "Once you have signed in, simply repeat what you asked me to do and I will proceed automatically.",
        ].join("\n")
      }
    ]
  };
}

export const mcpTools = [
  {
    name: 'get_signin_url',
    description: 'Get the OAuth2 authentication URL for the user to sign in to Redspace SPP. Call this when the user needs to authenticate.',
    inputSchema: z.object({}),
    async handler(_args: any, _ctx: any) {
      const auth_url = getAuthUrl();
      return {
        content: [
          {
            type: "text" as const,
            text: [
              "Please authenticate by clicking the link below, then **retry your original request**:",
              "",
              auth_url,
              "",
              "Once you have signed in, simply repeat what you asked me to do and I will proceed automatically.",
            ].join("\n")
          }
        ]
      };
    }
  },

  {
    name: 'get_auth_instructions',
    description: 'Get instructions for authenticating and using the Redspace SPP MCP tools.',
    inputSchema: z.object({}),
    async handler(_args: any, _ctx: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: [
              "Welcome to the Redspace SPP MCP Agent!",
              "",
              "## How to use:",
              "",
              "1. **No authentication needed upfront.** Just ask me to do something (e.g. 'list projects').",
              "2. **If not authenticated**, I will automatically provide you with a sign-in link.",
              "3. **Click the link** to authenticate in your browser.",
              "4. **Retry your original request** — I will proceed automatically once the token is stored.",
              "",
              "## Available tools:",
              "- list_projects — List all SPP projects",
              "- list_bookings — List all SPP bookings",
              "- list_project_members — List all users assigned to a project",
              "- get_signin_url — Get the authentication URL manually",
              "",
              "Tokens are valid for 1 hour. If a request fails with an auth error, repeat the sign-in process.",
            ].join("\n")
          }
        ]
      };
    }
  },

  {
    name: 'list_projects',
    description: 'List all projects in Redspace SPP. If the user is not authenticated, returns an authentication link. Optionally accepts filter, limit, and offset.',
    inputSchema: z.object({
      filter: z.record(z.any()).optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }),
    async handler(args: any, _ctx: any) {
      const { filter = {}, limit = 100, offset = 0 } = args;

      const client = getAuthenticatedClient();
      if (!client) {
        return authRequiredResponse();
      }

      try {
        const projects = (await client.list('Project', filter, limit, offset) as any[]) || [];
        const lines = [
          `Found ${projects.length} project(s):`,
          "",
          ...projects.map((p: any) => `- [${p.id}] ${p.name || '(no name)'}${p.status ? ` — ${p.status}` : ''}`)
        ];

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }]
        };
      } catch (err: any) {
        const isAuthError = err?.name?.includes('SPPAuthError') || err?.detail?.code === '2';
        if (isAuthError) {
          return authRequiredResponse();
        }
        return {
          content: [{ type: "text" as const, text: `Error listing projects: ${err?.message || 'Unknown error'}` }]
        };
      }
    }
  },

  {
    name: 'list_bookings',
    description: 'List all bookings in Redspace SPP. If the user is not authenticated, returns an authentication link. Optionally accepts filter, limit, and offset.',
    inputSchema: z.object({
      filter: z.record(z.any()).optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }),
    async handler(args: any, _ctx: any) {
      const { filter = {}, limit = 100, offset = 0 } = args;

      const client = getAuthenticatedClient();
      if (!client) {
        return authRequiredResponse();
      }

      try {
        const bookings = (await client.list('Booking', filter, limit, offset) as any[]) || [];
        const lines = [
          `Found ${bookings.length} booking(s):`,
          "",
          ...bookings.map((b: any) =>
            `- [${b.id}] Project: ${b.projectName || b.project_id || '—'} | Date: ${b.date || '—'} | Amount: ${b.amount || '—'}`
          )
        ];

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }]
        };
      } catch (err: any) {
        const isAuthError = err?.name?.includes('SPPAuthError') || err?.detail?.code === '2';
        if (isAuthError) {
          return authRequiredResponse();
        }
        return {
          content: [{ type: "text" as const, text: `Error listing bookings: ${err?.message || 'Unknown error'}` }]
        };
      }
    }
  },

  {
    name: 'list_project_members',
    description: 'List all users (resources) assigned to a given SPP project. Accepts either a project ID or project name. Returns member details including name, email, and allocation percentage.',
    inputSchema: z.object({
      project_id: z.string().optional(),
      project_name: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
      include_inactive: z.boolean().optional(),
    }),
    async handler(args: any, _ctx: any) {
      const { project_id, project_name, limit = 1000, offset = 0, include_inactive = false } = args;

      const client = getAuthenticatedClient();
      if (!client) {
        return authRequiredResponse();
      }

        try {
          let finalProjectId = project_id;
          let lookupInfo = { used: null, project_name };


        // If project_name is provided, resolve it to project_id
        if (project_name && !project_id) {
          // Try by name, code, and externalid
          const filtersToTry = [
            { name: project_name },
            { code: project_name },
            { externalid: project_name },
          ];
          let projectResults = [];
          let filterUsed = null;
          let lastErr = null;
          for (const filter of filtersToTry) {
            try {
              // list all matches for this filter
              projectResults = (await client.list('Project', filter, 10, 0) as any[]) || [];
              filterUsed = Object.keys(filter)[0];
              if (projectResults.length > 0) break;
            } catch (err) {
              lastErr = err;
            }
          }
          if (projectResults.length === 0) {
            // fallback: fetch all projects and try in-memory match (case/collapsed/trimmed)
            const allProjects = (await client.list('Project', {}, 1000, 0) as any[]) || [];
            projectResults = allProjects.filter(p => typeof p.name === 'string' && p.name.trim().toLowerCase() === project_name.trim().toLowerCase());
            filterUsed = 'in-memory';
          }
          if (projectResults.length === 0) {
            return {
              content: [{ type: "text" as const, text: `No project found with name/code/externalid matching "${project_name}". Tried filters: name, code, externalid, and in-memory fallback.` }]
            };
          }
          if (projectResults.length > 1) {
            return {
              content: [{ type: "text" as const, text: `Multiple projects found for input "${project_name}" using filter ${filterUsed}. Please use project_id instead.` }]
            };
          }
          finalProjectId = projectResults[0].id;
        }

        if (!finalProjectId) {
          return {
            content: [{ type: "text" as const, text: `Please provide either project_id or project_name.` }]
          };
        }

        // Fetch project details for display
        let projectDetails: any = null;
        let projectName = '(unknown)';
        try {
          projectDetails = await client.read('Project', finalProjectId);
          projectName = projectDetails?.name || '(unknown)';
        } catch (err) {
          // Pass, keep unknown for display
        }


        // Fetch all ProjectAssign records for this project
        const assignments = (await client.list('ProjectAssign', { project_id: finalProjectId }, limit, offset) as any[]) || [];

        if (assignments.length === 0) {
          return {
            content: [{ type: "text" as const, text: `Project "${projectName}" (id ${finalProjectId}) has no assigned members.` }]
          };
        }

        // Collect unique user_ids and filter by deleted status if needed
        // Use Number() to guard against SPP returning numeric fields as strings
        const userIds = assignments
          .filter((a: any) => include_inactive ? true : Number(a.deleted) !== 1)
          .map((a: any) => a.user_id)
          .filter(Boolean) // drop null/undefined user_ids
          .filter((id: string, idx: number, arr: string[]) => arr.indexOf(id) === idx); // unique

        if (userIds.length === 0) {
          return {
            content: [{ type: "text" as const, text: `Project "${projectName}" (id ${finalProjectId}) has no active assigned members.` }]
          };
        }

        // Batch fetch user details — fall back to empty map on failure so active-user
        // filtering still works rather than silently hiding all members.
        const userFilters = userIds.map((id: string) => ({ id }));
        let users: any[] = [];
        try {
          users = (await client.batchList('User', userFilters, limit, 0) as any[]) || [];
        } catch (userFetchErr: any) {
          // Non-fatal: proceed without user details; names/emails will show as (unknown)
          users = [];
        }

        // Create a map for quick lookup
        const userMap: Record<string, any> = {};
        users.forEach((u: any) => {
          if (u?.id) userMap[u.id] = u;
        });

        // Filter by active status if needed, and enrich assignment data
        const enrichedAssignments = assignments
          .filter((a: any) => {
            if (include_inactive) return true;
            const user = userMap[a.user_id];
            // Use Number() coercion to handle SPP returning "1"/"0" as strings
            return Number(a.deleted) !== 1 && user && Number(user.active) === 1;
          })
          .map((a: any) => {
            const user = userMap[a.user_id];
            const firstName = user?.addr?.first || '(unknown)';
            const lastName = user?.addr?.last || '';
            const email = user?.addr?.email || '(no email)';
            const allocation = a.allocation != null ? `${a.allocation}%` : 'N/A';
            return {
              id: a.user_id,
              name: `${firstName} ${lastName}`.trim(),
              email,
              allocation,
              job_code_id: a.job_code_id || 'N/A',
              deleted: a.deleted,
              user_active: user?.active,
            };
          });

        const lines = [
          `Project "${projectName}" (id ${finalProjectId}) has ${enrichedAssignments.length} member(s):`,
          "",
          ...enrichedAssignments.map((m: any) =>
            `- [${m.id}] ${m.name} <${m.email}> — allocation: ${m.allocation} — job_code: ${m.job_code_id}`
          )
        ];

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }]
        };
        } catch (err: any) {
          const isAuthError = err?.name?.includes('SPPAuthError') || err?.detail?.code === '2';
          if (isAuthError) {
            return authRequiredResponse();
          }
          let extra = '';
          if (project_name && (!project_id)) extra = `\n(Tried to resolve project_name via filters: name/code/externalid and in-memory match)`;
          const errDetail = err?.detail ? ` [code: ${err.detail.code}, detail: ${err.detail.message}]` : '';
          return {
            content: [{ type: "text" as const, text: `Error listing project members: ${err?.message || 'Unknown error'}${errDetail}${extra}` }]
          };
        }
    }
  }
];
