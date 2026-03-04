"use client"

import { INCIDENT_STATUSES, INCIDENT_PRIORITIES, WORKFLOW_NAMES } from "@/lib/constants"
import { X } from "lucide-react"

interface IncidentFiltersProps {
  status: string
  setStatus: (v: string) => void
  workflow: string
  setWorkflow: (v: string) => void
  priority: string
  setPriority: (v: string) => void
  dateFrom: string
  setDateFrom: (v: string) => void
  dateTo: string
  setDateTo: (v: string) => void
  onReset: () => void
}

export function IncidentFilters({
  status,
  setStatus,
  workflow,
  setWorkflow,
  priority,
  setPriority,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  onReset,
}: IncidentFiltersProps) {
  const hasFilters = status || workflow || priority || dateFrom || dateTo

  return (
    <div className="flex flex-wrap items-end gap-3">
      <FilterSelect
        label="Status"
        value={status}
        onChange={setStatus}
        options={INCIDENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
      />
      <FilterSelect
        label="Workflow"
        value={workflow}
        onChange={setWorkflow}
        options={WORKFLOW_NAMES.map((w) => ({ value: w, label: w }))}
      />
      <FilterSelect
        label="Priority"
        value={priority}
        onChange={setPriority}
        options={INCIDENT_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-9 rounded-md border border-input bg-input/50 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring [color-scheme:dark]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">To</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-9 rounded-md border border-input bg-input/50 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring [color-scheme:dark]"
        />
      </div>
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
        className="h-9 min-w-[140px] rounded-md border border-input bg-input/50 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
