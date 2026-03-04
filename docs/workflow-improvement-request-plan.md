# Workflow Improvement Request Module Plan

## 1. Background and Goals

This module extends the current workflow incident system with a dedicated tracking space for:

- Improvement requests for existing workflows.
- New workflow demand requests.

The goal is to provide a consistent lifecycle for collection, triage, planning, execution, and closure with clear ownership, auditability, and role governance.

## 2. Scope

### In Scope

- Unified request model for both request types:
  - Existing workflow improvement (`IMPROVEMENT`)
  - New workflow demand (`NEW_WORKFLOW`)
- Dedicated pages:
  - `/workflow-requests`
  - `/workflow-requests/new`
  - `/workflow-requests/:id`
- Optional incident linkage (`sourceIncidentId`) for traceability.
- Status transition audit events.
- Comment collaboration.
- ADMIN CSV export.
- Quick-create entry from incident detail page.

### Out of Scope

- Runtime business logic changes to existing incident ingestion and lifecycle.
- Notification channels (email/IM/webhook).
- Historical backfill from old incidents in this phase.
- Attachment upload.
- Comment version history (only current content retained).

## 3. Data Model Design

Add new data entities in Prisma:

### WorkflowRequest

Core request record for both request types.

- `id` (uuid, pk)
- `type` (`IMPROVEMENT` | `NEW_WORKFLOW`)
- `title` (text, required)
- `description` (text, required)
- `workflowName` (text, optional, for existing workflow context)
- `workflowReference` (text, optional, URL/ID/reference)
- `requestedWorkflowName` (text, optional, mainly for new workflow demand)
- `businessGoal` (text, optional)
- `expectedTrigger` (text, optional)
- `priority` (`L` | `M` | `H`, reuse existing enum)
- `status` (`PROPOSED` | `TRIAGED` | `PLANNED` | `IN_PROGRESS` | `DONE` | `REJECTED`)
- `proposedBy` (text, required)
- `assigneeUsername` (text, optional, single owner)
- `sourceIncidentId` (uuid, nullable FK to `Incident`)
- `createdAt`, `updatedAt` (timestamptz)

Suggested indexes:

- `status`
- `type`
- `priority`
- `workflowName`
- `assigneeUsername`
- `createdAt desc`
- `sourceIncidentId`

### WorkflowRequestEvent

Immutable audit entries for key lifecycle actions.

- `id` (uuid, pk)
- `requestId` (uuid, fk)
- `eventType` (e.g. `STATUS_CHANGED`, `ASSIGNEE_CHANGED`, `CREATED`)
- `fromStatus`, `toStatus` (nullable enums)
- `fromAssignee`, `toAssignee` (nullable text)
- `actionReason` (text, nullable)
- `actorUsername` (text, required)
- `actorRole` (enum `UserRole`, required)
- `createdAt` (timestamptz)

### WorkflowRequestComment

Comment stream for request collaboration.

- `id` (uuid, pk)
- `requestId` (uuid, fk)
- `authorUsername` (text, required)
- `authorRole` (enum `UserRole`, required)
- `content` (text, required)
- `createdAt`, `updatedAt` (timestamptz)

Comment policy for this phase:

- Author can edit own comments.
- ADMIN can delete comments.
- No version snapshots retained.

## 4. API Design

Add a new API namespace: `/api/v1/workflow-requests*`.

### Collection APIs

- `POST /api/v1/workflow-requests`
  - Create request (OPERATOR/ADMIN).
- `GET /api/v1/workflow-requests`
  - List requests with filters and pagination.

### Item APIs

- `GET /api/v1/workflow-requests/:id`
  - Return detail with events and comments.
- `PATCH /api/v1/workflow-requests/:id`
  - Update base fields under role/state constraints.
- `PATCH /api/v1/workflow-requests/:id/status`
  - Status transition endpoint.
- `PATCH /api/v1/workflow-requests/:id/assignee`
  - Set or change single assignee.

### Comment APIs

- `POST /api/v1/workflow-requests/:id/comments`
- `PATCH /api/v1/workflow-requests/:id/comments/:commentId`
- `DELETE /api/v1/workflow-requests/:id/comments/:commentId`

### Export API

- `GET /api/v1/workflow-requests/export.csv`
  - ADMIN only.
  - Supports current list filters.

## 5. Permission and Status Governance

### Role Rules

- `OPERATOR` and `ADMIN` can create requests.
- `ADMIN` controls key status transitions and assignee changes.
- `OPERATOR` cannot perform privileged transitions.

### Status Flow

Main progression:

`PROPOSED -> TRIAGED -> PLANNED -> IN_PROGRESS -> DONE`

Rejection path:

`TRIAGED/PLANNED/IN_PROGRESS -> REJECTED`

### Validation Rules

- `DONE` requires non-empty `actionReason`.
- `REJECTED` requires non-empty `actionReason`.
- Assignee must be a valid configured user from account config.
- Terminal states (`DONE`, `REJECTED`) are final in v1 (no reopen).

### Comment Rules

- Author can edit own comments.
- ADMIN can delete any comment.
- Keep latest comment content only (no edit history snapshots in v1).

## 6. Frontend Pages and Entry Points

Add dedicated module pages:

- `/workflow-requests` (list, filters, pagination)
- `/workflow-requests/new` (create form with type-aware fields)
- `/workflow-requests/:id` (detail, events, comments, actions)

Integrate with incident page:

- Add a quick-create button on `/incidents/:id`:
  - Redirects to `/workflow-requests/new` with prefilled query params:
    - `type=IMPROVEMENT`
    - `sourceIncidentId`
    - workflow-related defaults

UI behavior defaults:

- No auto-refresh for workflow request pages.
- Keep existing style system and responsive behavior.

## 7. Test and Acceptance Criteria

### Core Functional Cases

- Create `IMPROVEMENT` request successfully.
- Create `NEW_WORKFLOW` request successfully with dedicated fields.
- Incident-linked creation persists `sourceIncidentId`.
- List filters (type/status/priority/workflow/assignee/time) work correctly.
- Detail page returns events and comments in expected order.

### Permission and Lifecycle Cases

- OPERATOR cannot perform ADMIN-only transitions.
- Valid ADMIN transitions succeed.
- Invalid transition paths are rejected.
- `DONE`/`REJECTED` without reason are rejected.

### Comment Cases

- Author can edit own comment.
- Non-author OPERATOR cannot edit others' comments.
- ADMIN can delete comments.

### Export Cases

- ADMIN CSV export allowed.
- OPERATOR CSV export forbidden.

### Regression Checks

- Existing incident pages and APIs remain unaffected.
- Existing auth/session behavior remains unchanged.

## 8. Risks and Rollback Strategy

### Risks

- Permission edge cases may cause unauthorized edits.
- Transition guards may be bypassed if validation is inconsistent.
- New list filters may impact query performance as data grows.

### Mitigation

- Centralize permission and transition guard logic.
- Add explicit negative tests for forbidden operations.
- Add targeted DB indexes on common filter fields.

### Rollback Strategy

- Keep migration isolated for this module.
- If issues occur post-deploy:
  - Disable route exposure in UI navigation first.
  - Keep data intact for investigation.
  - Roll back application version while preserving DB records.

## 9. Implementation Milestones

- `M1`: Prisma schema updates + migration for workflow request entities.
- `M2`: API routes + validation + permission guards.
- `M3`: `/workflow-requests`, `/workflow-requests/new`, `/workflow-requests/:id`.
- `M4`: Incident detail quick-create integration.
- `M5`: CSV export + comment edit/delete policy implementation.
- `M6`: Self-test, regression pass, and docs/progress updates.

## 10. Public API / Interface / Type Impact

- No runtime interface is changed in this documentation-only step.
- This plan defines future additions under `/api/v1/workflow-requests*`.
- New collaboration docs introduced:
  - `docs/workflow-improvement-request-plan.md`
  - `docs/workflow-improvement-request-progress.mc`

## 11. Assumptions and Defaults

- `.mc` file is maintained as plain Markdown text.
- Files are placed under `docs/`.
- Content language starts in English and can be localized later.
- This plan is execution-ready and intended for immediate implementation.
