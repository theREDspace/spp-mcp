import SPPClient from '../clients/SPPClient.js';
import { z } from 'zod';
import type {
  MCPSigninParams, MCPSigninResult, MCPInstructionsResult,
  ListProjectsParams, ListBookingsParams
} from './types.js';

export const mcpTools = [
  {
    name: 'get_signin_url',
    description: 'Get the authentication (OAuth2) URL for agent user sign-in.',
    inputSchema: z.object({}),
    async handler(_args: any, _ctx: any) {
      const client = new SPPClient({});
      const auth_url = client.getAuthUrl();
      return {
        content: [
          {
            type: "text",
            text: `Sign in here: ${auth_url}\n\nAsk the user to click the returned URL in their browser to complete sign in. Access tokens are valid for 1 hour.`
          }
        ]
      } as any;
    }
  },
  {
    name: 'get_auth_instructions',
    description: 'Instructions for authenticating users and using other endpoints.',
    inputSchema: z.object({}),
    async handler(_args: any, _ctx: any) {
      return {
        content: [
          {
            type: "text",
            text:
              `Welcome to the MCP Agent API!\n\nHow to use:\n\n1. Authenticate first:\n   - Call get_signin_url. This returns an \'auth_url\'.\n   - Ask the user to click this URL in their browser and complete authentication.\n   - On success, you will receive an access token valid for 1 hour.\n\n2. Access Data:\n   - Use your access token as 'access_token' when calling list_projects/list_bookings.\n\nImportant Notes:\n- You must always authenticate via get_signin_url before calling data endpoints.\n- The human user MUST click the provided authentication link.\n- Your token is valid for 1 hour. (Refreshing tokens may be supported in the near future.)\n- If the token expires, repeat the sign-in process.\n\nMore API endpoints coming soon! ;-)`
          },
          {
            type: "table",
            columns: ['Endpoint', 'Method', 'Description'],
            rows: [
              ['get_signin_url', 'MCP tool', 'Returns an OAuth2 URL for agent sign-in.'],
              ['get_auth_instructions', 'MCP tool', 'Returns onboarding instructions.'],
              ['list_projects', 'MCP tool', 'List all projects. Requires valid token and optional filters.'],
              ['list_bookings', 'MCP tool', 'List all bookings. Requires valid token and optional filters.']
            ]
          }
        ]
      } as any;
    }
  },
  // --- List Projects handler ---
  {
    name: 'list_projects',
    description: 'List all projects accessible to this user. Requires an access_token. Optionally accepts filter, limit, and offset params.',
    inputSchema: z.object({
      access_token: z.string(),
      filter: z.any().optional(),
      limit: z.any().optional(),
      offset: z.any().optional()
    }),
    async handler(args: any, _ctx: any) {
      const {
        access_token,
        filter = {},
        limit = 100,
        offset = 0
      } = args;
      const client = new SPPClient({
        sppUrl: process.env.SPP_URL as string,
        clientId: process.env.SPP_CLIENT_ID as string,
        clientSecret: process.env.SPP_CLIENT_SECRET as string,
        callbackUrl: process.env.SPP_CALLBACK_URL as string,
        accessToken: access_token
      });
      const projects = (await client.list('Project', filter, limit, offset) as any[]) || [];
      return {
        content: [
          {
            type: "table",
            columns: ['ID', 'Name', 'Status'],
            rows: projects.map((p: any) => [p.id, p.name, p.status || '—'])
          }
        ]
      } as any;
    }
  },
  // --- List Bookings handler ---
  {
    name: 'list_bookings',
    description: 'List all bookings accessible to this user. Requires an access_token. Optionally accepts filter, limit, and offset params.',
    inputSchema: z.object({
      access_token: z.string(),
      filter: z.any().optional(),
      limit: z.any().optional(),
      offset: z.any().optional()
    }),
    async handler(args: any, _ctx: any) {
      const {
        access_token,
        filter = {},
        limit = 100,
        offset = 0
      } = args;
      const client = new SPPClient({
        sppUrl: process.env.SPP_URL as string,
        clientId: process.env.SPP_CLIENT_ID as string,
        clientSecret: process.env.SPP_CLIENT_SECRET as string,
        callbackUrl: process.env.SPP_CALLBACK_URL as string,
        accessToken: access_token
      });
      const bookings = (await client.list('Booking', filter, limit, offset) as any[]) || [];
      return {
        content: [
          {
            type: "table",
            columns: ['ID', 'Project', 'Date', 'Amount'],
            rows: bookings.map((b: any) => [b.id, b.projectName || b.project_id || '—', b.date || '—', b.amount || '—'])
          }
        ]
      } as any;
    }
  }
];
