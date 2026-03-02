# n8n Failure Status Site

Phase 1 implementation baseline using Next.js + TypeScript + Prisma/PostgreSQL.

## Local Run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Ensure `.env` exists and required variables are set.
3. Generate Prisma client:
   ```bash
   npm run db:generate
   ```
4. Apply migrations:
   ```bash
   npm run db:migrate
   ```
5. Start dev server:
   ```bash
   npm run dev
   ```

## Key Routes

- `POST /api/v1/ingest/failure`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/incidents`
- `GET /api/v1/incidents/:id`
- `PATCH /api/v1/incidents/:id/status`
- `GET /api/v1/incidents/export.csv`

## Notes

- Incident list auto-refreshes every 15 seconds.
- All timestamps are displayed in UTC (`toISOString`).
- Session cookie TTL is 8 hours.
