# Workflow Improvement Request Progress Tracker

- Owner: TBD
- Start Date: 2026-03-04
- Last Updated: 2026-03-04
- Overall Status: In Progress
- Progress: 92%

## Milestones

- [x] M1: Prisma schema + migration
- [x] M2: API routes + validation + permission guards
- [x] M3: List/New/Detail pages
- [x] M4: Incident detail quick-create integration
- [x] M5: CSV export + comment management
- [ ] M6: Self-test + docs update

## Tasks

- [x] Add enums: WorkflowRequestType, WorkflowRequestStatus
- [x] Add models: WorkflowRequest, WorkflowRequestEvent, WorkflowRequestComment
- [x] Implement POST/GET /api/v1/workflow-requests
- [x] Implement GET/PATCH /api/v1/workflow-requests/:id
- [x] Implement PATCH /api/v1/workflow-requests/:id/status
- [x] Implement PATCH /api/v1/workflow-requests/:id/assignee
- [x] Implement comments create/edit/delete APIs
- [x] Implement ADMIN CSV export API
- [x] Implement /workflow-requests list page
- [x] Implement /workflow-requests/new page
- [x] Implement /workflow-requests/:id page
- [x] Add quick-create entry on incident detail page
- [ ] Add regression and permission test runs
- [x] Update README and PROJECT_PROGRESS.md

## Test Matrix

| ID | Case | Expected | Status | Evidence |
| --- | --- | --- | --- | --- |
| WR-TC-01 | Create IMPROVEMENT request | 201 + itemId | Pending Run | API + UI implemented; runtime request test pending |
| WR-TC-02 | Create NEW_WORKFLOW request | 201 + itemId | Pending Run | API + UI implemented; runtime request test pending |
| WR-TC-03 | OPERATOR forbidden status transition | 403 | Pending Run | Guard logic implemented in `/status` route |
| WR-TC-04 | ADMIN transition to DONE requires reason | 400/200 | Pending Run | Validation implemented in `/status` route |
| WR-TC-05 | Comment author can edit own comment | 200 | Pending Run | Ownership check implemented in comment PATCH route |
| WR-TC-06 | ADMIN can delete comment | 200 | Pending Run | ADMIN-only delete implemented in comment DELETE route |
| WR-TC-07 | CSV export ADMIN allowed | 200 | Pending Run | Export route implemented with ADMIN role check |
| WR-TC-08 | CSV export OPERATOR forbidden | 403 | Pending Run | Export route returns 403 for non-ADMIN |
| WR-TC-09 | Lint/build baseline | Clean lint + successful build | Passed | `npm run lint` and `npm run build` passed on 2026-03-04 |

## Risks & Blockers

| ID | Type | Description | Impact | Mitigation | Status |
| --- | --- | --- | --- | --- | --- |
| WR-R-001 | Risk | Permission edge cases | Medium | Add explicit transition guard tests | Open |

## Change Log

| Date | Update | By |
| --- | --- | --- |
| 2026-03-04 | Tracker initialized | Codex |
| 2026-03-04 | Implemented schema, APIs, pages, comments, export, navigation, and incident quick-create linkage | Codex |
| 2026-03-04 | Updated README and PROJECT_PROGRESS; lint/build baseline passed | Codex |
| 2026-03-04 | Applied migration `20260304154000_add_workflow_requests_module` via `npm run db:migrate` | Codex |
