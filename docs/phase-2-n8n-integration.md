# Phase 2: n8n Error Workflow Integration

This guide wires one global n8n Error Workflow to `POST /api/v1/ingest/failure`.

## 1. Prerequisites

- Status app is reachable from n8n (example: `https://status.example.com`)
- `INGEST_TOKEN` in status app is configured and known
- n8n can access outbound HTTPS
- In n8n env, set `N8N_SOURCE_INSTANCE` (example: `ec2-prod-01`)

## 2. Error Workflow Setup

Create one workflow in n8n and set it as the global Error Workflow.

### Node A: `Code` (normalize failure payload)

Use this code to convert n8n runtime error data into the ingest contract.

```javascript
const input = $json;
const execution = input.execution ?? {};
const workflow = input.workflow ?? {};
const error = input.error ?? {};

const executionId = String(execution.id ?? input.executionId ?? "");
const workflowId = String(workflow.id ?? input.workflowId ?? "");
const workflowName = String(workflow.name ?? input.workflowName ?? "Unknown Workflow");
const failedAt =
  input.failedAt ??
  input.timestamp ??
  execution.finishedAt ??
  execution.stoppedAt ??
  new Date().toISOString();

const errorMessage = String(
  error.message ?? input.errorMessage ?? input.message ?? "Unknown error"
);
const errorType = error.type ? String(error.type) : undefined;
const errorStack = error.stack ? String(error.stack) : undefined;
const errorNodeName =
  String(
    input.lastNodeExecuted ??
      execution.lastNodeExecuted ??
      error.node?.name ??
      ""
  ) || undefined;

return [
  {
    json: {
      sourceInstance: $env.N8N_SOURCE_INSTANCE || "n8n-default",
      workflowName,
      workflowURL: `${$env.N8N_BASE_URL}/workflow/${workflowId}`,
      executionID: executionId,
      executionURL: `${$env.N8N_BASE_URL}/execution/${executionId}`,
      summary: errorMessage,
      description: errorStack ?? errorMessage,
      time: failedAt
    }
  }
];
```

### Node B: `HTTP Request`

- Method: `POST`
- URL: `{{$env.STATUS_PAGE_BASE_URL}}/api/v1/ingest/failure`
- Send Body: `JSON`
- Body: use full JSON from previous node
- Headers:
  - `Authorization: Bearer {{$env.STATUS_PAGE_INGEST_TOKEN}}`
  - `Content-Type: application/json`
- Retry: keep retries low (recommended 1-2)

## 3. Ingest Payload Contract

```json
{
  "sourceInstance": "ec2-prod-01",
  "workflowName": "Daily Sync",
  "workflowURL": "https://n8n.example.com/workflow/123",
  "executionID": "456",
  "executionURL": "https://n8n.example.com/execution/456",
  "summary": "Request failed with status code 500",
  "description": "stack trace or detailed failure description",
  "time": "2026-03-03T02:42"
}
```

### Expected Response

- First ingest for `(sourceInstance, executionID)` returns `201`, `deduplicated=false`
- Repeated ingest with same key returns `200`, `deduplicated=true`

## 4. Local Validation

Run the phase self-test after deploying this change:

```bash
npm run test:phase2
```

The script validates HTTP behavior and DB-level idempotency.
