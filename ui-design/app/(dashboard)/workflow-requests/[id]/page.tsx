"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { useData } from "@/hooks/use-data"
import { useAuth } from "@/hooks/use-mock-auth"
import { StatusBadge } from "@/components/status-badge"
import { PriorityBadge } from "@/components/priority-badge"
import { EventTimeline } from "@/components/status-timeline"
import { CommentSection } from "@/components/comment-section"
import { INCIDENT_PRIORITIES } from "@/lib/constants"
import { TYPE_COLOR_MAP } from "@/lib/constants"
import { MOCK_USERS } from "@/lib/mock-data"
import type { WorkflowRequestStatus, IncidentPriority } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  ArrowLeft,
  Edit2,
  AlertTriangle,
} from "lucide-react"

// Status transition map
const STATUS_TRANSITIONS: Record<string, { label: string; next: WorkflowRequestStatus; color: string }[]> = {
  PROPOSED: [
    { label: "Triage", next: "TRIAGED", color: "bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25" },
    { label: "Reject", next: "REJECTED", color: "bg-zinc-500/15 text-zinc-400 hover:bg-zinc-500/25" },
  ],
  TRIAGED: [
    { label: "Plan", next: "PLANNED", color: "bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25" },
    { label: "Reject", next: "REJECTED", color: "bg-zinc-500/15 text-zinc-400 hover:bg-zinc-500/25" },
  ],
  PLANNED: [
    { label: "Start Work", next: "IN_PROGRESS", color: "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25" },
  ],
  IN_PROGRESS: [
    { label: "Mark Done", next: "DONE", color: "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" },
  ],
}

export default function WorkflowRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const {
    workflowRequests,
    updateWorkflowRequestStatus,
    updateWorkflowRequestAssignee,
    updateWorkflowRequestFields,
    addComment,
    updateComment,
    deleteComment,
  } = useData()
  const { user, isAdmin } = useAuth()
  const router = useRouter()

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPriority, setEditPriority] = useState<IncidentPriority>("MEDIUM")

  const request = workflowRequests.find((r) => r.id === id)

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Workflow request not found</p>
        <button
          onClick={() => router.push("/workflow-requests")}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workflow Requests
        </button>
      </div>
    )
  }

  const transitions = STATUS_TRANSITIONS[request.status] || []
  const canEdit =
    isAdmin ||
    (user?.username === request.createdBy &&
      !["DONE", "REJECTED"].includes(request.status))

  function handleStatusChange(newStatus: WorkflowRequestStatus) {
    if (!user) return
    updateWorkflowRequestStatus(request!.id, newStatus, user.username)
    toast.success(`Status updated to ${newStatus}`)
  }

  function handleAssigneeChange(assignee: string) {
    if (!user) return
    updateWorkflowRequestAssignee(request!.id, assignee, user.username)
    toast.success(`Assigned to ${assignee}`)
  }

  function openEditDialog() {
    setEditTitle(request!.title)
    setEditDescription(request!.description)
    setEditPriority(request!.priority)
    setShowEditDialog(true)
  }

  function handleSaveEdit() {
    if (!user) return
    const updates: Record<string, string> = {}
    if (editTitle !== request!.title) updates.title = editTitle
    if (editDescription !== request!.description) updates.description = editDescription
    if (editPriority !== request!.priority) updates.priority = editPriority

    if (Object.keys(updates).length > 0) {
      updateWorkflowRequestFields(request!.id, updates as Record<string, string>, user.username)
      toast.success("Request updated")
    }
    setShowEditDialog(false)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back */}
      <button
        onClick={() => router.push("/workflow-requests")}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Workflow Requests
      </button>

      {/* Header Card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-lg font-semibold text-foreground">
                {request.title}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                  TYPE_COLOR_MAP[request.type]
                )}
              >
                {request.type === "IMPROVEMENT" ? "Improvement" : "New Workflow"}
              </span>
              <StatusBadge status={request.status} />
            </div>
            <p className="font-mono text-xs text-muted-foreground">{request.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={request.priority} />
            {canEdit && (
              <button
                onClick={openEditDialog}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Edit2 className="h-3 w-3" />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-border/50 bg-secondary/20 p-4 sm:grid-cols-4">
          <InfoItem label="Workflow" value={request.workflowName} />
          <InfoItem label="Created By" value={request.createdBy} />
          <InfoItem
            label="Created At (UTC)"
            value={format(new Date(request.createdAt), "yyyy-MM-dd HH:mm:ss")}
          />
          <InfoItem
            label="Updated At (UTC)"
            value={format(new Date(request.updatedAt), "yyyy-MM-dd HH:mm:ss")}
          />
        </div>

        {/* Assignee */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Assignee:</span>
            {isAdmin ? (
              <select
                value={request.assignee || ""}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="h-8 rounded-md border border-input bg-input/50 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Unassigned</option>
                {MOCK_USERS.map((u) => (
                  <option key={u.username} value={u.username}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-medium text-foreground">
                {request.assignee || "Unassigned"}
              </span>
            )}
          </div>

          {request.relatedIncidentId && (
            <Link
              href={`/incidents/${request.relatedIncidentId}`}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <AlertTriangle className="h-3 w-3" />
              Related: {request.relatedIncidentId}
            </Link>
          )}
        </div>

        {/* Status Actions (ADMIN only) */}
        {isAdmin && transitions.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {transitions.map((t) => (
              <button
                key={t.next}
                onClick={() => handleStatusChange(t.next)}
                className={cn("rounded-md px-4 py-2 text-sm font-medium transition-colors", t.color)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Description</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
          {request.description}
        </p>
      </div>

      {/* Comments */}
      <div className="rounded-lg border border-border bg-card p-6">
        <CommentSection
          comments={request.comments}
          requestId={request.id}
          onAdd={addComment}
          onUpdate={updateComment}
          onDelete={deleteComment}
        />
      </div>

      {/* Event Timeline */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Event History</h2>
        <EventTimeline entries={request.eventHistory} />
      </div>

      {/* Edit Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div
            className="fixed inset-0"
            onClick={() => setShowEditDialog(false)}
            onKeyDown={(e) => e.key === "Escape" && setShowEditDialog(false)}
            role="button"
            tabIndex={0}
            aria-label="Close dialog"
          />
          <div className="relative z-10 w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg">
            <h2 className="text-sm font-semibold text-foreground">Edit Request</h2>
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-title" className="text-xs text-muted-foreground">
                  Title
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-9 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-priority" className="text-xs text-muted-foreground">
                  Priority
                </label>
                <select
                  id="edit-priority"
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as IncidentPriority)}
                  className="h-9 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {INCIDENT_PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-desc" className="text-xs text-muted-foreground">
                  Description
                </label>
                <textarea
                  id="edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={5}
                  className="rounded-md border border-input bg-input/50 p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowEditDialog(false)}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}
