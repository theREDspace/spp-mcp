# Changelog

## [Unreleased] — feature/generic-bo-tools branch

### 🚀 Added
- **Generic CRUD Tools for All BOs:**
  - New generic CRUD agent/LLM tools: `generic_read`, `generic_list`, `generic_batchList`, `generic_add`, `generic_update`, `generic_delete` for any business object registered.
  - Type-safe dynamic registry at `src/services/boSchemaRegistry.ts` (canonical/alternate IDs, required fields, filter and payload examples).
- **Schema Discovery and Introspection:**
  - `list_object_types` — discover all supported business objects
  - `describe_object_type` — introspect schema, main fields, examples for any BO
- Example implementation for Project, User, Slip, Customer, Timesheet, Task, Invoice, ApprovalLine, Booking, ResourceProfile

### 🛠 Changed
- Refactored tool registry/loading in MCP agent code to include all new generic and discovery tools

### 📖 Docs & Planning
- Updated README to highlight the generic tools, agent schema introspection, and migration status
- This changelog started on the feature branch for reviewer/auditor convenience

### ⚠️ Known
- Field normalization/validation, dynamic tool doc gen, and advanced agent usability checks are ongoing for this feature branch
- Side-by-side with mainline; no legacy code/route removal yet
