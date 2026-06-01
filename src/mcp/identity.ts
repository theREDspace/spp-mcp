// Single source of truth for server identity advertised to MCP clients.
// Read from package.json so version bumps don't require code changes.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// src/mcp/identity.ts → repo root is two levels up
const pkgPath = resolve(here, '..', '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name: string; version: string };

export const SERVER_NAME: string = pkg.name || 'spp-mcp';
export const SERVER_VERSION: string = pkg.version;
