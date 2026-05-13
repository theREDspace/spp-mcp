import { z } from 'zod';
import type { Tool } from './types';
import { textResponse } from '../helpers/responses';

const handler: Tool['handler'] = async function () {
  // Lazy import to avoid cycle
  const { mcpTools } = await import('./index');
  const toolList = mcpTools
    .filter((t) => t.name !== 'get_auth_instructions')
    .map((t) => `- ${t.name} — ${t.description.split('.')[0]}`)
    .join('\n');
  return textResponse(
    [
      'Welcome to the Redspace SPP MCP Agent!',
      '',
      '## How to use:',
      '',
      "1. **No authentication needed upfront.** Just ask me to do something (e.g. 'list projects').",
      '2. **If not authenticated**, I will automatically provide you with a sign-in link.',
      '3. **Click the link** to authenticate in your browser.',
      '4. **Retry your original request** — I will proceed automatically once the token is stored.',
      '',
      '## Available tools:',
      toolList,
      '',
      'Tokens are valid for 1 hour. If a request fails with an auth error, repeat the sign-in process.',
    ].join('\n')
  );
};

const getAuthInstructions: Tool = {
  name: 'get_auth_instructions',
  description: 'Get instructions for authenticating and using the Redspace SPP MCP tools.',
  inputSchema: z.object({}),
  handler,
};
export default getAuthInstructions;
