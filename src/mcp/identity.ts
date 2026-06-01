// Single source of truth for server identity advertised to MCP clients.
// At build time, esbuild's `define` replaces process.env.SPP_MCP_PKG_*
// with literals from package.json (see build.mjs). In dev (ts-node), we
// fall back to reading package.json from the repo root.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

function readPkgFallback(): { name: string; version: string } {
  const here = dirname(fileURLToPath(import.meta.url));
  // src/mcp/identity.ts → repo root is two levels up
  const pkgPath = resolve(here, '..', '..', 'package.json');
  return JSON.parse(readFileSync(pkgPath, 'utf8')) as { name: string; version: string };
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
