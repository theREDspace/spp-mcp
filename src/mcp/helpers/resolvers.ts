// Fuzzy lookup utilities for projects and users
import type SPPClient from '../../clients/SPPClient';

type Project = { id: string; name?: string; code?: string; externalid?: string };

type ResolveResult<T> = { ok: true; entity: T; raw?: any } | { ok: false; message: string };

export async function resolveProjectByNameOrId(
  client: SPPClient,
  { project_id, project_name }:
    { project_id?: string, project_name?: string }
): Promise<ResolveResult<{ id: string; name: string }>> {
  if (project_id) {
    try {
      const project = await client.read('Project', project_id);
      return { ok: true, entity: { id: project.id, name: project.name ?? '(unknown)' }, raw: project };
    } catch (err) {
      return { ok: false, message: `Could not find project with id="${project_id}".` };
    }
  }
  if (project_name) {
    // Try by name, code, externalid
    const filtersToTry = [ { name: project_name }, { code: project_name }, { externalid: project_name } ];
    let projectResults: Project[] = [];
    let filterUsed: undefined|string = undefined;
    let lastErr:any = null;
    for (const filter of filtersToTry) {
      try {
        projectResults = (await client.list('Project', filter, 10, 0) as any[]) || [];
        filterUsed = Object.keys(filter)[0];
        if (projectResults.length > 0) break;
      } catch (err) { lastErr = err; }
    }
    if (!projectResults.length) {
      // fallback: fetch all projects, try memory match
      const allProjects = (await client.list('Project', {}, 1000, 0) as any[]) || [];
      projectResults = allProjects.filter(
        (p: Project) => typeof p.name === "string" && p.name.trim().toLowerCase() === project_name.trim().toLowerCase()
      );
      filterUsed = 'in-memory';
    }
    if (projectResults.length === 0) {
      return {
        ok: false,
        message: `No project found with name/code/externalid matching "${project_name}". Tried filters: name, code, externalid, and in-memory fallback.`
      };
    }
    if (projectResults.length > 1) {
      return {
        ok: false,
        message: `Multiple projects found for input "${project_name}" using filter ${filterUsed}. Please use project_id instead.`
      };
    }
    return { ok: true, entity: { id: projectResults[0]?.id || '', name: projectResults[0]?.name || projectResults[0]?.id || '' }, raw: projectResults[0] };
  }
  return {
    ok: false,
    message: `Please provide either project_id or project_name.`
  };
}

// User (by user_id/person_name)
export async function resolveUserByNameOrId(
  client: SPPClient,
  { user_id, person_name }:
    { user_id?: string, person_name?: string }
): Promise<ResolveResult<{ id: string; name: string }>> {
  if (user_id) {
    try {
      const user: any = await client.read('User', user_id);
      const name = `${user?.addr?.first || ''} ${user?.addr?.last || ''}`.trim() || user?.nickname || user_id;
      return { ok: true, entity: { id: user_id, name }, raw: user };
    } catch {
      // return not found
    }
  }
  if (person_name) {
    // Try nickname
    let userResults = (await client.list('User', { nickname: person_name }, 1000, 0) as any[]) || [];
    if (!userResults.length) {
      userResults = (await client.list('User', { email: person_name }, 1000, 0) as any[]) || [];
    }
    if (!userResults.length) {
       const parts = person_name.trim().split(/\s+/);
       if (parts.length > 1 && parts[0] && parts[1]) {
         const allUsers = (await client.list('User', {}, 1000, 0) as any[]) || [];
         userResults = allUsers.filter((u: any) => {
           const first = u.addr?.first?.toLowerCase() || '';
           const last = u.addr?.last?.toLowerCase() || '';
           const p1 = parts[0]?.toLowerCase() || '';
           const p2 = parts.slice(1).join(' ').toLowerCase();
           return first === p1 && last === p2;
         });
       }
    }
    if (!userResults.length) {
      // Fallback: full name match
      const allUsers = (await client.list('User', {}, 1000, 0) as any[]) || [];
      const searchLower = person_name.toLowerCase();
      userResults = allUsers.filter((u: any) => {
        const fullName = `${u.addr?.first || ''} ${u.addr?.last || ''}`.toLowerCase();
        return fullName.includes(searchLower) || u.name?.toLowerCase().includes(searchLower);
      });
    }
    if (!userResults.length) {
      return {
        ok: false,
        message: `No user found matching "${person_name}". Tried: nickname, email, first/last name split, and full name match.`
      };
    }
    if (userResults.length > 1) {
      const matches = userResults.map((u: any) => `${u.addr?.first || ''} ${u.addr?.last || ''} (${u.id})`).join(', ');
      return {
        ok: false,
        message: `Multiple users found for "${person_name}": ${matches}. Please provide user_id instead.`
      };
    }
    const name = `${userResults[0].addr?.first || ''} ${userResults[0].addr?.last || ''}`.trim() || userResults[0].nickname || person_name;
    return { ok: true, entity: { id: userResults[0].id, name }, raw: userResults[0] };
  }
  return {
    ok: false,
    message: `Please provide either person_name or user_id.`
  };
}
