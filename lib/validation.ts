import { IncidentPriority, IncidentStatus } from "@prisma/client";
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
