// MCP Resources — exposes the BO catalog, per-BO schemas, and semantic patterns
// so capable clients can pre-fetch and cache them instead of spending tool
// calls on discovery.
//
// URI scheme:
//   bo://catalog                  → list of all supported BO names + summaries
//   bo://schema/{objectType}      → full schema for a single BO (template)
//   bo://semantic-patterns        → registry of LLM intent → canonical query pattern

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/server';
import { boSchemaRegistry } from '../services/boSchemaRegistry';
import { semanticPatterns } from '../services/semanticPatternsRegistry';

function summarize(name: string, schema: (typeof boSchemaRegistry)[string]) {
  return {
    name,
    canonicalId: schema.canonicalId,
    alternateIds: schema.alternateIds,
    requiredFields: schema.requiredFields,
    fieldCount: schema.fields.length,
    relationshipCount: schema.relationships?.length ?? 0,
    relationships: schema.relationships ?? [],
    schemaUri: `bo://schema/${name}`,
  };
}

export function registerBoResources(server: McpServer): void {
  // ── bo://catalog ────────────────────────────────────────────────────────
  server.registerResource(
    'bo-catalog',
    'bo://catalog',
    {
      title: 'Business Object Catalog',
      description:
        'List of every supported SuiteProjects Pro business object, with canonical/alternate IDs, required fields, relationship metadata (foreign keys), and a pointer to the full schema for each (bo://schema/{objectType}).',
      mimeType: 'application/json',
    },
    async (uri) => {
      const objects = Object.entries(boSchemaRegistry).map(([name, schema]) => summarize(name, schema));
      const payload = { count: objects.length, objects };
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    }
  );

  // ── bo://schema/{objectType} ────────────────────────────────────────────
  server.registerResource(
    'bo-schema',
    new ResourceTemplate('bo://schema/{objectType}', {
      // Enumerate every BO as a concrete resource so clients can discover them
      // via resources/list, not just resources/templates/list.
      list: async () => ({
        resources: Object.keys(boSchemaRegistry).map((name) => ({
          uri: `bo://schema/${name}`,
          name: `bo-schema-${name}`,
          title: `${name} schema`,
          description: `Full BO schema for ${name}: fields, types, canonical and alternate IDs, required fields, example payload.`,
          mimeType: 'application/json',
        })),
      }),
      complete: {
        objectType: async (value) => {
          const lower = value.toLowerCase();
          return Object.keys(boSchemaRegistry).filter((k) => k.toLowerCase().startsWith(lower));
        },
      },
    }),
    {
      title: 'Business Object Schema',
      description:
        'Definitive schema for a single BO: fields with types, required fields, canonical/alternate id fields, relationship metadata (foreign key mappings to other BOs), and an example payload.',
      mimeType: 'application/json',
    },
    async (uri, vars) => {
      const objectType = String(vars.objectType ?? '');
      const schema = boSchemaRegistry[objectType];
      if (!schema) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({ error: `Unknown objectType '${objectType}'` }),
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ objectType, ...schema }, null, 2),
          },
        ],
      };
    }
  );

  // ── bo://semantic-patterns ──────────────────────────────────────────────
  server.registerResource(
    'bo-semantic-patterns',
    'bo://semantic-patterns',
    {
      title: 'Semantic Patterns',
      description:
        'Curated mapping of common LLM intents (e.g. "users in project", "time entries for user") → canonical generic-tool query patterns. Read this before guessing how to compose a query.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({ count: semanticPatterns.length, patterns: semanticPatterns }, null, 2),
        },
      ],
    })
  );
}
