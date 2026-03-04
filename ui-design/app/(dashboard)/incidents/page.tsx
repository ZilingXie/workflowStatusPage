"use client"

import { useState, useMemo, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useData } from "@/hooks/use-data"
import { useAuth } from "@/hooks/use-mock-auth"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"
import { KpiCards } from "@/components/kpi-cards"
import { IncidentFilters } from "@/components/incident-filters"
import { IncidentTable } from "@/components/incident-table"
import { PAGE_SIZE } from "@/lib/constants"
import { RefreshCw, Pause, Play, Download } from "lucide-react"
import { toast } from "sonner"

export default function IncidentsPage() {
  const { incidents } = useData()
  const { isAdmin } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Filter state from URL
  const [status, setStatus] = useState(searchParams.get("status") || "")
  const [workflow, setWorkflow] = useState(searchParams.get("workflow") || "")
  const [priority, setPriority] = useState(searchParams.get("priority") || "")
  const [dateFrom, setDateFrom] = useState(searchParams.get("from") || "")
  const [dateTo, setDateTo] = useState(searchParams.get("to") || "")
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    toast.success("Data refreshed")
  }, [])

  const { isActive, countdown, manualRefresh, toggleActive } =
    useAutoRefresh(handleRefresh)

  // Update URL when filters change
  function updateFilters(updates: Record<string, string>) {
    const params = new URLSearchParams()
    const newState = { status, workflow, priority, from: dateFrom, to: dateTo, page: String(page), ...updates }
    Object.entries(newState).forEach(([key, value]) => {
      if (value && value !== "1") params.set(key, value)
      if (key === "page" && value !== "1") params.set(key, value)
    })
    // Clean up empty params
    for (const [key, value] of params.entries()) {
      if (!value) params.delete(key)
    }
    router.replace(`/incidents?${params.toString()}`, { scroll: false })
  }

  function handleStatusChange(v: string) {
    setStatus(v)
    setPage(1)
    updateFilters({ status: v, page: "1" })
  }
  function handleWorkflowChange(v: string) {
    setWorkflow(v)
    setPage(1)
    updateFilters({ workflow: v, page: "1" })
  }
  function handlePriorityChange(v: string) {
    setPriority(v)
    setPage(1)
    updateFilters({ priority: v, page: "1" })
  }
  function handleDateFromChange(v: string) {
    setDateFrom(v)
    setPage(1)
    updateFilters({ from: v, page: "1" })
  }
  function handleDateToChange(v: string) {
    setDateTo(v)
    setPage(1)
    updateFilters({ to: v, page: "1" })
  }
  function handleReset() {
    setStatus("")
    setWorkflow("")
    setPriority("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
    router.replace("/incidents", { scroll: false })
  }
  function handlePageChange(p: number) {
    setPage(p)
    updateFilters({ page: String(p) })
  }

  // Filter & sort
  const filtered = useMemo(() => {
    let result = [...incidents]
    if (status) result = result.filter((i) => i.status === status)
    if (workflow) result = result.filter((i) => i.workflowName === workflow)
    if (priority) result = result.filter((i) => i.priority === priority)
    if (dateFrom) {
      const from = new Date(dateFrom)
      result = result.filter((i) => new Date(i.failedAt) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter((i) => new Date(i.failedAt) <= to)
    }
    // Sort by failedAt descending
    result.sort((a, b) => new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime())
    return result
  }, [incidents, status, workflow, priority, dateFrom, dateTo, refreshKey])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  function handleExportCsv() {
    const headers = ["ID", "Workflow", "Status", "Priority", "Source", "Failed At", "Error"]
    const rows = filtered.map((i) => [
      i.id,
      i.workflowName,
      i.status,
      i.priority,
      i.sourceInstance,
      i.failedAt,
      `"${i.errorMessage.replace(/"/g, '""')}"`,
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `incidents-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("CSV exported successfully")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Incidents</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and manage workflow execution failures
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh controls */}
          <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5">
            <button
              onClick={toggleActive}
              className="text-muted-foreground transition-colors hover:text-foreground"
              title={isActive ? "Pause auto-refresh" : "Resume auto-refresh"}
            >
              {isActive ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </button>
            <span className="min-w-[20px] text-center text-xs tabular-nums text-muted-foreground">
              {isActive ? `${countdown}s` : "Off"}
            </span>
            <button
              onClick={manualRefresh}
              className="text-muted-foreground transition-colors hover:text-foreground"
              title="Refresh now"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <KpiCards incidents={incidents} />

      {/* Filters */}
      <IncidentFilters
        status={status}
        setStatus={handleStatusChange}
        workflow={workflow}
        setWorkflow={handleWorkflowChange}
        priority={priority}
        setPriority={handlePriorityChange}
        dateFrom={dateFrom}
        setDateFrom={handleDateFromChange}
        dateTo={dateTo}
        setDateTo={handleDateToChange}
        onReset={handleReset}
      />

      {/* Table */}
      <IncidentTable
        incidents={paginated}
        page={page}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
