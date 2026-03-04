import type {
  User,
  Incident,
  WorkflowRequest,
  StatusHistoryEntry,
  Comment,
  EventHistoryEntry,
} from "./types"

export const MOCK_USERS: User[] = [
  { username: "admin", password: "admin123", role: "ADMIN", displayName: "Admin" },
  { username: "operator", password: "operator123", role: "OPERATOR", displayName: "Operator" },
]

function id(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(4, "0")}`
}

function utc(daysAgo: number, hours = 10, minutes = 0) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - daysAgo)
  d.setUTCHours(hours, minutes, 0, 0)
  return d.toISOString()
}

const workflowNames = [
  "Order Processing",
  "User Onboarding",
  "Payment Reconciliation",
  "Email Notification",
  "Data Sync - CRM",
  "Data Sync - ERP",
  "Report Generation",
  "Inventory Update",
  "Slack Alert Pipeline",
  "Customer Feedback",
]

const sources = ["n8n-prod-01", "n8n-prod-02", "n8n-staging-01"]

const errorMessages = [
  "Connection timeout after 30000ms",
  "HTTP 500: Internal Server Error from upstream API",
  "Invalid JSON payload: unexpected token at position 42",
  "Authentication failed: token expired",
  "Rate limit exceeded: 429 Too Many Requests",
  "Database connection pool exhausted",
  "Webhook delivery failed after 3 retries",
  "Memory limit exceeded during data transformation",
  "Missing required field: customer_id",
  "SSL certificate verification failed",
]

function makeHistory(incidentId: string, status: string, daysAgo: number): StatusHistoryEntry[] {
  const entries: StatusHistoryEntry[] = [
    {
      id: `${incidentId}-h1`,
      timestamp: utc(daysAgo, 10, 0),
      fromStatus: "-",
      toStatus: "OPEN",
      changedBy: "system",
      reason: "Workflow execution failed",
    },
  ]
  if (status === "IN_PROGRESS" || status === "RESOLVED") {
    entries.push({
      id: `${incidentId}-h2`,
      timestamp: utc(daysAgo, 10, 35),
      fromStatus: "OPEN",
      toStatus: "IN_PROGRESS",
      changedBy: "operator",
      reason: "Investigating the issue",
    })
  }
  if (status === "RESOLVED") {
    entries.push({
      id: `${incidentId}-h3`,
      timestamp: utc(Math.max(daysAgo - 1, 0), 14, 20),
      fromStatus: "IN_PROGRESS",
      toStatus: "RESOLVED",
      changedBy: "admin",
      reason: "Root cause fixed: increased timeout to 60000ms",
    })
  }
  return entries
}

function samplePayload(wfName: string, execId: string) {
  return {
    executionId: execId,
    workflowName: wfName,
    startedAt: utc(1, 9, 55),
    node: "HTTP Request",
    error: {
      message: errorMessages[Math.floor(Math.random() * errorMessages.length)],
      stack: "Error: ...\n    at HttpRequest.execute (/nodes/HttpRequest.node.js:142:11)\n    at Workflow.runNode (/core/Workflow.js:891:33)",
    },
    inputData: {
      orderId: `ORD-${Math.floor(Math.random() * 90000) + 10000}`,
      customerId: `CUST-${Math.floor(Math.random() * 9000) + 1000}`,
      amount: Math.floor(Math.random() * 50000) / 100,
    },
  }
}

export const MOCK_INCIDENTS: Incident[] = [
  // 5 OPEN
  ...Array.from({ length: 5 }, (_, i) => {
    const iid = id("INC", i + 1)
    const wf = workflowNames[i % workflowNames.length]
    const daysAgo = i
    return {
      id: iid,
      workflowName: wf,
      executionId: `exec-${100 + i}`,
      sourceInstance: sources[i % sources.length],
      status: "OPEN" as const,
      priority: (["CRITICAL", "HIGH", "MEDIUM", "LOW", "HIGH"] as const)[i],
      failedAt: utc(daysAgo, 8 + i, i * 7),
      errorMessage: errorMessages[i],
      payload: samplePayload(wf, `exec-${100 + i}`),
      statusHistory: makeHistory(iid, "OPEN", daysAgo),
    }
  }),
  // 5 IN_PROGRESS
  ...Array.from({ length: 5 }, (_, i) => {
    const iid = id("INC", i + 6)
    const wf = workflowNames[(i + 5) % workflowNames.length]
    const daysAgo = i + 2
    return {
      id: iid,
      workflowName: wf,
      executionId: `exec-${200 + i}`,
      sourceInstance: sources[(i + 1) % sources.length],
      status: "IN_PROGRESS" as const,
      priority: (["HIGH", "MEDIUM", "CRITICAL", "LOW", "MEDIUM"] as const)[i],
      failedAt: utc(daysAgo, 6 + i, 15 + i * 5),
      errorMessage: errorMessages[(i + 5) % errorMessages.length],
      payload: samplePayload(wf, `exec-${200 + i}`),
      statusHistory: makeHistory(iid, "IN_PROGRESS", daysAgo),
    }
  }),
  // 8 RESOLVED
  ...Array.from({ length: 8 }, (_, i) => {
    const iid = id("INC", i + 11)
    const wf = workflowNames[(i + 3) % workflowNames.length]
    const daysAgo = i + 5
    return {
      id: iid,
      workflowName: wf,
      executionId: `exec-${300 + i}`,
      sourceInstance: sources[(i + 2) % sources.length],
      status: "RESOLVED" as const,
      priority: (["MEDIUM", "LOW", "HIGH", "CRITICAL", "LOW", "MEDIUM", "HIGH", "LOW"] as const)[i],
      failedAt: utc(daysAgo, 3 + i, 10 + i * 3),
      resolvedAt: utc(Math.max(daysAgo - 1, 0), 14, 20),
      errorMessage: errorMessages[(i + 2) % errorMessages.length],
      payload: samplePayload(wf, `exec-${300 + i}`),
      statusHistory: makeHistory(iid, "RESOLVED", daysAgo),
    }
  }),
]

function makeComments(reqId: string): Comment[] {
  return [
    {
      id: `${reqId}-c1`,
      author: "operator",
      content: "This workflow frequently fails during peak hours. We should add retry logic and better error handling.",
      createdAt: utc(3, 11, 0),
    },
    {
      id: `${reqId}-c2`,
      author: "admin",
      content: "Agreed. Let's also add circuit breaker pattern for the external API calls. I'll create a technical spec.",
      createdAt: utc(2, 15, 30),
    },
  ]
}

function makeEventHistory(reqId: string, status: string, daysAgo: number): EventHistoryEntry[] {
  const entries: EventHistoryEntry[] = [
    {
      id: `${reqId}-e1`,
      timestamp: utc(daysAgo, 9, 0),
      type: "CREATED",
      actor: "operator",
      description: "Request created",
    },
  ]
  if (["TRIAGED", "PLANNED", "IN_PROGRESS", "DONE", "REJECTED"].includes(status)) {
    entries.push({
      id: `${reqId}-e2`,
      timestamp: utc(daysAgo - 1, 10, 0),
      type: "STATUS_CHANGE",
      actor: "admin",
      description: "Status changed from Proposed to Triaged",
      details: { from: "PROPOSED", to: "TRIAGED" },
    })
  }
  if (["PLANNED", "IN_PROGRESS", "DONE"].includes(status)) {
    entries.push({
      id: `${reqId}-e3`,
      timestamp: utc(daysAgo - 2, 14, 0),
      type: "ASSIGNEE_CHANGE",
      actor: "admin",
      description: "Assigned to operator",
      details: { assignee: "operator" },
    })
    entries.push({
      id: `${reqId}-e4`,
      timestamp: utc(daysAgo - 2, 14, 5),
      type: "STATUS_CHANGE",
      actor: "admin",
      description: "Status changed from Triaged to Planned",
      details: { from: "TRIAGED", to: "PLANNED" },
    })
  }
  if (["IN_PROGRESS", "DONE"].includes(status)) {
    entries.push({
      id: `${reqId}-e5`,
      timestamp: utc(daysAgo - 3, 9, 0),
      type: "STATUS_CHANGE",
      actor: "operator",
      description: "Status changed from Planned to In Progress",
      details: { from: "PLANNED", to: "IN_PROGRESS" },
    })
  }
  if (status === "DONE") {
    entries.push({
      id: `${reqId}-e6`,
      timestamp: utc(daysAgo - 5, 16, 0),
      type: "STATUS_CHANGE",
      actor: "admin",
      description: "Status changed from In Progress to Done",
      details: { from: "IN_PROGRESS", to: "DONE" },
    })
  }
  if (status === "REJECTED") {
    entries.push({
      id: `${reqId}-e-rej`,
      timestamp: utc(daysAgo - 1, 11, 0),
      type: "STATUS_CHANGE",
      actor: "admin",
      description: "Status changed from Triaged to Rejected",
      details: { from: "TRIAGED", to: "REJECTED" },
    })
  }
  return entries
}

export const MOCK_WORKFLOW_REQUESTS: WorkflowRequest[] = [
  {
    id: "WR-0001",
    title: "Add retry logic to Order Processing",
    type: "IMPROVEMENT",
    status: "PROPOSED",
    priority: "HIGH",
    workflowName: "Order Processing",
    description: "The Order Processing workflow lacks retry logic for transient failures. We need to add exponential backoff retries for HTTP nodes.",
    createdBy: "operator",
    createdAt: utc(5, 9, 0),
    updatedAt: utc(5, 9, 0),
    relatedIncidentId: "INC-0001",
    comments: makeComments("WR-0001"),
    eventHistory: makeEventHistory("WR-0001", "PROPOSED", 5),
  },
  {
    id: "WR-0002",
    title: "Implement circuit breaker for Payment API",
    type: "IMPROVEMENT",
    status: "TRIAGED",
    priority: "CRITICAL",
    workflowName: "Payment Reconciliation",
    description: "Payment API calls cause cascading failures. Need circuit breaker pattern implementation.",
    assignee: "admin",
    createdBy: "operator",
    createdAt: utc(8, 11, 0),
    updatedAt: utc(7, 10, 0),
    comments: makeComments("WR-0002"),
    eventHistory: makeEventHistory("WR-0002", "TRIAGED", 8),
  },
  {
    id: "WR-0003",
    title: "Create automated user deactivation workflow",
    type: "NEW_WORKFLOW",
    status: "PLANNED",
    priority: "MEDIUM",
    workflowName: "User Onboarding",
    description: "We need a new workflow to automatically deactivate users after 90 days of inactivity.",
    assignee: "operator",
    createdBy: "admin",
    createdAt: utc(12, 14, 0),
    updatedAt: utc(10, 14, 0),
    comments: [],
    eventHistory: makeEventHistory("WR-0003", "PLANNED", 12),
  },
  {
    id: "WR-0004",
    title: "Optimize CRM data sync batch size",
    type: "IMPROVEMENT",
    status: "IN_PROGRESS",
    priority: "HIGH",
    workflowName: "Data Sync - CRM",
    description: "Current batch size of 100 causes timeouts. Need to optimize to smaller batches with parallel processing.",
    assignee: "operator",
    createdBy: "operator",
    createdAt: utc(15, 8, 0),
    updatedAt: utc(10, 9, 0),
    comments: makeComments("WR-0004"),
    eventHistory: makeEventHistory("WR-0004", "IN_PROGRESS", 15),
  },
  {
    id: "WR-0005",
    title: "Add Slack notification for failed workflows",
    type: "NEW_WORKFLOW",
    status: "DONE",
    priority: "MEDIUM",
    workflowName: "Slack Alert Pipeline",
    description: "Create a new workflow that sends Slack notifications whenever any workflow execution fails.",
    assignee: "admin",
    createdBy: "operator",
    createdAt: utc(20, 10, 0),
    updatedAt: utc(15, 16, 0),
    comments: makeComments("WR-0005"),
    eventHistory: makeEventHistory("WR-0005", "DONE", 20),
  },
  {
    id: "WR-0006",
    title: "Email notification template redesign",
    type: "IMPROVEMENT",
    status: "REJECTED",
    priority: "LOW",
    workflowName: "Email Notification",
    description: "Redesign the email templates to use the new brand guidelines. Includes header, footer, and content layout changes.",
    createdBy: "operator",
    createdAt: utc(18, 13, 0),
    updatedAt: utc(17, 11, 0),
    comments: [],
    eventHistory: makeEventHistory("WR-0006", "REJECTED", 18),
  },
  {
    id: "WR-0007",
    title: "ERP sync error handling improvements",
    type: "IMPROVEMENT",
    status: "PROPOSED",
    priority: "HIGH",
    workflowName: "Data Sync - ERP",
    description: "ERP sync workflow silently drops records on error. Need proper error handling and dead letter queue.",
    createdBy: "admin",
    createdAt: utc(3, 16, 0),
    updatedAt: utc(3, 16, 0),
    relatedIncidentId: "INC-0006",
    comments: [],
    eventHistory: makeEventHistory("WR-0007", "PROPOSED", 3),
  },
  {
    id: "WR-0008",
    title: "Build inventory low-stock alert workflow",
    type: "NEW_WORKFLOW",
    status: "TRIAGED",
    priority: "MEDIUM",
    workflowName: "Inventory Update",
    description: "Automated workflow to check inventory levels hourly and trigger alerts when stock falls below threshold.",
    assignee: "operator",
    createdBy: "operator",
    createdAt: utc(6, 9, 30),
    updatedAt: utc(5, 10, 0),
    comments: makeComments("WR-0008"),
    eventHistory: makeEventHistory("WR-0008", "TRIAGED", 6),
  },
  {
    id: "WR-0009",
    title: "Report generation performance optimization",
    type: "IMPROVEMENT",
    status: "PLANNED",
    priority: "LOW",
    workflowName: "Report Generation",
    description: "Report generation takes over 5 minutes for large datasets. Need to implement streaming and pagination.",
    assignee: "admin",
    createdBy: "admin",
    createdAt: utc(10, 11, 0),
    updatedAt: utc(8, 14, 5),
    comments: [],
    eventHistory: makeEventHistory("WR-0009", "PLANNED", 10),
  },
  {
    id: "WR-0010",
    title: "Customer feedback sentiment analysis",
    type: "NEW_WORKFLOW",
    status: "PROPOSED",
    priority: "LOW",
    workflowName: "Customer Feedback",
    description: "Create a new workflow that performs sentiment analysis on incoming customer feedback and routes negative feedback for urgent review.",
    createdBy: "operator",
    createdAt: utc(1, 14, 0),
    updatedAt: utc(1, 14, 0),
    comments: [],
    eventHistory: makeEventHistory("WR-0010", "PROPOSED", 1),
  },
]
