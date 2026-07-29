// Single source of truth for server identity advertised to MCP clients.
// At build time, esbuild's `define` replaces process.env.SPP_MCP_PKG_*
// with literals from package.json (see build.mjs). In dev (ts-node) and in
// tests (ts-jest), we fall back to reading package.json from the repo root.
//
// Resolved relative to process.cwd() rather than import.meta.url: this file
// is authored as ESM, but ts-jest transpiles it to CommonJS for tests, where
// `import.meta` is a hard syntax error regardless of whether the containing
// function ever runs. process.cwd() is safe here because every way this
// process starts (ts-node --esm from the repo root, jest from the repo
// root, or `npm start` running dist/index.js from the repo root) already
// assumes cwd = repo root elsewhere in this codebase (e.g. clientRegistry.ts's
// default CLIENT_REGISTRY_PATH of 'data/clients.json').
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Walk up from `process.cwd()` looking for package.json, rather than assuming
 * cwd IS the repo root. A bare `resolve(cwd, 'package.json')` breaks under a
 * cwd that isn't the project root (systemd `WorkingDirectory=`, a container
 * entrypoint, or running a script from a subdirectory) — the upward walk costs
 * nothing and removes that assumption.
 */
function readPkgFallback(): { name: string; version: string } {
  let dir = process.cwd();
  for (;;) {
    let raw: string;
    try {
      raw = readFileSync(resolve(dir, 'package.json'), 'utf8');
    } catch {
      // No package.json at this level — keep walking up.
      const parent = dirname(dir);
      if (parent === dir) break; // reached the filesystem root
      dir = parent;
      continue;
    }
    // Found one. Stop here regardless of whether it parses: continuing the
    // walk past a malformed package.json would silently report some ancestor
    // directory's package name/version as this server's identity, which is
    // worse than falling back to the defaults below.
    try {
      return JSON.parse(raw) as { name: string; version: string };
    } catch {
      break;
    }
  }
  // Callers fall back to the literal defaults below; never throw here, since
  // server identity is cosmetic metadata and must not prevent startup.
  return { name: '', version: '0.0.0' };
}

const injectedName = process.env.SPP_MCP_PKG_NAME;
const injectedVersion = process.env.SPP_MCP_PKG_VERSION;

let name: string;
let version: string;
if (injectedName && injectedVersion) {
  name = injectedName;
  version = injectedVersion;
} else {
  const pkg = readPkgFallback();
  name = pkg.name;
  version = pkg.version;
}

export const SERVER_NAME: string = name || 'spp-mcp';
export const SERVER_VERSION: string = version;
