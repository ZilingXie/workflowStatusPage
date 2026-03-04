"use client"

import {
  WORKFLOW_REQUEST_STATUSES,
  WORKFLOW_REQUEST_TYPES,
  INCIDENT_PRIORITIES,
  WORKFLOW_NAMES,
} from "@/lib/constants"
import { MOCK_USERS } from "@/lib/mock-data"
import { X } from "lucide-react"

interface WorkflowRequestFiltersProps {
  type: string
  setType: (v: string) => void
  status: string
  setStatus: (v: string) => void
  priority: string
  setPriority: (v: string) => void
  workflow: string
  setWorkflow: (v: string) => void
  assignee: string
  setAssignee: (v: string) => void
  onReset: () => void
}

export function WorkflowRequestFilters({
  type,
  setType,
  status,
  setStatus,
  priority,
  setPriority,
  workflow,
  setWorkflow,
  assignee,
  setAssignee,
  onReset,
}: WorkflowRequestFiltersProps) {
  const hasFilters = type || status || priority || workflow || assignee

  return (
    <div className="flex flex-wrap items-end gap-3">
      <FilterSelect
        label="Type"
        value={type}
        onChange={setType}
        options={WORKFLOW_REQUEST_TYPES.map((t) => ({ value: t.value, label: t.label }))}
      />
      <FilterSelect
        label="Status"
        value={status}
        onChange={setStatus}
        options={WORKFLOW_REQUEST_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
      />
      <FilterSelect
        label="Priority"
        value={priority}
        onChange={setPriority}
        options={INCIDENT_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
      />
      <FilterSelect
        label="Workflow"
        value={workflow}
        onChange={setWorkflow}
        options={WORKFLOW_NAMES.map((w) => ({ value: w, label: w }))}
      />
      <FilterSelect
        label="Assignee"
        value={assignee}
        onChange={setAssignee}
        options={MOCK_USERS.map((u) => ({ value: u.username, label: u.displayName }))}
      />
      {hasFilters && (
        <button
          onClick={onReset}
          className="flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-3 w-3" />
          Reset
        </button>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-[130px] rounded-md border border-input bg-input/50 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
