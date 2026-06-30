# Universal BO Access — Design

**Date:** 2026-06-30
**Status:** Approved for planning

## Problem

The generic CRUD tools (`generic_list`, `generic_read`, `generic_add`, `generic_update`,
`generic_delete`, `generic_batch_list`) gate every request on the hand-curated
`boSchemaRegistry` (44 entries):

```ts
if (!boSchemaRegistry[objectType]) return fail(new Error(`Unknown objectType '${objectType}'`));
```

Any business object not in that registry is rejected — even though `BOService` +
`XmlBuilder.buildGet` + `SPPClient.callSPPXML` are already fully generic and would happily
talk to SPP for any BO name. A user tried to query `AttributeSet`: the generated type
`src/types/AttributeSet.ts` exists, but there is no registry entry, so the gate rejects it.

The codebase has **161 generated type files** in `src/types/` (effectively SPP's record map)
versus only **44 curated registry entries** and **159 names** in the `BOName` union. The goal:
**let users query any BO in SuiteProjects Pro**, without hand-curating each one.

## Goals

- Query (and CRUD) any SPP business object through the generic tools.
- Preserve the rich, hand-curated metadata (required fields, relationships, alternate ids,
  examples, semantic patterns) where it exists.
- No per-BO manual work to unlock the long tail.
- Keep the agent able to *discover* what exists and how to call it.

## Non-Goals

- Replicating SPP's authorization model in the server. Writes are authorized by SPP itself.
- Inferring relationships / examples for derived BOs (curate to add these).
- Changing the specialized shortcut tools' behavior (`whoami`, `getUserProfile`, …).

## Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Schema source for non-curated BOs | Derive a lightweight schema from `src/types/*.ts`; curated registry takes precedence |
| 2 | When/how derivation runs | Build-time codegen via the TypeScript compiler API → committed generated file |
| 3 | Write safety for derived/unknown BOs | Full CRUD for all; SPP enforces permissions |
| 4 | Validation strictness | Lenient passthrough for derived/unknown; curated stays strict |
| 5 | Truly-unknown BO names (no type file) | Include a final passthrough layer (full lenient CRUD) |
| 6 | Discoverability | `list_object_types` / `describe_object_type` / `bo://` resources expose all + a `source` marker |
| 7 | Tool descriptions | Rewrite to teach the discovery flow and the "trust SPP" write model |

`whoami` and `getUserProfile` remain dedicated shortcut tools — they encode multi-step
identity/profile logic and are the paved path for common cases. The generic layer is the
long-tail fallback.

## Architecture

Three layers, most-specific wins:

```
Specialized tools   whoami, getUserProfile, …          (unchanged)
        │
Generic CRUD        generic_list/read/add/update/delete/batch_list
        │
Merged registry     curated (44) ▷ derived (~117) ▷ passthrough (anything else)
```

### Merged registry

`boSchemaRegistry.ts` stays the curated, hand-maintained source. A generator emits
`boSchemaRegistry.derived.ts`. A new module merges them with **curated winning**:

```ts
export const mergedRegistry: Record<string, BOSchema> = { ...derived, ...curated };
```

Every generic tool imports `mergedRegistry` instead of `boSchemaRegistry`. The gate now
passes for all curated + derived BOs. For a name in neither, see "Passthrough layer".

Each `BOSchema` gains a `source: 'curated' | 'derived'` discriminator (passthrough schemas
are synthesized on demand with `source: 'passthrough'`).

## Build-time generator

New `scripts/generateDerivedRegistry.ts`, run via `npm run gen:registry` and wired into
`prebuild` (and `dev` startup convenience):

- Walk `src/types/*.ts` with the TypeScript compiler API.
- For each exported BO interface, emit a `BOSchema` with `source: 'derived'`.
- Write `src/services/boSchemaRegistry.derived.ts` (generated, committed — reviewable diff).

### Derivation rules (per interface)

| Field | Rule |
|-------|------|
| `fields` | each property → `{ name, type }`; map `DateContainer`→`'DateContainer'`, `number`→`'number'`, everything else → `'string'`. Drives date normalization. |
| `canonicalId` | `'id'` if the interface has it, else the first field. |
| `alternateIds` | intersection of `['externalid','external_id','code','number']` with actual fields. |
| `requiredFields` | **`[]`** — deliberately not inferred. Generated types mark server-set fields (`created`, `id`, `updated`) as non-optional, which would wrongly block `add`. SPP enforces required fields. |
| `relationships` / `examplePayload` | omitted. Curate a BO to add them. |
| `source` | `'derived'`. |

> Derivation rules are kept simple by design; they will be refined after hands-on testing.

## Validation branching

`buildZodSchemaForBO` (in `normalizeAndValidateBOInput.ts`) gains a mode keyed off the
schema's `source`:

- **curated** → current behavior: `.strict()`, reject unknown fields, enforce `requiredFields`.
- **derived / passthrough** → `.passthrough()`, all fields optional. Known fields are still
  coerced/normalized (dates especially); unknown fields pass straight to SPP, which validates.

`generic_list`'s "Invalid filter field(s)" + semantic-pattern suggestion path fires **only**
for curated BOs (where the field list is authoritative).

## Passthrough layer (truly any BO)

When `objectType` is in neither curated nor derived registries, the tools do **not** reject.
Instead they synthesize a minimal `BOSchema` on the fly:

- `source: 'passthrough'`, `fields: []`, `canonicalId: 'id'`, `alternateIds: []`,
  `requiredFields: []`.
- Validation is lenient passthrough; dates normalized heuristically by shape.
- Full CRUD allowed; SPP is the guardrail.

This honors "query any BO in SPP" even for objects without a generated type file.

## Discoverability

- `list_object_types` → returns the full merged key set (AttributeSet now appears).
- `describe_object_type` → returns the schema **plus its `source`** so the agent knows how
  much metadata to trust; for a passthrough name, returns a minimal descriptor noting no
  curated field list is available.
- `bo://catalog` and `bo://schema/{objectType}` resources updated to match.

## Tool descriptions & discovery affordances

- `generic_list` / `generic_read` / `generic_batch_list`: state that they work for **any** SPP
  business object, and that the agent should call `list_object_types` / `describe_object_type`
  first when unsure of the `objectType` or its fields.
- `generic_add` / `generic_update` / `generic_delete`: note that writes are authorized by SPP
  itself; the server does not pre-validate permissions.
- `objectTypeSchema` param `.describe()`: point to `list_object_types` rather than enumerating
  161 names inline (avoids bloat and staleness).
- `describe_object_type`: nudge the agent to call it before building a filter/payload for an
  unfamiliar object.
- `whoami` / `getUserProfile`: sharpen descriptions so the agent prefers them for
  identity/profile over `generic_list('User', …)`.

## Files touched

| File | Change |
|------|--------|
| `scripts/generateDerivedRegistry.ts` | **new** — codegen from `src/types/*.ts` |
| `src/services/boSchemaRegistry.derived.ts` | **new (generated)** — derived entries |
| `src/services/boSchemaRegistry.ts` | add `source` to `BOSchema`; mark curated entries |
| `src/services/registry.ts` (or similar) | **new** — exports `mergedRegistry` + passthrough resolver |
| `src/utils/normalizeAndValidateBOInput.ts` | source-aware strict vs. lenient validation |
| `src/mcp/tools/genericList.ts` (+ read/add/update/delete/batchList) | import merged registry; passthrough fallback; curated-only suggestion path |
| `src/mcp/tools/listObjectTypes.ts` | merged key set |
| `src/mcp/tools/describeObjectType.ts` | include `source`; passthrough descriptor |
| `src/mcp/tools/*` descriptions + `objectTypeSchema` | rewritten per §8 |
| `package.json` | `gen:registry` script + `prebuild` hook |

## Testing

- **Generator unit test:** `AttributeSet` interface → expected `BOSchema` (fields, `canonicalId='id'`, `requiredFields=[]`, `source='derived'`).
- **Merge precedence:** a curated entry overrides its derived counterpart.
- **Gate unlock:** `generic_list('AttributeSet', …)` passes the gate and builds correct XML.
- **Lenient validation:** an unknown filter field on a derived BO passes through (not rejected).
- **Passthrough:** a BO name with no type file resolves to a passthrough schema and lists.
- **Regression:** curated BOs keep strict validation + required-field enforcement + suggestion path.

## Open items (post-testing)

- Possible refinement of derivation rules (`requiredFields`, `alternateIds` heuristic) once
  the user has tested against real SPP responses.
