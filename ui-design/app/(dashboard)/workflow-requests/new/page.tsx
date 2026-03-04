"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useData } from "@/hooks/use-data"
import { useAuth } from "@/hooks/use-mock-auth"
import { WORKFLOW_NAMES, INCIDENT_PRIORITIES, WORKFLOW_REQUEST_TYPES } from "@/lib/constants"
import type { WorkflowRequest, WorkflowRequestType, IncidentPriority } from "@/lib/types"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"

export default function NewWorkflowRequestPage() {
  const { addWorkflowRequest, incidents, workflowRequests } = useData()
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromIncidentId = searchParams.get("from_incident")

  const [title, setTitle] = useState("")
  const [type, setType] = useState<WorkflowRequestType>("IMPROVEMENT")
  const [workflowName, setWorkflowName] = useState("")
  const [priority, setPriority] = useState<IncidentPriority>("MEDIUM")
  const [description, setDescription] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Pre-fill from incident
  useEffect(() => {
    if (fromIncidentId) {
      const inc = incidents.find((i) => i.id === fromIncidentId)
      if (inc) {
        setWorkflowName(inc.workflowName)
        setDescription(
          `Related to incident ${inc.id}.\n\nWorkflow: ${inc.workflowName}\nError: ${inc.errorMessage}\n\nProposed improvement:\n`
        )
        setPriority(inc.priority)
      }
    }
  }, [fromIncidentId, incidents])

  function validate() {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = "Title is required"
    if (!workflowName) errs.workflowName = "Workflow name is required"
    if (!description.trim()) errs.description = "Description is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !user) return

    const newId = `WR-${String(workflowRequests.length + 1).padStart(4, "0")}`
    const now = new Date().toISOString()

    const newRequest: WorkflowRequest = {
      id: newId,
      title: title.trim(),
      type,
      status: "PROPOSED",
      priority,
      workflowName,
      description: description.trim(),
      createdBy: user.username,
      createdAt: now,
      updatedAt: now,
      relatedIncidentId: fromIncidentId || undefined,
      comments: [],
      eventHistory: [
        {
          id: `${newId}-e1`,
          timestamp: now,
          type: "CREATED",
          actor: user.username,
          description: "Request created",
        },
      ],
    }

    addWorkflowRequest(newRequest)
    toast.success("Workflow request created")
    router.push(`/workflow-requests/${newId}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => router.push("/workflow-requests")}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Workflow Requests
      </button>

      <div>
        <h1 className="text-xl font-semibold text-foreground">
          New Workflow Request
        </h1>
        <p className="text-sm text-muted-foreground">
          Submit a new improvement request or new workflow proposal
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex max-w-2xl flex-col gap-5 rounded-lg border border-border bg-card p-6"
      >
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-medium text-foreground">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief description of the request"
            className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className="text-sm font-medium text-foreground">
            Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as WorkflowRequestType)}
            className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {WORKFLOW_REQUEST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Workflow Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="workflow" className="text-sm font-medium text-foreground">
            Workflow Name
          </label>
          <select
            id="workflow"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select a workflow</option>
            {WORKFLOW_NAMES.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
          {errors.workflowName && (
            <p className="text-xs text-destructive">{errors.workflowName}</p>
          )}
        </div>

        {/* Priority */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="priority" className="text-sm font-medium text-foreground">
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as IncidentPriority)}
            className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {INCIDENT_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="desc" className="text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the proposed change or new workflow..."
            rows={6}
            className="rounded-md border border-input bg-input/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.description && (
            <p className="text-xs text-destructive">{errors.description}</p>
          )}
        </div>

        {fromIncidentId && (
          <div className="rounded-md border border-border/50 bg-secondary/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Linked to incident: <span className="font-mono font-medium text-foreground">{fromIncidentId}</span>
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Create Request
          </button>
          <button
            type="button"
            onClick={() => router.push("/workflow-requests")}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
