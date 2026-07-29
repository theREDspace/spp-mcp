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
import { resolve } from 'node:path';

function readPkgFallback(): { name: string; version: string } {
  const pkgPath = resolve(process.cwd(), 'package.json');
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
