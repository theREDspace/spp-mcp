import { z } from 'zod';
import type { Tool } from './types';
import { getAuthUrl } from '../helpers/auth';
import { textResponse } from '../helpers/responses';

const getSigninUrl: Tool = {
  name: 'get_signin_url',
  description:
    'Get the OAuth2 authentication URL for the user to sign in to Redspace SPP. Call this when the user needs to authenticate.',
  inputSchema: z.object({}),
  async handler(_args, _ctx) {
    if (!_ctx?.email) {
      return textResponse('Missing required email for per-user SPP authentication.');
    }
    const auth_url = getAuthUrl(_ctx.email);
    return textResponse(
      [
        'Please authenticate by clicking the link below, then **retry your original request**:',
        '',
        auth_url,
        '',
        'Once you have signed in, simply repeat what you asked me to do and I will proceed automatically.'
      ].join('\n')
    );
  }
};
export default getSigninUrl;
