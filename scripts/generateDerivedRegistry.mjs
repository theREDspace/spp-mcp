// scripts/generateDerivedRegistry.mjs
// Generates src/services/boSchemaRegistry.derived.ts from src/types/*.ts interface files.
// Run: node scripts/generateDerivedRegistry.mjs

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TYPES_DIR = join(ROOT, 'src', 'types');
const OUT_FILE = join(ROOT, 'src', 'services', 'boSchemaRegistry.derived.ts');

function mapType(tsType) {
  const t = tsType.replace(/[?;]/g, '').trim();
  if (t === 'DateContainer') return 'DateContainer';
  if (t === 'number') return 'number';
  return 'string';
}

const SKIP_INTERFACES = new Set(['DateBlock', 'DateContainer', 'DateWrapper']);
const ALTERNATE_ID_CANDIDATES = ['externalid', 'external_id', 'code', 'number'];

function findMainInterfaceName(source, fileStem) {
  const allMatches = [];
  const re = /export\s+interface\s+(\w+)\s*\{/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const name = m[1];
    if (!name.endsWith('Wrapper') && !SKIP_INTERFACES.has(name)) {
      allMatches.push(name);
    }
  }
  if (allMatches.length === 0) return null;
  const preferred = allMatches.find(n => n.toLowerCase() === fileStem.toLowerCase());
  return preferred ?? allMatches[0] ?? null;
}

function parseInterfaceFields(source, ifaceName) {
  const ifaceRe = new RegExp(
    `export\\s+interface\\s+${ifaceName}\\s*\\{([^}]*)\\}`,
    's'
  );
  const m = source.match(ifaceRe);
  if (!m) return [];
  const body = m[1];
  const fields = [];
  const fieldRe = /^\s*(\w+)\??:\s*([^;/\n]+)/gm;
  let fm;
  while ((fm = fieldRe.exec(body)) !== null) {
    const fname = fm[1];
    if (fname === 'constructor') continue;
    const ftype = fm[2].trim();
    fields.push({ name: fname, type: mapType(ftype) });
  }
  return fields;
}

async function run() {
  const files = (await readdir(TYPES_DIR)).filter(f => f.endsWith('.ts'));
  const entries = [];

  for (const file of files) {
    const stem = file.replace(/\.ts$/, '');
    const source = await readFile(join(TYPES_DIR, file), 'utf8');
    const ifaceName = findMainInterfaceName(source, stem);
    if (!ifaceName) continue;
    const fields = parseInterfaceFields(source, ifaceName);
    if (fields.length === 0) continue;

    const fieldNames = fields.map(f => f.name);
    const canonicalId = fieldNames.includes('id') ? 'id' : (fieldNames[0] ?? 'id');
    const alternateIds = ALTERNATE_ID_CANDIDATES.filter(
      c => fieldNames.includes(c) && c !== canonicalId
    );

    entries.push({ name: ifaceName, canonicalId, alternateIds, fields });
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  const lines = [
    '// AUTO-GENERATED — do not edit manually.',
    '// Regenerate with: npm run gen:registry',
    '',
    "import type { BOSchema } from './boSchemaRegistry.js';",
    '',
    'export const derivedRegistry: Record<string, BOSchema> = {',
  ];

  for (const { name, canonicalId, alternateIds, fields } of entries) {
    lines.push(`  ${name}: {`);
    lines.push(`    source: 'derived',`);
    lines.push(`    typeFile: 'src/types/${name}.ts',`);
    lines.push(`    canonicalId: '${canonicalId}',`);
    lines.push(`    alternateIds: ${JSON.stringify(alternateIds)},`);
    lines.push(`    requiredFields: [],`);
    lines.push(`    fields: [`);
    for (const f of fields) {
      lines.push(`      { name: '${f.name}', type: '${f.type}' },`);
    }
    lines.push(`    ],`);
    lines.push(`  },`);
  }

  lines.push('};');

  await writeFile(OUT_FILE, lines.join('\n') + '\n');
  console.log(`✓ Generated ${entries.length} derived BOSchema entries → src/services/boSchemaRegistry.derived.ts`);
}

run().catch(err => { console.error(err); process.exit(1); });
