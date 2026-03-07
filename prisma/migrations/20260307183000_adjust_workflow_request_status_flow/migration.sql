BEGIN;

CREATE TYPE "WorkflowRequestStatus_new" AS ENUM (
  'PROPOSED',
  'CLARIFIED',
  'IN_PROGRESS',
  'DONE',
  'REJECTED'
);

ALTER TABLE "workflow_requests"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "workflow_requests"
ALTER COLUMN "status" TYPE "WorkflowRequestStatus_new"
USING (
  CASE
    WHEN "status"::text IN ('TRIAGED', 'PLANNED') THEN 'CLARIFIED'
    ELSE "status"::text
  END
)::"WorkflowRequestStatus_new";

ALTER TABLE "workflow_request_events"
ALTER COLUMN "from_status" TYPE "WorkflowRequestStatus_new"
USING (
  CASE
    WHEN "from_status" IS NULL THEN NULL
    WHEN "from_status"::text IN ('TRIAGED', 'PLANNED') THEN 'CLARIFIED'
    ELSE "from_status"::text
  END
)::"WorkflowRequestStatus_new";

ALTER TABLE "workflow_request_events"
ALTER COLUMN "to_status" TYPE "WorkflowRequestStatus_new"
USING (
  CASE
    WHEN "to_status" IS NULL THEN NULL
    WHEN "to_status"::text IN ('TRIAGED', 'PLANNED') THEN 'CLARIFIED'
    ELSE "to_status"::text
  END
)::"WorkflowRequestStatus_new";

DROP TYPE "WorkflowRequestStatus";
ALTER TYPE "WorkflowRequestStatus_new" RENAME TO "WorkflowRequestStatus";

ALTER TABLE "workflow_requests"
ALTER COLUMN "status" SET DEFAULT 'PROPOSED';

COMMIT;
