import {
  IncidentPriority,
  IncidentStatus,
  WorkflowRequestStatus,
  WorkflowRequestType
} from "@prisma/client";
import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200)
});

export const ingestFailureSchema = z.object({
  sourceInstance: z.string().min(1).optional(),
  workflowId: z.string().min(1).optional(),
  workflowName: z.string().min(1),
  workflowURL: z.string().url().optional(),
  executionId: z.string().min(1).optional(),
  executionID: z.string().min(1).optional(),
  executionURL: z.string().url().optional(),
  failedAt: z.string().min(1).optional(),
  time: z.string().min(1).optional(),
  errorMessage: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  errorNodeName: z.string().min(1).optional(),
  errorType: z.string().min(1).optional(),
  errorStack: z.string().optional(),
  description: z.string().optional(),
  n8nBaseUrl: z.string().url().optional()
});

export const statusUpdateSchema = z.object({
  toStatus: z.nativeEnum(IncidentStatus),
  resolutionReason: z.string().trim().min(1).max(2000).optional(),
  reopenReason: z.string().trim().min(1).max(2000).optional(),
  actionReason: z.string().trim().max(2000).optional()
});

export const priorityUpdateSchema = z.object({
  priority: z.nativeEnum(IncidentPriority)
});

export const workflowRequestCreateSchema = z
  .object({
    type: z.nativeEnum(WorkflowRequestType),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(8000),
    workflowName: z.string().trim().max(200).optional(),
    workflowReference: z.string().trim().max(2000).optional(),
    requestedWorkflowName: z.string().trim().max(200).optional(),
    businessGoal: z.string().trim().max(2000).optional(),
    expectedTrigger: z.string().trim().max(2000).optional(),
    priority: z.nativeEnum(IncidentPriority).optional(),
    sourceIncidentId: z.string().uuid().optional(),
    assigneeUsername: z.string().trim().min(1).max(100).optional()
  })
  .superRefine((value, context) => {
    if (value.type === WorkflowRequestType.IMPROVEMENT && !value.workflowName?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["workflowName"],
        message: "workflowName is required for IMPROVEMENT"
      });
    }

    if (value.type === WorkflowRequestType.NEW_WORKFLOW) {
      if (!value.requestedWorkflowName?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["requestedWorkflowName"],
          message: "requestedWorkflowName is required for NEW_WORKFLOW"
        });
      }

      if (!value.businessGoal?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["businessGoal"],
          message: "businessGoal is required for NEW_WORKFLOW"
        });
      }

      if (!value.expectedTrigger?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expectedTrigger"],
          message: "expectedTrigger is required for NEW_WORKFLOW"
        });
      }
    }
  });

export const workflowRequestUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(8000).optional(),
    workflowName: z.string().trim().max(200).nullable().optional(),
    workflowReference: z.string().trim().max(2000).nullable().optional(),
    requestedWorkflowName: z.string().trim().max(200).nullable().optional(),
    businessGoal: z.string().trim().max(2000).nullable().optional(),
    expectedTrigger: z.string().trim().max(2000).nullable().optional(),
    priority: z.nativeEnum(IncidentPriority).optional(),
    updateReason: z.string().trim().max(2000).optional()
  })
  .superRefine((value, context) => {
    const keys: Array<keyof Omit<typeof value, "updateReason">> = [
      "title",
      "description",
      "workflowName",
      "workflowReference",
      "requestedWorkflowName",
      "businessGoal",
      "expectedTrigger",
      "priority"
    ];

    const hasMutatingField = keys.some((key) => value[key] !== undefined);
    if (!hasMutatingField) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one updatable field is required"
      });
    }
  });

export const workflowRequestStatusUpdateSchema = z.object({
  toStatus: z.nativeEnum(WorkflowRequestStatus),
  actionReason: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
    z.string().trim().min(1).max(2000).optional()
  )
});

export const workflowRequestAssigneeUpdateSchema = z.object({
  assigneeUsername: z.string().trim().min(1).max(100).nullable()
});

export const workflowRequestCommentCreateSchema = z.object({
  content: z.string().trim().min(1).max(4000)
});

export const workflowRequestCommentUpdateSchema = z.object({
  content: z.string().trim().min(1).max(4000)
});

export const accountInvitationCreateSchema = z.object({
  email: z.string().trim().email().max(320)
});

export const accountInvitationCompleteSchema = z.object({
  token: z.string().min(20).max(512),
  username: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(200)
});
