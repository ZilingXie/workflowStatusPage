# n8n Failure Status Site - Project Progress

## Project Snapshot
- Project: n8n Failure Status Site (MVP)
- Plan Source: `n8n-status-mvp-plan.md`
- Current Phase: Phase 2 (n8n integration and idempotency validation)
- Overall Status: In Progress
- Last Updated: 2026-03-02

## Success Criteria Tracker
| ID | Success Criteria | Target | Current Status | Evidence/Link | Owner |
| --- | --- | --- | --- | --- | --- |
| SC-1 | New failure visible on page after ingest | <= 30s | Passed | Manual ingest self-test passed with list polling | - |
| SC-2 | Ops can reach exact n8n execution quickly | <= 3 steps | Passed | List -> Detail -> n8n execution link path verified | - |
| SC-3 | Incidents move through lifecycle with required resolve reason | 100% valid transitions | Passed | Transition validation and role checks passed | - |
| SC-4 | Admin can reopen resolved incidents with audit history | 100% traceable | Passed | Reopen flow and timeline event logging passed | - |

## Milestone Progress
| Phase | Scope | Target Date | Status | Notes |
| --- | --- | --- | --- | --- |
| Phase 1 | DB schema, core APIs, auth login/logout, incident list page | TBD | Completed | Runtime validation and manual self-tests passed |
| Phase 2 | n8n Error Workflow integration + idempotency validation | TBD | Not Started | - |
| Phase 3 | EC2 deployment via Docker Compose | TBD | Not Started | - |
| Phase 4 | 1-week stabilization + data quality review | TBD | Not Started | - |

## Work Breakdown Checklist

### A. Ingest API (`POST /api/v1/ingest/failure`)
- [x] Bearer token auth (`INGEST_TOKEN`)
- [x] Payload required-field validation
- [x] Derived `execution_url`
- [x] Idempotent upsert by `(source_instance, execution_id)`
- [x] Raw payload persisted for audit

### B. Incident APIs
- [x] `GET /api/v1/incidents` (pagination/filter/sort)
- [x] `GET /api/v1/incidents/:id` (detail + timeline)
- [x] `PATCH /api/v1/incidents/:id/status`
- [x] Transition guards by role (`OPERATOR`, `ADMIN`)
- [x] Resolve/reopen reason validation
- [x] `GET /api/v1/incidents/export.csv` (ADMIN only)

### C. Auth & Session
- [x] `POST /api/v1/auth/login`
- [x] `POST /api/v1/auth/logout`
- [x] `APP_USERS_JSON` account loading
- [x] Bcrypt password validation
- [x] HTTP-only cookie session (8h)

### D. UI
- [x] `/login`
- [x] `/incidents` list with filters, KPI cards, 15s polling
- [x] `/incidents/:id` detail + timeline + transition actions
- [x] UTC time display across pages

### E. Data Layer
- [x] `incidents` table + unique/indexes
- [x] `incident_events` table
- [x] `incident_raw_payloads` table
- [x] Migration strategy documented

### F. Deployment & Ops
- [ ] Docker Compose (`app`, `db`)
- [ ] Env vars configured (`INGEST_TOKEN`, `APP_USERS_JSON`, `SESSION_SECRET`, `DATABASE_URL`, `TZ=UTC`)
- [ ] Backup job (`pg_dump` daily) defined

## Test Progress Matrix
| Test Area | Case | Status | Notes |
| --- | --- | --- | --- |
| Ingest | create | Passed | Manual self-test passed |
| Ingest | duplicate update | Passed | Manual self-test passed (deduplicated=true) |
| Ingest | invalid token -> 401 | Passed | Manual self-test passed |
| Ingest | missing required field -> 400 | Passed | Manual self-test passed |
| Workflow | valid transitions | Passed | Manual self-test passed |
| Workflow | resolve reason required | Passed | Manual self-test passed |
| Workflow | operator cannot reopen | Passed | Manual self-test passed |
| Workflow | admin can reopen | Passed | Manual self-test passed |
| List | default sort newest first | Passed | Manual self-test passed |
| List | filters + pagination (20/page) | Passed | Manual self-test passed |
| Detail | execution URL correctness | Passed | Manual self-test passed |
| Detail | timeline completeness | Passed | Manual self-test passed |
| Export | admin allowed | Passed | Manual self-test passed |
| Export | operator forbidden | Passed | Manual self-test passed |
| SLA | ingest-to-visible <= 30s | Passed | Manual self-test passed (15s polling window) |

## Phase Completion Rule
- For every development phase, prepare phase-specific test cases before marking implementation complete.
- Execute self-test for all phase test cases and record results in this file.
- A phase can be marked `Completed` only after test cases are prepared and self-test passes.

## Risk & Issue Log
| ID | Type | Description | Impact | Mitigation | Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | Risk | n8n payload variability can break validation | High | Version payload contract + schema tests | Open | - |
| R-002 | Risk | Session/auth misconfiguration in production | High | Add startup checks and env validation | Open | - |
| R-003 | Risk | Slow queries when incidents grow | Medium | Add planned indexes and query profiling | Open | - |

## Change Log
| Date | Update | By |
| --- | --- | --- |
| 2026-03-02 | Initialized tracker from MVP plan | Codex |
| 2026-03-02 | Phase 1 baseline scaffold implemented (schema, APIs, auth, UI); verification pending | Codex |
| 2026-03-02 | Phase 1 runtime self-tests updated to Passed; Phase 1 marked Completed | Codex |
