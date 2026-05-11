import SPPClient from '../clients/SPPClient.js';
import tokenStore from '../routes/tokenStore.js';
import { z } from 'zod';

const getAuthUrl = () => new SPPClient({}).getAuthUrl();

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

      const { accessToken, refreshToken } = tokenStore.get();
      if (!accessToken || !refreshToken) {
        return authRequiredResponse();
      }

      try {
        const client = new SPPClient({
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

      const { accessToken, refreshToken } = tokenStore.get();
      if (!accessToken || !refreshToken) {
        return authRequiredResponse();
      }

      try {
        const client = new SPPClient({
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
  }
];
