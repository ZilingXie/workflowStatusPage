import type {
  IncidentStatus,
  IncidentPriority,
  WorkflowRequestStatus,
  WorkflowRequestType,
} from "./types"

export const INCIDENT_STATUSES: { value: IncidentStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
]

export const INCIDENT_PRIORITIES: { value: IncidentPriority; label: string }[] = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
]

export const WORKFLOW_REQUEST_STATUSES: { value: WorkflowRequestStatus; label: string }[] = [
  { value: "PROPOSED", label: "Proposed" },
  { value: "TRIAGED", label: "Triaged" },
  { value: "PLANNED", label: "Planned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
  { value: "REJECTED", label: "Rejected" },
]

export const WORKFLOW_REQUEST_TYPES: { value: WorkflowRequestType; label: string }[] = [
  { value: "IMPROVEMENT", label: "Improvement" },
  { value: "NEW_WORKFLOW", label: "New Workflow" },
]

export const STATUS_COLOR_MAP: Record<string, string> = {
  // Incident statuses
  OPEN: "bg-red-500/10 text-red-700 border-red-500/25 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  IN_PROGRESS: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  RESOLVED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  // Workflow Request statuses
  PROPOSED: "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  TRIAGED: "bg-cyan-500/10 text-cyan-700 border-cyan-500/25 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30",
  PLANNED: "bg-indigo-500/10 text-indigo-700 border-indigo-500/25 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30",
  DONE: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  REJECTED: "bg-zinc-500/10 text-zinc-600 border-zinc-500/25 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/30",
}

export const PRIORITY_COLOR_MAP: Record<IncidentPriority, string> = {
  CRITICAL: "bg-red-500/10 text-red-700 border-red-500/25 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  HIGH: "bg-orange-500/10 text-orange-700 border-orange-500/25 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30",
  MEDIUM: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  LOW: "bg-zinc-500/10 text-zinc-600 border-zinc-500/25 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/30",
}

export const TYPE_COLOR_MAP: Record<WorkflowRequestType, string> = {
  IMPROVEMENT: "bg-violet-500/10 text-violet-700 border-violet-500/25 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30",
  NEW_WORKFLOW: "bg-sky-500/10 text-sky-700 border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30",
}

export const AUTO_REFRESH_INTERVAL = 15_000 // 15 seconds
export const PAGE_SIZE = 10

export const WORKFLOW_NAMES = [
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

export const SOURCE_INSTANCES = [
  "n8n-prod-01",
  "n8n-prod-02",
  "n8n-staging-01",
]
