// agentUserContext.ts
// Automated User Context Resolver for agent tools
// Ensures all tools requiring a user context either propagate provided userId,
// resolve the current userId (whoami), or resolve userId for named users via User search.

import { boSchemaRegistry } from '../../services/boSchemaRegistry';
import type SPPClient from '../../clients/SPPClient';

// Single source of truth for which object types require a user context guard.
// Extend this list when adding new user-bound BOs.
export const USER_BOUND_OBJECTS = ['Timesheet', 'TimeEntry', 'ResourceProfile'] as const;

// Resolves and returns both the userId and the name of the user field for the given objectType.
// Throws if it cannot resolve either.
export async function resolveUserContext({
  objectType,
  payloadOrFilter,
  sppClient,
  preferSelf = false,
  userName,
}: {
  objectType: string;
  payloadOrFilter: Record<string, any>;
  sppClient: SPPClient;
  preferSelf?: boolean;           // If true, fallback to current user when userId is absent
  userName?: string | undefined;  // If set, search for this named user and use their id
}): Promise<{ userId: string; userField: string }> {
  const schema = boSchemaRegistry[objectType];
  if (!schema) throw new Error(`Unknown object type: ${objectType}`);

  // Find which field carries the userId for this object.
  // Convention: prefer explicit 'userid' field, then any field containing 'user',
  // then canonicalId if it contains 'user'.
  const userField =
    schema.fields.find(f => f.name.toLowerCase() === 'userid')?.name ||
    schema.fields.find(f => f.name.toLowerCase().includes('user'))?.name ||
    (schema.canonicalId.toLowerCase().includes('user') ? schema.canonicalId : undefined);

  if (!userField) throw new Error(`No user field found for ${objectType}`);

  const existingUserId = payloadOrFilter[userField];
  if (existingUserId) return { userId: existingUserId, userField };

  // If a specific user is named, search for them via User BO.
  if (userName && userName.trim()) {
    const searchFields = ['name', 'id', 'code', 'externalid', 'external_id', 'nickname'];
    let users: any[] = [];
    for (const field of searchFields) {
      const filter: Record<string, string> = {};
      filter[field] = userName.trim();
      const found = await sppClient.list('User', filter, 5, 0) as any[];
      if (found && found.length) {
        users = found;
        break;
      }
    }
    if (!users.length) {
      throw new Error(
        `Could not find user by ${searchFields.join(', ')} with value '${userName}'.`
      );
    }
    return { userId: users[0].id, userField };
  }

  // If the action targets the current user (e.g. "my timesheet"), use whoami.
  if (preferSelf) {
    const user = await sppClient.whoami();
    if (!user?.id) throw new Error(`Could not determine current user via whoami.`);
    return { userId: user.id, userField };
  }

  throw new Error(
    `No user context found for ${objectType}; set ${userField}, specify a user name, or use preferSelf for current user context.`
  );
}

// Note: Agent code should
// - Call this helper before list/add/CRUD for user-bound objects (Timesheet, TimeEntry, ResourceProfile, etc.)
// - Pass action intent: preferSelf = true if for current user, userName if for a different named person
// - Attach results to filter/payload as needed using the returned userField
// - If it throws, communicate/return error upstream
