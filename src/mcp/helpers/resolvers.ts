// Fuzzy lookup utilities — only resolveMe is kept here.
// Name-based resolution is handled by search_users and search_projects tools.
import type SPPClient from '../../clients/SPPClient';

type ResolveResult<T> =
  | { ok: true; entity: T; raw?: any }
  | { ok: false; message: string };

// Resolve current user via whoami (uses the access token already set on the client)
export async function resolveMe(
  client: SPPClient
): Promise<ResolveResult<{ id: string; name: string }>> {
  try {
    const user = await client.whoami() as any;
    if (!user || !user.id) {
      return {
        ok: false,
        message: 'Could not determine the current user. The whoami call returned an empty result.'
      };
    }
    const addr = user?.addr ?? {};
    const name = `${addr.first || ''} ${addr.last || ''}`.trim() || user?.nickname || user?.id;
    return { ok: true, entity: { id: user.id, name }, raw: user };
  } catch (err) {
    return {
      ok: false,
      message: `Error resolving current user: ${err instanceof Error ? err.message : 'Unknown error'}`
    };
  }
}
