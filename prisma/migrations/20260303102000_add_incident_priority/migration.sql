-- Add priority enum and column for incident triage
CREATE TYPE "IncidentPriority" AS ENUM ('L', 'M', 'H');

ALTER TABLE "incidents"
ADD COLUMN "priority" "IncidentPriority" NOT NULL DEFAULT 'L';

CREATE INDEX "incidents_priority_idx" ON "incidents"("priority");
