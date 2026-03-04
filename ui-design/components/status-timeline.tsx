"use client"

import { format } from "date-fns"
import type { StatusHistoryEntry, EventHistoryEntry } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { ArrowRight } from "lucide-react"

export function StatusTimeline({ entries }: { entries: StatusHistoryEntry[] }) {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="flex flex-col gap-0">
      {sorted.map((entry, i) => (
        <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Vertical line */}
          {i < sorted.length - 1 && (
            <div className="absolute left-[11px] top-6 h-full w-px bg-border" />
          )}
          {/* Dot */}
          <div className="relative z-10 mt-1.5 h-[9px] w-[9px] flex-shrink-0 rounded-full border-2 border-primary bg-background" />
          {/* Content */}
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              {entry.fromStatus !== "-" ? (
                <>
                  <StatusBadge status={entry.fromStatus} />
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <StatusBadge status={entry.toStatus} />
                </>
              ) : (
                <StatusBadge status={entry.toStatus} />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{entry.changedBy}</span>
              {" -- "}
              {format(new Date(entry.timestamp), "yyyy-MM-dd HH:mm:ss")} (UTC)
            </p>
            {entry.reason && (
              <p className="text-xs text-muted-foreground">{entry.reason}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function EventTimeline({ entries }: { entries: EventHistoryEntry[] }) {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const typeLabel: Record<string, string> = {
    STATUS_CHANGE: "Status Change",
    ASSIGNEE_CHANGE: "Assignee Change",
    FIELD_UPDATE: "Field Update",
    COMMENT: "Comment",
    CREATED: "Created",
  }

  return (
    <div className="flex flex-col gap-0">
      {sorted.map((entry, i) => (
        <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
          {i < sorted.length - 1 && (
            <div className="absolute left-[11px] top-6 h-full w-px bg-border" />
          )}
          <div className="relative z-10 mt-1.5 h-[9px] w-[9px] flex-shrink-0 rounded-full border-2 border-primary bg-background" />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-foreground">
              {typeLabel[entry.type] || entry.type}
            </p>
            <p className="text-xs text-muted-foreground">
              {entry.description}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{entry.actor}</span>
              {" -- "}
              {format(new Date(entry.timestamp), "yyyy-MM-dd HH:mm:ss")} (UTC)
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
