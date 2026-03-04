export type UserRole = "ADMIN" | "OPERATOR"

export interface User {
  username: string
  password: string
  role: UserRole
  displayName: string
}

export type IncidentStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED"
export type IncidentPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"

export interface Incident {
  id: string
  workflowName: string
  executionId: string
  sourceInstance: string
  status: IncidentStatus
  priority: IncidentPriority
  failedAt: string // ISO UTC
  resolvedAt?: string
  errorMessage: string
  payload: Record<string, unknown>
  statusHistory: StatusHistoryEntry[]
}

export interface StatusHistoryEntry {
  id: string
  timestamp: string // ISO UTC
  fromStatus: string
  toStatus: string
  changedBy: string
  reason?: string
}

export type WorkflowRequestType = "IMPROVEMENT" | "NEW_WORKFLOW"
export type WorkflowRequestStatus =
  | "PROPOSED"
  | "TRIAGED"
  | "PLANNED"
  | "IN_PROGRESS"
  | "DONE"
  | "REJECTED"

export interface WorkflowRequest {
  id: string
  title: string
  type: WorkflowRequestType
  status: WorkflowRequestStatus
  priority: IncidentPriority
  workflowName: string
  description: string
  assignee?: string
  createdBy: string
  createdAt: string // ISO UTC
  updatedAt: string // ISO UTC
  relatedIncidentId?: string
  comments: Comment[]
  eventHistory: EventHistoryEntry[]
}

export interface Comment {
  id: string
  author: string
  content: string
  createdAt: string // ISO UTC
  updatedAt?: string // ISO UTC
}

export interface EventHistoryEntry {
  id: string
  timestamp: string // ISO UTC
  type: "STATUS_CHANGE" | "ASSIGNEE_CHANGE" | "FIELD_UPDATE" | "COMMENT" | "CREATED"
  actor: string
  description: string
  details?: Record<string, string>
}
