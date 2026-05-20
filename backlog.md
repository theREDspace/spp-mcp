# Redspace SPP MCP Server — Tool Backlog

Questions that CANNOT be answered yet, with proposed tools to address them.
All proposed tools are implementable using `SPPClient.list()`, `SPPClient.read()`, `SPPClient.add()`, `SPPClient.update()`, and `SPPClient.delete()` against existing `BORecordMap` business objects — no new infrastructure required.

---

## 💰 Financial / Invoicing / Billing

| User Question | Why It Fails | Proposed Tool |
|---|---|---|
| "Show me all invoices for customer X" | No `Invoice` tool exists | **`list_invoices`** |
| "What's the total billed amount on project X?" | No invoice/billing tool | **`get_project_billing_summary`** |
| "Are there any unpaid invoices?" | No `Invoice` tool | **`list_invoices`** (with status filter) |
| "What are the billing rates for project X?" | No `ProjectPricing` / `Ratecard` tool | **`list_project_pricing`** |
| "Show me all payments received this month" | No `Payment` tool | **`list_payments`** |

### Proposed Tools

| Tool Name | BO Used | Description | Key Params |
|---|---|---|---|
| `list_invoices` | `Invoice` | List invoices with filters for customer, project, status, dates | `customer_id?, project_id?, status?, start_date?, end_date?, limit, offset` |
| `get_invoice` | `Invoice` | Get a single invoice by ID | `invoice_id` |
| `list_project_pricing` | `ProjectPricing`, `Ratecard`, `RateCardItem` | Get billing rates/pricing for a project | `project_id` |
| `list_payments` | `Payment` | List payments with date/customer filters | `customer_id?, start_date?, end_date?, limit, offset` |

---

## 🏢 Customer / Client Management

| User Question | Why It Fails | Proposed Tool |
|---|---|---|
| "List all our clients/customers" | No `Customer` tool exists | **`list_customers`** |
| "What projects does customer X have?" | Can't filter projects by customer easily | **`list_customers`** + `list_projects` with `customerid` filter |
| "Who are the contacts for client X?" | No `Contact` tool | **`list_contacts`** |
| "Show me all customer purchase orders" | No `Customerpo` tool | **`list_customer_pos`** |

### Proposed Tools

| Tool Name | BO Used | Description | Key Params |
|---|---|---|---|
| `list_customers` | `Customer` | List/search customers | `query?, active_only?, limit, offset` |
| `get_customer` | `Customer` | Full customer details by ID | `customer_id` |
| `list_contacts` | `Contact` | List contacts for a customer | `customer_id?, limit, offset` |
| `list_customer_pos` | `Customerpo` | List purchase orders | `customer_id?, project_id?, limit, offset` |

---

## 📊 Budgets & Estimates

| User Question | Why It Fails | Proposed Tool |
|---|---|---|
| "What's the budget remaining on project X?" | No `Budget` / `BudgetAllocation` tool | **`get_project_budget`** |
| "Show me budget vs actuals for project X" | No composite budget tool | **`get_project_budget_vs_actual`** |
| "What are the estimates for project X?" | No `Estimate` tool | **`list_estimates`** |
| "What are the estimate phases and labor breakdown?" | No `EstimateLabor`/`EstimatePhase` tools | **`get_estimate_details`** |

### Proposed Tools

| Tool Name | BO Used | Description | Key Params |
|---|---|---|---|
| `get_project_budget` | `Budget`, `BudgetAllocation`, `ProjectBudgetTransaction` | Budget details and remaining for a project | `project_id` |
| `get_project_budget_vs_actual` | `Budget`, `Slip`, `ActualCost` | Compare budgeted vs actual time/cost | `project_id, start_date?, end_date?` |
| `list_estimates` | `Estimate` | List estimates for a project | `project_id?, limit, offset` |
| `get_estimate_details` | `Estimate`, `EstimatePhase`, `EstimateLabor`, `EstimateExpense` | Detailed estimate breakdown | `estimate_id` |

---

## 🐛 Issues & Tickets

| User Question | Why It Fails | Proposed Tool |
|---|---|---|
| "Show open issues on project X" | No `Issue` tool | **`list_issues`** |
| "What bugs are assigned to me?" | No `Issue` tool | **`list_issues`** (user filter) |
| "What issue categories/severities exist?" | No metadata tools | **`list_issue_metadata`** |

### Proposed Tools

| Tool Name | BO Used | Description | Key Params |
|---|---|---|---|
| `list_issues` | `Issue` | List issues with project/user/status filters | `project_id?, user_id?, status?, severity?, limit, offset` |
| `get_issue` | `Issue` | Get full issue details | `issue_id` |
| `list_issue_metadata` | `IssueCategory`, `IssueSeverity`, `IssueSource`, `IssueStage`, `IssueStatus` | List available categories, severities, stages | *(none required)* |

---

## 💼 Deals & Sales Pipeline

| User Question | Why It Fails | Proposed Tool |
|---|---|---|
| "What deals are in the pipeline?" | No `Deal` tool | **`list_deals`** |
| "Which projects are linked to deal X?" | No `DealToProject` tool | **`get_deal_details`** |
| "What's the deal schedule/forecast?" | No `DealSchedule` tool | **`get_deal_details`** |

### Proposed Tools

| Tool Name | BO Used | Description | Key Params |
|---|---|---|---|
| `list_deals` | `Deal` | List deals with optional status filter | `status?, customer_id?, limit, offset` |
| `get_deal_details` | `Deal`, `DealContact`, `DealSchedule`, `DealToProject` | Full deal with contacts, schedule, linked projects | `deal_id` |

---

## 🏖️ Leave / PTO / Scheduling

| User Question | Why It Fails | Proposed Tool |
|---|---|---|
| "How much PTO do I have left?" | No `LeaveAccrualTransaction` tool | **`get_leave_balance`** |
| "What are my scheduled exceptions (holidays/PTO)?" | No `Scheduleexception` tool | **`list_schedule_exceptions`** |
| "What's my work schedule?" | No `UserWorkSchedule` tool | **`get_work_schedule`** |
| "Show pending schedule requests" | No `Schedulerequest` tool | **`list_schedule_requests`** |

### Proposed Tools

| Tool Name | BO Used | Description | Key Params |
|---|---|---|---|
| `get_leave_balance` | `LeaveAccrualTransaction`, `LeaveAccrualRule`, `LeaveAccrualRuleToUser` | Current PTO/leave balance for a user | `user_id?` |
| `list_schedule_exceptions` | `Scheduleexception` | Holidays, PTO, time-off entries | `user_id?, start_date?, end_date?` |
| `get_work_schedule` | `UserWorkSchedule`, `WorkScheduleWorkHour` | User's configured work schedule | `user_id?` |
| `list_schedule_requests` | `Schedulerequest`, `Schedulerequest_item` | List schedule/leave requests | `user_id?, status?, limit, offset` |

---

## 📋 Expenses & Purchasing

| User Question | Why It Fails | Proposed Tool |
|---|---|---|
| "Show my expense reports" | No `Reimbursement` tool | **`list_expenses`** |
| "What purchase orders are pending?" | No `PurchaseOrder` tool | **`list_purchase_orders`** |
| "What purchase requests need approval?" | No `PurchaseRequest` tool | **`list_purchase_requests`** |

### Proposed Tools

| Tool Name | BO Used | Description | Key Params |
|---|---|---|---|
| `list_expenses` | `Reimbursement` | List expense reports/reimbursements | `user_id?, project_id?, status?, start_date?, end_date?, limit, offset` |
| `list_purchase_orders` | `PurchaseOrder`, `PurchaseItem` | List POs with optional filters | `project_id?, vendor_id?, status?, limit, offset` |
| `list_purchase_requests` | `PurchaseRequest`, `Request_item` | List purchase requests | `user_id?, status?, limit, offset` |

---

## 🏗️ Resource Management (Advanced)

| User Question | Why It Fails | Proposed Tool |
|---|---|---|
| "Show open resource requests" | No `ResourceRequest` tool | **`list_resource_requests`** |
| "What skills/profiles are needed?" | No `ResourceProfile` tool | **`list_resource_profiles`** |
| "Show pending booking requests" | No `BookingRequest` tool | **`list_booking_requests`** |

### Proposed Tools

| Tool Name | BO Used | Description | Key Params |
|---|---|---|---|
| `list_resource_requests` | `ResourceRequest`, `ResourceRequestQueue` | List open/pending resource requests | `project_id?, status?, limit, offset` |
| `list_booking_requests` | `BookingRequest`, `PendingBooking` | Booking requests pending approval | `user_id?, project_id?, status?, limit, offset` |

---

## 🏛️ Organizational Structure

| User Question | Why It Fails | Proposed Tool |
|---|---|---|
| "What departments do we have?" | No `Department` tool | **`list_departments`** |
| "What roles exist in the system?" | No `Role` tool | **`list_roles`** |
| "What cost centers do we have?" | No `CostCenter` tool | **`list_cost_centers`** |
| "Show me the project hierarchy" | No `Hierarchy`/`HierarchyNode` tool | **`get_project_hierarchy`** |
| "What job codes are available?" | Already accessible via `Jobcode` BO but no tool | **`list_job_codes`** |

### Proposed Tools

| Tool Name | BO Used | Description | Key Params |
|---|---|---|---|
| `list_departments` | `Department` | List all departments | `limit, offset` |
| `list_roles` | `Role` | List all roles | `limit, offset` |
| `list_cost_centers` | `CostCenter` | List all cost centers | `limit, offset` |
| `list_job_codes` | `Jobcode` | List available job codes | `limit, offset` |
| `get_project_hierarchy` | `Hierarchy`, `HierarchyNode` | Get project hierarchy tree | `hierarchy_id?` |

---

## 📰 Activity & History

| User Question | Why It Fails | Proposed Tool |
|---|---|---|
| "What changed on project X recently?" | No `History`/`HistoryNotes` tool | **`list_project_history`** |
| "Show me the news feed" | No `NewsFeed`/`NewsFeedMessage` tool | **`list_news_feed`** |
| "What are my to-do items?" | No `Todo` tool | **`list_todos`** |
| "What events are scheduled?" | No `Event` tool | **`list_events`** |

### Proposed Tools

| Tool Name | BO Used | Description | Key Params |
|---|---|---|---|
| `list_project_history` | `History`, `HistoryNotes` | Audit/change history for a project | `project_id, limit, offset` |
| `list_todos` | `Todo` | List to-do items | `user_id?, completed?, limit, offset` |
| `list_events` | `Event` | List scheduled events | `project_id?, user_id?, start_date?, end_date?, limit, offset` |

---

## ✍️ Write Operations (Currently ALL read-only)

| User Question | Why It Fails | Proposed Tool |
|---|---|---|
| "Log 8 hours to project X today" | No write tool for `Slip` | **`create_time_entry`** |
| "Submit my timesheet" | No timesheet action tool | **`submit_timesheet`** |
| "Create a booking for me on project X" | No write tool for `Booking` | **`create_booking`** |
| "Update task X to 75% complete" | No write tool for `ProjectTask` | **`update_project_task`** |
| "Approve John's timesheet" | No approval tool | **`approve_timesheet`** |

### Proposed Tools

| Tool Name | BO Used / Method | Description | Key Params |
|---|---|---|---|
| `create_time_entry` | `client.add('Slip', ...)` | Log time to a project/task | `project_id, task_id?, date, hours, notes?` |
| `update_time_entry` | `client.update('Slip', ...)` | Modify an existing time entry | `slip_id, hours?, notes?, date?` |
| `delete_time_entry` | `client.delete('Slip', ...)` | Delete a time entry | `slip_id` |
| `submit_timesheet` | `client.update('Timesheet', ...)` | Submit a timesheet for approval | `timesheet_id` |
| `approve_timesheet` | `client.update('Timesheet', ...)` | Approve/reject a timesheet | `timesheet_id, action: 'approve'\|'reject', notes?` |
| `create_booking` | `client.add('Booking', ...)` | Create a resource booking | `project_id, user_id?, start_date, end_date, hours` |
| `update_project_task` | `client.update('ProjectTask', ...)` | Update task fields | `task_id, percent_complete?, name?, notes?` |

---

## Prioritization

### 🔴 High Priority (most user-demanded)
1. **`create_time_entry`** / **`update_time_entry`** — The #1 ask for any time-tracking system
2. **`submit_timesheet`** — Enables end-to-end timesheet workflow
3. **`list_customers`** / **`get_customer`** — Foundational for financial questions
4. **`get_project_budget`** — Budget health is critical for PMs
5. **`list_expenses`** — Expense tracking via conversational AI

### 🟡 Medium Priority
6. **`list_invoices`** — Finance team visibility
7. **`get_leave_balance`** / **`list_schedule_exceptions`** — Employee self-service
8. **`list_issues`** — Project issue tracking
9. **`list_deals`** — Sales pipeline visibility
10. **`approve_timesheet`** — Manager workflow

### 🟢 Low Priority (power-user / admin)
11. **`list_departments`** / **`list_roles`** / **`list_job_codes`** — Org structure
12. **`list_project_history`** — Audit trail
13. **`list_resource_requests`** — Resource management
14. **`list_purchase_orders`** — Procurement

---

## 🐛 Known Issues & Improvements

### Issue #1: Status/Stage Codes Need Human-Readable Labels

**Problem:** When fetching project details, status and stage fields return numeric codes (e.g., `12`, `5`) instead of meaningful labels (e.g., "Active", "On Hold", "Completed").

**Impact:** Users get cryptic numeric values that are not actionable without a separate lookup.

**Example:**
```
"What's the status of project X?"
Response: "Status is 12" (not helpful)
```

**Solution:** Add a `get_status_mappings` / `get_stage_mappings` tool or enrich responses with descriptive labels.

**Proposed Tool:**
| Tool Name | BO Used | Description | Key Params |
|---|---|---|---|
| `get_status_code_mapping` | `ProjectStage` | Fetch human-readable labels for project status/stage codes | `code?` (optional; if not provided, return all) |

---

### Issue #2: User IDs Instead of User Names in Bookings

**Problem:** `list_bookings` returns user IDs (e.g., "User ID 111") but not the actual user names, making responses hard to read.

**Impact:** Users have to do manual lookups or ask follow-up questions to get meaningful names.

**Example:**
```
"Who is booked on project Shubi?"
Response: "User ID 111: Booked Sep 1–Sep 14, 2023, at 50%"
Better: "John Smith (User ID 111): Booked Sep 1–Sep 14, 2023, at 50%"
```

**Solution:** Enrich `list_bookings` response by batch-fetching user names via `client.batchList('User', ...)`.

**Impact:** This improvement should also apply to:
- `list_bookings` — include user names
- `list_time_entries` — include user names
- `list_project_assignments` — include user names
- `get_booking_summary` — include user names in the `by_project` breakdown

---

### Issue #3: `list_project_assignments` Returns Errors

**Problem:** When calling `list_project_assignments` on projects that work fine with other tools, the API returns errors or returns no data.

**Example:**
```
"Who is assigned to project Shubi?"
Error: [No assignment information could be retrieved]
```

But `list_bookings` for the same project works fine and returns data.

**Root Cause:** Unclear — could be:
- SPP API limitation or permission issue with the ProjectAssign BO
- Client-side filtering issue
- Missing pagination handling

**Solution:** 
- Investigate why `list_project_assignments` fails while `list_bookings` works
- Consider using `Booking` data as an alternative if `ProjectAssign` is unreliable
- Add fallback logic or better error reporting

---

### Issue #4: "Invalid Limit Clause" Error in `get_booking_summary`

**Problem:** When calling `get_booking_summary` with certain date ranges, the system returns: `"Invalid limit clause specified in the query"`

**Example:**
```
"Am I over- or under-utilized this month?"
Error: Invalid limit clause specified in the query
```

**Root Cause:** Likely the `SPPClient.list()` method is building malformed XML queries when certain limit/offset combinations are used, particularly with the `Booking` BO.

**Solution:**
- Debug the XML generation in `SPPClient.callSPPXML()` for the Booking BO
- Verify limit/offset values are valid for this BO
- Add validation/sanitization before sending queries
- Consider implementing pagination differently for this BO

---

## 🔧 Data Enrichment & UX Improvements

### Suggested Enhancements to Existing Tools

All tools that return user IDs should be enriched with user names:

| Tool | Enhancement |
|---|---|
| `list_bookings` | Add `user_name` field to each booking entry |
| `list_time_entries` | Add `user_name` field and batch-fetch project/task names |
| `list_project_assignments` | Add `user_name`, `user_email`, `user_nickname` fields |
| `get_booking_summary` | Add `user_name`, include `user_email` in response |
| `list_project_tasks` | Already returns `task_name` ✅ |

### Status/Stage Code Mapping

| Tool | Enhancement |
|---|---|
| `get_project` | Return both numeric `status_code` AND human-readable `status_label` |
| `list_projects` | Include status labels alongside status codes |

---

---

### Issue #5: `list_project_tasks` Returns Errors

**Problem:** When calling `list_project_tasks` on projects that work fine with other tools (e.g., `get_project`, `list_bookings`), the API returns errors or fails silently.

**Example:**
```
"What tasks are on project Shubi?"
Error: [Unable to retrieve tasks for the project]

"Show all tasks including completed ones"
Error: [Persistent error, even with active_only=false]
```

**Root Cause:** Similar to Issue #3. Could be:
- SPP API limitation or permission issue with the ProjectTask BO
- Client-side filtering issue with projectid filter
- Pagination/limit problems
- Missing error handling for empty result sets

**Related To:** Issue #3 (`list_project_assignments` also fails on the same project)

**Solution:**
- Investigate why `list_project_tasks` fails while `get_project` works
- Check if ProjectTask BO requires different query formatting
- Add permission/role checks
- Improve error messages to distinguish "no data" from "no permission" from "API error"

---

### Issue #6: No Milestone Data in Project Details

**Problem:** When fetching project details via `get_project`, there is no milestone or phase breakdown included. Users expect to see milestones as part of project information, but they're not returned.

**Example:**
```
"What milestones are defined for project Shubi?"
Response: "No milestone data available in the project record"
```

**Root Cause:** 
- Milestones/phases may be stored separately as `ProjectTask` records with `classification='M'` or `classification='P'`
- Project BO itself may not include milestone references
- May require a separate query against ProjectTask BO

**Solution:**
- Document that milestones are accessible via `list_project_tasks` (when it works)
- Consider adding a dedicated tool: **`get_project_milestones`** that calls `list_project_tasks` with a `classification='M'` filter
- Or enrich `get_project` response with a pre-fetched milestone array

**Proposed Tool:**
| Tool Name | BO Used | Description | Key Params |
|---|---|---|---|
| `get_project_milestones` | `ProjectTask` | Get milestones and phases for a project (filtered from ProjectTask by classification) | `project_id, include_phases?: boolean` |

---

### Issue #7: Permission/Access Issues Across Multiple Tools

**Problem:** Multiple tools fail on the same project, suggesting potential permission restrictions rather than data unavailability. However, error messages don't distinguish between:
- User lacks permission to view this data
- Data doesn't exist
- API/backend error
- Query malformation

**Examples:**
```
"Who is assigned to project Shubi?" → Error
"What tasks are on project Shubi?" → Error
"Who is booked on project Shubi?" → Works fine ✓
```

**Impact:** Users are confused about whether:
- They don't have permission (would need to contact admin)
- There's a system issue (would need to retry or escalate)
- The data genuinely doesn't exist (can proceed with another query)

**Observations:**
- `list_bookings` succeeds on the same project
- `get_project` succeeds on the same project
- `list_project_assignments` fails
- `list_project_tasks` fails

This pattern suggests either:
1. **Permission issue:** User may not have ProjectAssign or ProjectTask read permissions
2. **BO-specific issue:** Those particular BOs have API/query issues
3. **Mixed:** Some combination of the above

**Solution:**
1. Add permission detection: Check if errors are due to 403 Forbidden vs other error codes
2. Enhance error messages to include: 
   - Distinct messages for "Permission denied", "No data found", "API error"
   - Suggestion to contact admin if it's a permission issue
3. Add a diagnostic tool: **`check_data_access`** that tests read access to common BOs
4. Log which BOs are accessible vs not for each user session

**Proposed Tool:**
| Tool Name | BO Used | Description | Key Params |
|---|---|---|---|
| `check_data_access` | Multiple | Diagnostic tool to test read permissions across key BOs for the authenticated user | `(none)` - returns access status for: Project, User, Slip, Booking, ProjectTask, ProjectAssign, Invoice, Customer, etc. |

---

### Issue #8: Inconsistent API Error Handling & Reporting

**Problem:** When API calls fail, error messages are vague and don't provide actionable information. Multiple different error types are lumped into generic messages.

**Examples:**
```
"Invalid limit clause specified in the query"
→ Which BO? Which parameter? How to fix?

"Unable to retrieve assignment information"
→ Is it a permission error? A query error? Does the data exist?

"There was an error retrieving that information from the system"
→ Too generic; user doesn't know if they should retry or contact support
```

**Impact:** 
- Users can't troubleshoot issues
- Support team gets vague tickets
- Makes it hard to identify root causes (API issue vs permission vs query syntax)

**Solution:**
- Enhance error responses to include:
  - Error code/category (e.g., PERMISSION_DENIED, QUERY_ERROR, API_TIMEOUT, NOT_FOUND)
  - Specific BO and filter that caused the error
  - SPP API error details (if available)
  - Suggested next steps (retry, contact admin, use alternative query, etc.)
- Add structured error logging for debugging
- Add retry logic with exponential backoff for transient errors

**Example Better Error Response:**
```json
{
  "error": true,
  "type": "QUERY_ERROR",
  "message": "Cannot list ProjectTask for project 125",
  "details": {
    "bo": "ProjectTask",
    "filter": { "projectid": "125" },
    "limit": 1000,
    "spp_error": "Invalid limit clause specified in the query",
    "suggestion": "Try with limit=100 or contact admin if issue persists"
  }
}
```

---

## Summary: Issues Blocking User Workflows

| Issue | Severity | Affects Tools | User Impact | Status |
|---|---|---|---|---|
| #1: Status Codes | 🟡 Medium | `get_project`, `list_projects` | Cryptic numeric responses | ✅ Fixed — `status_label` added |
| #2: Missing User Names | 🟡 Medium | `list_bookings`, `list_time_entries`, `list_project_assignments`, `get_booking_summary` | Hard to read responses | ✅ Fixed for `list_bookings`; others pending |
| #3: `list_project_assignments` Errors | 🔴 High | `list_project_assignments` | Complete workflow blocker | 🔒 Permission issue — SPP admin must grant ProjectAssign READ to PM role |
| #4: Invalid Limit Clause | 🔴 High | `get_booking_summary` | Utilization queries fail | ✅ Fixed — Slip limit 5000→1000, added `type:'T'` filter |
| #5: `list_project_tasks` Errors | 🔴 High | `list_project_tasks` | Cannot see project tasks/milestones | 🔒 Permission issue — SPP admin must grant ProjectTask READ to PM role |
| #6: No Milestone Data | 🟡 Medium | `get_project` | Milestone info not accessible from project details | 🔒 Blocked by #5 (same permission) |
| #7: Permission Issues | 🔴 High | Multiple | Unclear if user should retry, contact admin, or try alternative | ✅ Improved — structured error responses with `type` + `suggestion` |
| #8: Vague Error Messages | 🔴 High | All tools | Cannot troubleshoot failures | ✅ Fixed — `errorResponse()` now emits `type`, `bo`, `suggestion` |

---

## 🔒 Security & Infrastructure Issues

### Issue #9: `/oauth/register` Returns `client_secret` to Unauthenticated Callers

**Problem:** The DCR endpoint (`POST /oauth/register`) returns `SPP_CLIENT_SECRET` to any caller without authentication. The endpoint is publicly reachable as it is advertised in `/.well-known/oauth-authorization-server`.

**Root Cause:** SPP does not support PKCE for API Integration apps (both `oauthAuthorize.ts` and `oauthToken.ts` strip PKCE params). Because mcp-remote clients need `client_secret` to complete the token exchange, the DCR response must include it. However, there was no access control on who could request it.

**Impact:** Any party that can reach the server can retrieve `SPP_CLIENT_SECRET` with a single unauthenticated POST, allowing them to initiate OAuth flows on behalf of the registered app.

**Status: ✅ Partially mitigated** — Added optional `REGISTRATION_SECRET` env var guard and `Cache-Control: no-store` response header. When `REGISTRATION_SECRET` is set, callers must supply it as `Authorization: Bearer <secret>`. When not set, behaviour is unchanged (backwards-compatible for existing deployments).

**Remaining risk:** On publicly-reachable servers where `REGISTRATION_SECRET` is not configured, the endpoint is still open. For production deployments, always set `REGISTRATION_SECRET`.

**Long-term solution:** Implement per-client credential issuance (proper RFC 7591 DCR) so each registered client gets its own short-lived credentials rather than sharing the upstream SPP secret.

---

### Issue #10: `get_booking_summary` Silently Truncates Results Beyond 1000 Records

**Problem:** Both the `Booking` and `Slip` queries in `get_booking_summary` are capped at 1000 records fetched from SPP, with date filtering applied client-side afterward. Any user with more than 1000 lifetime bookings or time entries will silently receive incomplete summaries with no warning.

**Root Cause:** SPP's XML API does not support server-side date range filtering for these BOs, so the tool must fetch all records first and filter locally. The cap was reduced from 5000 → 1000 to respect SPP's API limits, but the truncation is now silent.

**Impact:** PMs or senior staff with long tenures (>1000 Slips lifetime) will see incorrect utilization data without knowing it.

**Proposed Solution:**
- Add a `warning` field to the response when the result count equals the limit (indicating possible truncation): `"warning": "Result may be incomplete: 1000 records fetched (limit reached). Narrow the date range for accurate results."`
- Or implement server-side pagination: loop `list()` calls until all pages are exhausted, then filter by date.

**Priority:** 🟡 Medium — affects users with long tenures; no data loss, just silent inaccuracy.

---

### Issue #11: `list_project_tasks` and `list_project_tasks` Hard-code `limit=1000`

**Problem:** `listProjectTasks.ts` fetches all tasks with `client.list('ProjectTask', filter, 1000, 0)` and does client-side offset/limit. Projects with more than 1000 tasks will silently return incomplete results. The same applies to `list_project_assignments` which uses `limit=200`.

**Impact:** Low for typical projects, but could affect large enterprise projects with many sub-tasks.

**Proposed Solution:** Add a `total_count` vs `count` discrepancy check and emit a `warning` field if tasks were truncated. Or paginate until exhausted.

**Priority:** 🟢 Low — most projects have far fewer than 200–1000 tasks.

---

### Issue #12: `ProjectStage` Cache is Process-Global (Shared Across OAuth Sessions)

**Problem:** The `projectStage.ts` module-level cache (`stageCache`) is shared across all authenticated users in the same process. If User A's token can access `ProjectStage` but User B's cannot, User A's successful fetch will populate the cache and serve it to User B — or vice versa, a failed fetch from User B will leave the cache cold until TTL expires.

**Root Cause:** Stage data is SPP-account-level configuration, not user-specific, so in practice different users in the same SPP account will see the same stages. For a single-tenant deployment this is correct. For a multi-tenant deployment (multiple SPP accounts sharing one process) this would be wrong.

**Impact:** Negligible for single-tenant (current deployment). Would be a bug in multi-tenant scenarios.

**Proposed Solution:** For multi-tenant safety, key the cache by SPP URL (`process.env.SPP_URL`) or tenant namespace if available.

**Priority:** 🟢 Low — not an issue in single-tenant deployment.

---

### Issue #13: `.env.sample` Does Not Document `REGISTRATION_SECRET`

**Problem:** The new `REGISTRATION_SECRET` env var added to `oauthRegister.ts` is not documented in `.env.sample`, so operators setting up a new deployment won't know it exists.

**Proposed Solution:** Add `# REGISTRATION_SECRET=<random-secret>  # Optional: restrict /oauth/register to bearers of this token` to `.env.sample`.

**Priority:** 🟢 Low — documentation gap, not a functional bug.

