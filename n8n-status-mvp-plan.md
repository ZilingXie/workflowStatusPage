# n8n Failure Status Site MVP Plan

## 1. Summary
- Build an internal website focused on failed n8n executions, so ops can quickly locate the exact workflow and execution.
- Core features: failure ingest API, failure list, detail drill-down, status lifecycle (`OPEN -> IN_PROGRESS -> RESOLVED`), admin reopen (`RESOLVED -> OPEN`), resolution reason, admin CSV export.
- Stack: `Next.js (Node.js + TypeScript)` + `PostgreSQL` + `Docker Compose` on EC2.
- Fixed choices: single n8n instance first, failure-only ingest, global Error Workflow, permanent retention, English UI, UTC time, 15s polling, visible within 30s.

## 2. Scope and Success Criteria
### In Scope
- HTTP ingest endpoint for failed executions (Bearer token)
- Persistent storage with idempotent dedupe
- Failure-first list page + incident detail page
- Manual handling workflow and audit trail
- Username/password login (accounts from env config)
- Admin-only reopen and admin-only CSV export

### Out of Scope (MVP)
- External notifications (WeCom/DingTalk/Email)
- Multi-instance ingest
- Success/retry state tracking
- SSO/OIDC

### Success Criteria
- A new failure appears on the page within 30 seconds.
- Ops can reach the n8n execution in 3 steps or fewer.
- Every failure can be moved through statuses with required resolution reason on close.
- Admin can reopen incidents with audit history.

## 3. Public APIs / Interfaces
### `POST /api/v1/ingest/failure`
- Purpose: receive failure events from n8n Error Workflow
- Auth: `Authorization: Bearer <INGEST_TOKEN>`
- Idempotency key: `source_instance + execution_id`
- Duplicate behavior: update existing incident instead of creating a new row

### `POST /api/v1/auth/login`
- Input: `username`, `password`
- Output: HTTP-only session cookie (8h)

### `POST /api/v1/auth/logout`
- Clear session

### `GET /api/v1/incidents`
- Paginated list
- Filters: `status`, `workflow`, `from`, `to`
- Default sort: `failed_at DESC`
- Default page size: `20`

### `GET /api/v1/incidents/:id`
- Incident detail + status-change timeline

### `PATCH /api/v1/incidents/:id/status`
- State transitions:
  - `OPERATOR`: `OPEN -> IN_PROGRESS -> RESOLVED`
  - `ADMIN`: same + `RESOLVED -> OPEN`
- Validation:
  - `RESOLVED` requires `resolution_reason`
  - reopen requires `reopen_reason`

### `GET /api/v1/incidents/export.csv`
- CSV export with current filters
- Admin only

## 4. n8n Ingest Payload Contract
```json
{
  "sourceInstance": "ec2-prod-01",
  "workflowId": "123",
  "workflowName": "Daily Sync",
  "executionId": "456",
  "failedAt": "2026-02-28T01:23:45.000Z",
  "errorMessage": "Request failed with status code 500",
  "errorNodeName": "HTTP Request",
  "errorType": "NodeApiError",
  "errorStack": "optional string",
  "n8nBaseUrl": "https://n8n.example.com"
}
```

### Required fields
- `sourceInstance`
- `workflowId`
- `workflowName`
- `executionId`
- `failedAt`
- `errorMessage`
- `n8nBaseUrl`

### Derived field
- `execution_url = n8nBaseUrl + "/execution/" + executionId`

### Raw payload
- Store full payload JSON for audit and future extension.

## 5. Data Model (PostgreSQL)
### `incidents`
- `id` (uuid, pk)
- `source_instance` (text, not null)
- `workflow_id` (text, not null)
- `workflow_name` (text, not null)
- `execution_id` (text, not null)
- `failed_at` (timestamptz, not null)
- `error_message` (text, not null)
- `error_node_name` (text, null)
- `error_type` (text, null)
- `error_stack` (text, null)
- `execution_url` (text, not null)
- `status` (enum: OPEN, IN_PROGRESS, RESOLVED; default OPEN)
- `resolution_reason` (text, null)
- `resolved_by` (text, null)
- `resolved_at` (timestamptz, null)
- `created_at`, `updated_at` (timestamptz)
- Unique index: `(source_instance, execution_id)`
- Query indexes: `status`, `failed_at desc`, `workflow_name`, `(failed_at, status)`

### `incident_events`
- `id` (uuid, pk)
- `incident_id` (uuid, fk incidents.id)
- `from_status`, `to_status` (enum)
- `action_reason` (text, null)
- `actor_username` (text, not null)
- `actor_role` (text, not null)
- `created_at` (timestamptz)

### `incident_raw_payloads`
- `id` (uuid, pk)
- `incident_id` (uuid, fk)
- `payload` (jsonb, not null)
- `received_at` (timestamptz)

## 6. UI/UX
### `/login`
- Username + password
- Generic error message on failed login

### `/incidents`
- KPI cards: `OPEN`, `IN_PROGRESS`, `RESOLVED`
- Filters: status, workflow, time range
- Columns: failed time (UTC), workflow, execution id, error summary, status, handler, actions
- Default sort: newest failure first
- Auto-refresh: every 15 seconds

### `/incidents/:id`
- Workflow/execution/error summary
- One-click open in n8n execution page
- Status transition actions with required reason on resolve
- Timeline of all status changes

## 7. Auth and Roles
- Account source: env config (`APP_USERS_JSON`)
- Password: bcrypt hash
- Session: HTTP-only cookie + server verification
- Roles:
  - `ADMIN`: full access, reopen, CSV export
  - `OPERATOR`: list/detail and normal lifecycle transitions, no reopen/export

## 8. n8n Integration Design
- Use one global n8n Error Workflow.
- Add an HTTP Request node posting failure payload to `/api/v1/ingest/failure`.
- Add Bearer token header.
- Keep n8n-side retry limited; server-side idempotency handles duplicates safely.

## 9. Deployment and Operations
- Docker Compose services:
  - `app` (Next.js standalone)
  - `db` (PostgreSQL 16)
- Required env:
  - `INGEST_TOKEN`
  - `APP_USERS_JSON`
  - `SESSION_SECRET`
  - `DATABASE_URL`
  - `TZ=UTC`
- Backup:
  - daily `pg_dump` to object storage

## 10. Test Scenarios
- Ingest: create, duplicate update, invalid token (401), missing required field (400)
- Workflow: valid transitions, resolve reason required, operator forbidden reopen, admin reopen works
- List: default sort, filter combinations, pagination (20/page)
- Detail: execution link correctness, timeline completeness
- Export: admin allowed, operator forbidden
- SLA: ingest to visible <= 30s

## 11. Rollout
- Phase 1: core schema + APIs + login + list
- Phase 2: n8n integration and idempotency validation
- Phase 3: production deploy on EC2 via Docker Compose
- Phase 4: one-week stabilization and field quality review

## 12. Assumptions
- One n8n instance initially
- Permanent retention
- No external notification in MVP
- Detail page uses ingest payload only (no n8n re-fetch)
- English UI
- UTC display
- Expected volume: < 500 failed events/day
