import { Request, Response } from 'express';

/**
 * Agent instructions endpoint: GET /instructions
 */
export default function instructionsHandler(req: Request, res: Response) {
  res.json({
    title: 'MCP Agent API Instructions',
    message:
      `Welcome to the MCP Agent API!\n\nHow to use:\n\n1. Authenticate first:\n   - Call GET /signin. This returns an 'auth_url'.\n   - Ask the user to click this URL in their browser and complete authentication.\n   - On success, you will receive an access token valid for 1 hour.\n\n2. Access Data:\n   - Use your access token as 'Authorization: Bearer <TOKEN>' in requests to /projects and /bookings.\n\nImportant Notes:\n- You must always authenticate via /signin before calling data endpoints.\n- The human user MUST click the provided authentication link.\n- Your token is valid for 1 hour. (Refreshing tokens may be supported in the near future.)\n- If the token expires, repeat the signin process.\n\nMore API endpoints coming soon! ;-)`,
    endpoints: [
      {
        path: '/signin',
        method: 'GET',
        description: 'Returns an authentication URL (auth_url) and user prompt.'
      },
      {
        path: '/callback/spp',
        method: 'GET',
        description: 'OAuth callback for user to complete login.'
      },
      {
        path: '/projects',
        method: 'GET',
        description: 'List all projects. Requires valid token.'
      },
      {
        path: '/bookings',
        method: 'GET',
        description: 'List all bookings. Requires valid token.'
      }
    ]
  });
}
