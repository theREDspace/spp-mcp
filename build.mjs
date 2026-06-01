import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/index.js',
  packages: 'external',
  sourcemap: true,
  define: {
    'process.env.SPP_MCP_PKG_NAME': JSON.stringify(pkg.name),
    'process.env.SPP_MCP_PKG_VERSION': JSON.stringify(pkg.version),
  },
});

console.log('Build complete: dist/index.js');
