"use client"

import { useState, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useData } from "@/hooks/use-data"
import { useAuth } from "@/hooks/use-mock-auth"
import { WorkflowRequestFilters } from "@/components/workflow-request-filters"
import { WorkflowRequestTable } from "@/components/workflow-request-table"
import { PAGE_SIZE } from "@/lib/constants"
import { Plus, Download } from "lucide-react"
import { toast } from "sonner"

export default function WorkflowRequestsPage() {
  const { workflowRequests } = useData()
  const { isAdmin } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [type, setType] = useState(searchParams.get("type") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "")
  const [priority, setPriority] = useState(searchParams.get("priority") || "")
  const [workflow, setWorkflow] = useState(searchParams.get("workflow") || "")
  const [assignee, setAssignee] = useState(searchParams.get("assignee") || "")
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1)

  function updateUrl(updates: Record<string, string>) {
    const params = new URLSearchParams()
    const state = { type, status, priority, workflow, assignee, page: String(page), ...updates }
    Object.entries(state).forEach(([key, value]) => {
      if (value && !(key === "page" && value === "1")) params.set(key, value)
    })
    router.replace(`/workflow-requests?${params.toString()}`, { scroll: false })
  }

  function handleFilterChange(
    setter: (v: string) => void,
    key: string,
    value: string
  ) {
    setter(value)
    setPage(1)
    updateUrl({ [key]: value, page: "1" })
  }

  function handleReset() {
    setType("")
    setStatus("")
    setPriority("")
    setWorkflow("")
    setAssignee("")
    setPage(1)
    router.replace("/workflow-requests", { scroll: false })
  }

  function handlePageChange(p: number) {
    setPage(p)
    updateUrl({ page: String(p) })
  }

  const filtered = useMemo(() => {
    let result = [...workflowRequests]
    if (type) result = result.filter((r) => r.type === type)
    if (status) result = result.filter((r) => r.status === status)
    if (priority) result = result.filter((r) => r.priority === priority)
    if (workflow) result = result.filter((r) => r.workflowName === workflow)
    if (assignee) result = result.filter((r) => r.assignee === assignee)
    result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    return result
  }, [workflowRequests, type, status, priority, workflow, assignee])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  function handleExportCsv() {
    const headers = [
      "ID",
      "Title",
      "Type",
      "Status",
      "Priority",
      "Workflow",
      "Assignee",
      "Created At",
    ]
    const rows = filtered.map((r) => [
      r.id,
      `"${r.title.replace(/"/g, '""')}"`,
      r.type,
      r.status,
      r.priority,
      r.workflowName,
      r.assignee || "",
      r.createdAt,
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `workflow-requests-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("CSV exported successfully")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Workflow Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Track improvement requests and new workflow proposals
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          )}
          <Link
            href="/workflow-requests/new"
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Request
          </Link>
        </div>
      </div>

      {/* Filters */}
      <WorkflowRequestFilters
        type={type}
        setType={(v) => handleFilterChange(setType, "type", v)}
        status={status}
        setStatus={(v) => handleFilterChange(setStatus, "status", v)}
        priority={priority}
        setPriority={(v) => handleFilterChange(setPriority, "priority", v)}
        workflow={workflow}
        setWorkflow={(v) => handleFilterChange(setWorkflow, "workflow", v)}
        assignee={assignee}
        setAssignee={(v) => handleFilterChange(setAssignee, "assignee", v)}
        onReset={handleReset}
      />

      {/* Table */}
      <WorkflowRequestTable
        requests={paginated}
        page={page}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
