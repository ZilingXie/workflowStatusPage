-- Create enums
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR');

-- Create incidents table
CREATE TABLE "incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_instance" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "workflow_name" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "failed_at" TIMESTAMPTZ(6) NOT NULL,
    "error_message" TEXT NOT NULL,
    "error_node_name" TEXT,
    "error_type" TEXT,
    "error_stack" TEXT,
    "execution_url" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "resolution_reason" TEXT,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- Create incident_events table
CREATE TABLE "incident_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "incident_id" UUID NOT NULL,
    "from_status" "IncidentStatus" NOT NULL,
    "to_status" "IncidentStatus" NOT NULL,
    "action_reason" TEXT,
    "actor_username" TEXT NOT NULL,
    "actor_role" "UserRole" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "incident_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "incident_events_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create incident_raw_payloads table
CREATE TABLE "incident_raw_payloads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "incident_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "incident_raw_payloads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "incident_raw_payloads_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX "incidents_source_instance_execution_id_key" ON "incidents"("source_instance", "execution_id");
CREATE INDEX "incidents_status_idx" ON "incidents"("status");
CREATE INDEX "incidents_failed_at_idx" ON "incidents"("failed_at" DESC);
CREATE INDEX "incidents_workflow_name_idx" ON "incidents"("workflow_name");
CREATE INDEX "incidents_failed_at_status_idx" ON "incidents"("failed_at", "status");
CREATE INDEX "incident_events_incident_id_idx" ON "incident_events"("incident_id");
CREATE INDEX "incident_raw_payloads_incident_id_idx" ON "incident_raw_payloads"("incident_id");
