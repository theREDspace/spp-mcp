import { z } from 'zod';
import type { Tool } from './types';
import { getAuthUrl } from '../helpers/auth';
import { textResponse } from '../helpers/responses';

const getSigninUrl: Tool = {
  name: 'get_signin_url',
  description:
    'Get the OAuth2 authentication URL for the user to sign in to Redspace SPP. Call this when the user needs to authenticate.',
  inputSchema: z.object({}),
  async handler() {
    const auth_url = getAuthUrl();
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
