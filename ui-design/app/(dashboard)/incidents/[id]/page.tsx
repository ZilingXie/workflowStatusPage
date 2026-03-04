"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { useData } from "@/hooks/use-data"
import { useAuth } from "@/hooks/use-mock-auth"
import { StatusBadge } from "@/components/status-badge"
import { PriorityBadge } from "@/components/priority-badge"
import { StatusTimeline } from "@/components/status-timeline"
import { PayloadViewer } from "@/components/payload-viewer"
import { INCIDENT_PRIORITIES } from "@/lib/constants"
import { toast } from "sonner"
import {
  ArrowLeft,
  GitPullRequest,
  Play,
  CheckCircle2,
  RotateCcw,
} from "lucide-react"

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { incidents, updateIncidentStatus, updateIncidentPriority } = useData()
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [resolveReason, setResolveReason] = useState("")
  const [reopenReason, setReopenReason] = useState("")
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [showReopenDialog, setShowReopenDialog] = useState(false)

  const incident = incidents.find((i) => i.id === id)

  if (!incident) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Incident not found</p>
        <button
          onClick={() => router.push("/incidents")}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Incidents
        </button>
      </div>
    )
  }

  function handleStartProcessing() {
    if (!user) return
    updateIncidentStatus(incident!.id, "IN_PROGRESS", user.username, "Started investigation")
    toast.success("Incident marked as In Progress")
  }

  function handleResolve() {
    if (!user || !resolveReason.trim()) return
    updateIncidentStatus(incident!.id, "RESOLVED", user.username, resolveReason.trim())
    setShowResolveDialog(false)
    setResolveReason("")
    toast.success("Incident resolved")
  }

  function handleReopen() {
    if (!user || !reopenReason.trim()) return
    updateIncidentStatus(incident!.id, "OPEN", user.username, reopenReason.trim())
    setShowReopenDialog(false)
    setReopenReason("")
    toast.success("Incident reopened")
  }

  function handlePriorityChange(newPriority: string) {
    if (!user) return
    updateIncidentPriority(
      incident!.id,
      newPriority as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      user.username
    )
    toast.success(`Priority updated to ${newPriority}`)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <button
        onClick={() => router.push("/incidents")}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Incidents
      </button>

      {/* Header Card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-foreground">
                {incident.workflowName}
              </h1>
              <StatusBadge status={incident.status} />
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {incident.id} / {incident.executionId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Priority selector */}
            <select
              value={incident.priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="h-8 rounded-md border border-input bg-input/50 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {INCIDENT_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <PriorityBadge priority={incident.priority} />
          </div>
        </div>

        {/* Info Grid */}
        <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-border/50 bg-secondary/20 p-4 sm:grid-cols-4">
          <InfoItem label="Source Instance" value={incident.sourceInstance} mono />
          <InfoItem
            label="Failed At (UTC)"
            value={format(new Date(incident.failedAt), "yyyy-MM-dd HH:mm:ss")}
          />
          <InfoItem
            label="Resolved At (UTC)"
            value={
              incident.resolvedAt
                ? format(new Date(incident.resolvedAt), "yyyy-MM-dd HH:mm:ss")
                : "--"
            }
          />
          <InfoItem label="Error" value={incident.errorMessage} />
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {incident.status === "OPEN" && (
            <button
              onClick={handleStartProcessing}
              className="flex items-center gap-2 rounded-md bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/25"
            >
              <Play className="h-4 w-4" />
              Start Processing
            </button>
          )}
          {incident.status === "IN_PROGRESS" && (
            <button
              onClick={() => setShowResolveDialog(true)}
              className="flex items-center gap-2 rounded-md bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Resolved
            </button>
          )}
          {incident.status === "RESOLVED" && isAdmin && (
            <button
              onClick={() => setShowReopenDialog(true)}
              className="flex items-center gap-2 rounded-md bg-red-500/15 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25"
            >
              <RotateCcw className="h-4 w-4" />
              Reopen
            </button>
          )}
          <button
            onClick={() =>
              router.push(
                `/workflow-requests/new?from_incident=${incident.id}`
              )
            }
            className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <GitPullRequest className="h-4 w-4" />
            Create Improvement Request
          </button>
        </div>
      </div>

      {/* Resolve Dialog */}
      {showResolveDialog && (
        <DialogOverlay onClose={() => setShowResolveDialog(false)}>
          <h2 className="text-sm font-semibold text-foreground">Resolve Incident</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Please provide the resolution reason.
          </p>
          <textarea
            value={resolveReason}
            onChange={(e) => setResolveReason(e.target.value)}
            placeholder="Describe how this incident was resolved..."
            className="mt-3 h-24 w-full rounded-md border border-input bg-input/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowResolveDialog(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={!resolveReason.trim()}
              className="rounded-md bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50"
            >
              Resolve
            </button>
          </div>
        </DialogOverlay>
      )}

      {/* Reopen Dialog */}
      {showReopenDialog && (
        <DialogOverlay onClose={() => setShowReopenDialog(false)}>
          <h2 className="text-sm font-semibold text-foreground">Reopen Incident</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Please provide the reason for reopening.
          </p>
          <textarea
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            placeholder="Why is this incident being reopened?"
            className="mt-3 h-24 w-full rounded-md border border-input bg-input/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowReopenDialog(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleReopen}
              disabled={!reopenReason.trim()}
              className="rounded-md bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25 disabled:opacity-50"
            >
              Reopen
            </button>
          </div>
        </DialogOverlay>
      )}

      {/* Status Timeline */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Status History</h2>
        <StatusTimeline entries={incident.statusHistory} />
      </div>

      {/* Payload */}
      <PayloadViewer payload={incident.payload} />
    </div>
  )
}

function InfoItem({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-sm text-foreground ${mono ? "font-mono text-xs" : ""} line-clamp-2`}
      >
        {value}
      </p>
    </div>
  )
}

function DialogOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        {children}
      </div>
    </div>
  )
}
