"use client"

import Link from "next/link"
import { format } from "date-fns"
import type { Incident } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { PriorityBadge } from "@/components/priority-badge"
import { ExternalLink } from "lucide-react"

interface IncidentTableProps {
  incidents: Incident[]
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function IncidentTable({
  incidents,
  page,
  pageSize,
  total,
  onPageChange,
}: IncidentTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Workflow
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Failed At (UTC)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {incidents.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No incidents found
                </td>
              </tr>
            ) : (
              incidents.map((inc) => (
                <tr
                  key={inc.id}
                  className="border-b border-border/50 transition-colors hover:bg-secondary/20"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {inc.id}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {inc.workflowName}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inc.status} />
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={inc.priority} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {inc.sourceInstance}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {format(new Date(inc.failedAt), "yyyy-MM-dd HH:mm:ss")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/incidents/${inc.id}`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
                    >
                      Details
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Showing {Math.min((page - 1) * pageSize + 1, total)}-
          {Math.min(page * pageSize, total)} of {total}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                p === page
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
