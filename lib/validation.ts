import { IncidentStatus } from "@prisma/client";
import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200)
});

export const ingestFailureSchema = z.object({
  sourceInstance: z.string().min(1),
  workflowId: z.string().min(1),
  workflowName: z.string().min(1),
  executionId: z.string().min(1),
  failedAt: z.coerce.date(),
  errorMessage: z.string().min(1),
  errorNodeName: z.string().min(1).optional(),
  errorType: z.string().min(1).optional(),
  errorStack: z.string().min(1).optional(),
  n8nBaseUrl: z.string().url()
});

export const statusUpdateSchema = z.object({
  toStatus: z.nativeEnum(IncidentStatus),
  resolutionReason: z.string().trim().min(1).max(2000).optional(),
  reopenReason: z.string().trim().min(1).max(2000).optional(),
  actionReason: z.string().trim().min(1).max(2000).optional()
});
