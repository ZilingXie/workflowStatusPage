"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import type {
  Incident,
  WorkflowRequest,
  IncidentStatus,
  IncidentPriority,
  WorkflowRequestStatus,
  Comment,
  StatusHistoryEntry,
  EventHistoryEntry,
} from "@/lib/types"
import { MOCK_INCIDENTS, MOCK_WORKFLOW_REQUESTS } from "@/lib/mock-data"

interface DataContextType {
  incidents: Incident[]
  workflowRequests: WorkflowRequest[]
  updateIncidentStatus: (
    id: string,
    newStatus: IncidentStatus,
    changedBy: string,
    reason?: string
  ) => void
  updateIncidentPriority: (
    id: string,
    newPriority: IncidentPriority,
    changedBy: string
  ) => void
  updateWorkflowRequestStatus: (
    id: string,
    newStatus: WorkflowRequestStatus,
    actor: string
  ) => void
  updateWorkflowRequestAssignee: (
    id: string,
    assignee: string,
    actor: string
  ) => void
  updateWorkflowRequestFields: (
    id: string,
    fields: Partial<Pick<WorkflowRequest, "title" | "description" | "priority">>,
    actor: string
  ) => void
  addWorkflowRequest: (req: WorkflowRequest) => void
  addComment: (requestId: string, comment: Comment) => void
  updateComment: (requestId: string, commentId: string, content: string) => void
  deleteComment: (requestId: string, commentId: string) => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS)
  const [workflowRequests, setWorkflowRequests] = useState<WorkflowRequest[]>(
    MOCK_WORKFLOW_REQUESTS
  )

  const updateIncidentStatus = useCallback(
    (id: string, newStatus: IncidentStatus, changedBy: string, reason?: string) => {
      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== id) return inc
          const entry: StatusHistoryEntry = {
            id: `${id}-h${inc.statusHistory.length + 1}`,
            timestamp: new Date().toISOString(),
            fromStatus: inc.status,
            toStatus: newStatus,
            changedBy,
            reason,
          }
          return {
            ...inc,
            status: newStatus,
            resolvedAt: newStatus === "RESOLVED" ? new Date().toISOString() : inc.resolvedAt,
            statusHistory: [...inc.statusHistory, entry],
          }
        })
      )
    },
    []
  )

  const updateIncidentPriority = useCallback(
    (id: string, newPriority: IncidentPriority, changedBy: string) => {
      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== id) return inc
          const entry: StatusHistoryEntry = {
            id: `${id}-h${inc.statusHistory.length + 1}`,
            timestamp: new Date().toISOString(),
            fromStatus: `Priority: ${inc.priority}`,
            toStatus: `Priority: ${newPriority}`,
            changedBy,
            reason: "Priority updated",
          }
          return {
            ...inc,
            priority: newPriority,
            statusHistory: [...inc.statusHistory, entry],
          }
        })
      )
    },
    []
  )

  const updateWorkflowRequestStatus = useCallback(
    (id: string, newStatus: WorkflowRequestStatus, actor: string) => {
      setWorkflowRequests((prev) =>
        prev.map((wr) => {
          if (wr.id !== id) return wr
          const entry: EventHistoryEntry = {
            id: `${id}-e${wr.eventHistory.length + 1}`,
            timestamp: new Date().toISOString(),
            type: "STATUS_CHANGE",
            actor,
            description: `Status changed from ${wr.status} to ${newStatus}`,
            details: { from: wr.status, to: newStatus },
          }
          return {
            ...wr,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            eventHistory: [...wr.eventHistory, entry],
          }
        })
      )
    },
    []
  )

  const updateWorkflowRequestAssignee = useCallback(
    (id: string, assignee: string, actor: string) => {
      setWorkflowRequests((prev) =>
        prev.map((wr) => {
          if (wr.id !== id) return wr
          const entry: EventHistoryEntry = {
            id: `${id}-e${wr.eventHistory.length + 1}`,
            timestamp: new Date().toISOString(),
            type: "ASSIGNEE_CHANGE",
            actor,
            description: `Assigned to ${assignee}`,
            details: { assignee },
          }
          return {
            ...wr,
            assignee,
            updatedAt: new Date().toISOString(),
            eventHistory: [...wr.eventHistory, entry],
          }
        })
      )
    },
    []
  )

  const updateWorkflowRequestFields = useCallback(
    (
      id: string,
      fields: Partial<Pick<WorkflowRequest, "title" | "description" | "priority">>,
      actor: string
    ) => {
      setWorkflowRequests((prev) =>
        prev.map((wr) => {
          if (wr.id !== id) return wr
          const entry: EventHistoryEntry = {
            id: `${id}-e${wr.eventHistory.length + 1}`,
            timestamp: new Date().toISOString(),
            type: "FIELD_UPDATE",
            actor,
            description: `Updated fields: ${Object.keys(fields).join(", ")}`,
          }
          return {
            ...wr,
            ...fields,
            updatedAt: new Date().toISOString(),
            eventHistory: [...wr.eventHistory, entry],
          }
        })
      )
    },
    []
  )

  const addWorkflowRequest = useCallback((req: WorkflowRequest) => {
    setWorkflowRequests((prev) => [req, ...prev])
  }, [])

  const addComment = useCallback((requestId: string, comment: Comment) => {
    setWorkflowRequests((prev) =>
      prev.map((wr) => {
        if (wr.id !== requestId) return wr
        const entry: EventHistoryEntry = {
          id: `${requestId}-e${wr.eventHistory.length + 1}`,
          timestamp: new Date().toISOString(),
          type: "COMMENT",
          actor: comment.author,
          description: "Added a comment",
        }
        return {
          ...wr,
          comments: [...wr.comments, comment],
          updatedAt: new Date().toISOString(),
          eventHistory: [...wr.eventHistory, entry],
        }
      })
    )
  }, [])

  const updateComment = useCallback(
    (requestId: string, commentId: string, content: string) => {
      setWorkflowRequests((prev) =>
        prev.map((wr) => {
          if (wr.id !== requestId) return wr
          return {
            ...wr,
            comments: wr.comments.map((c) =>
              c.id === commentId
                ? { ...c, content, updatedAt: new Date().toISOString() }
                : c
            ),
          }
        })
      )
    },
    []
  )

  const deleteComment = useCallback(
    (requestId: string, commentId: string) => {
      setWorkflowRequests((prev) =>
        prev.map((wr) => {
          if (wr.id !== requestId) return wr
          return {
            ...wr,
            comments: wr.comments.filter((c) => c.id !== commentId),
          }
        })
      )
    },
    []
  )

  return (
    <DataContext.Provider
      value={{
        incidents,
        workflowRequests,
        updateIncidentStatus,
        updateIncidentPriority,
        updateWorkflowRequestStatus,
        updateWorkflowRequestAssignee,
        updateWorkflowRequestFields,
        addWorkflowRequest,
        addComment,
        updateComment,
        deleteComment,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
