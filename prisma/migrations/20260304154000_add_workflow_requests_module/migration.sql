-- Create enums for workflow request tracking
CREATE TYPE "WorkflowRequestType" AS ENUM ('IMPROVEMENT', 'NEW_WORKFLOW');
CREATE TYPE "WorkflowRequestStatus" AS ENUM ('PROPOSED', 'TRIAGED', 'PLANNED', 'IN_PROGRESS', 'DONE', 'REJECTED');
CREATE TYPE "WorkflowRequestEventType" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'ASSIGNEE_CHANGED');

-- Create workflow_requests table
CREATE TABLE "workflow_requests" (
    "id" UUID NOT NULL,
    "type" "WorkflowRequestType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "workflow_name" TEXT,
    "workflow_reference" TEXT,
    "requested_workflow_name" TEXT,
    "business_goal" TEXT,
    "expected_trigger" TEXT,
    "priority" "IncidentPriority" NOT NULL DEFAULT 'L',
    "status" "WorkflowRequestStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposed_by" TEXT NOT NULL,
    "assignee_username" TEXT,
    "source_incident_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "workflow_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workflow_requests_source_incident_id_fkey" FOREIGN KEY ("source_incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create workflow_request_events table
CREATE TABLE "workflow_request_events" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "event_type" "WorkflowRequestEventType" NOT NULL,
    "from_status" "WorkflowRequestStatus",
    "to_status" "WorkflowRequestStatus",
    "from_assignee" TEXT,
    "to_assignee" TEXT,
    "action_reason" TEXT,
    "actor_username" TEXT NOT NULL,
    "actor_role" "UserRole" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_request_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workflow_request_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "workflow_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create workflow_request_comments table
CREATE TABLE "workflow_request_comments" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "author_username" TEXT NOT NULL,
    "author_role" "UserRole" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "workflow_request_comments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workflow_request_comments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "workflow_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Query indexes
CREATE INDEX "workflow_requests_status_idx" ON "workflow_requests"("status");
CREATE INDEX "workflow_requests_type_idx" ON "workflow_requests"("type");
CREATE INDEX "workflow_requests_priority_idx" ON "workflow_requests"("priority");
CREATE INDEX "workflow_requests_workflow_name_idx" ON "workflow_requests"("workflow_name");
CREATE INDEX "workflow_requests_assignee_username_idx" ON "workflow_requests"("assignee_username");
CREATE INDEX "workflow_requests_created_at_idx" ON "workflow_requests"("created_at" DESC);
CREATE INDEX "workflow_requests_source_incident_id_idx" ON "workflow_requests"("source_incident_id");
CREATE INDEX "workflow_request_events_request_id_idx" ON "workflow_request_events"("request_id");
CREATE INDEX "workflow_request_comments_request_id_idx" ON "workflow_request_comments"("request_id");
