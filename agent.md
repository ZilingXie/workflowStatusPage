# AGENT RULES - n8n Failure Status Site MVP

This file defines execution rules for contributors and coding agents in this repository.
If implementation details conflict with this file, `n8n-status-mvp-plan.md` is the source of truth.

## 1. Product Guardrails (Do Not Change in MVP)
- Single n8n instance ingest only.
- Failure-only ingest (no success/retry tracking).
- English UI, UTC time display, 15s auto-refresh on incident list.
- Incident visibility target: new failure visible within 30 seconds.
- Permanent retention of incident data.
- Roles:
  - `OPERATOR`: `OPEN -> IN_PROGRESS -> RESOLVED`
  - `ADMIN`: same + `RESOLVED -> OPEN`

## 2. Required Interfaces
- `POST /api/v1/ingest/failure` (Bearer token required)
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/incidents`
- `GET /api/v1/incidents/:id`
- `PATCH /api/v1/incidents/:id/status`
- `GET /api/v1/incidents/export.csv` (ADMIN only)

## 3. Data Integrity Rules
- Idempotency key is always `(source_instance, execution_id)`.
- Duplicate ingest updates existing incident, never creates a second incident row.
- `RESOLVED` transition requires `resolution_reason`.
- Reopen transition (`RESOLVED -> OPEN`) requires `reopen_reason` and `ADMIN` role.
- Raw ingest payload must be stored for audit.
- Every status change must create an `incident_events` record.

## 4. Security Rules
- Never log plaintext passwords or session secrets.
- Never commit real secrets or production credentials.
- Session must use HTTP-only cookie with server-side verification.
- Auth accounts come from `APP_USERS_JSON`; passwords are bcrypt hashes.
- Ingest endpoint must reject invalid token with `401`.

## 5. Code and Architecture Conventions
- Stack baseline: Next.js + TypeScript + PostgreSQL + Docker Compose.
- Keep API handlers thin; move business rules into service modules.
- Keep persistence access in repository/data-access layer; avoid SQL in UI code.
- Use explicit DTO validation at API boundary.
- Use UTC consistently in DB and UI formatting.
- Prefer deterministic, testable functions for status transition logic.

## 6. Testing and Quality Gate
No feature is complete until all applicable checks pass:
- Ingest tests: create, duplicate update, auth failure, validation failure.
- Workflow tests: role permissions, transition validity, reason requirements.
- List tests: sorting, filters, pagination.
- Detail tests: execution URL correctness and timeline completeness.
- Export tests: admin allowed, operator denied.
- SLA check: ingest-to-visible latency <= 30s.
- Phase rule: each development phase must define its own test cases before phase completion.
- Phase rule: each development phase must run and pass self-test before status can move to `Completed`.

## 7. Definition of Done
- Code implemented with tests for changed behavior.
- `PROJECT_PROGRESS.md` updated:
  - checklist item status
  - milestone status (if affected)
  - relevant test matrix rows
- For phase completion:
  - phase-specific test case list is documented
  - self-test results are documented with pass/fail conclusion
- Any new env var added to `.env.example`.
- API contract changes documented in `n8n-status-mvp-plan.md` (or companion docs).

## 8. Working Workflow
1. Pick one scoped task from `PROJECT_PROGRESS.md`.
2. Implement with minimal, reversible changes.
3. Prepare test cases for impacted scope (and phase-specific cases when closing a phase).
4. Run tests/lint and execute self-test for impacted areas.
5. Update docs and progress tracker in same change set.
6. Record blockers in Risk & Issue Log.

## 9. Out-of-Scope for MVP (Do Not Expand)
- External notification channels (WeCom/DingTalk/Email)
- Multi-instance ingest
- SSO/OIDC
- Success/retry event tracking
