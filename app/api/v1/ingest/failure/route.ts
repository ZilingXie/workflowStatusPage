import { NextRequest, NextResponse } from "next/server";
import { IncidentStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { ingestFailureSchema } from "@/lib/validation";

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return null;
  }

  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function buildExecutionUrl(baseUrl: string, executionId: string): string {
  const normalized = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalized}/execution/${executionId}`;
}

function parseFailureTime(value: string): Date | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    const utcDate = new Date(`${trimmed}:00Z`);
    return Number.isNaN(utcDate.getTime()) ? null : utcDate;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

type IngestFailureInput = z.infer<typeof ingestFailureSchema>;

const ACTIVE_INCIDENT_STATUSES: IncidentStatus[] = [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS];
const BASE_SIMILARITY_THRESHOLD = 0.62;
const ERROR_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "due",
  "error",
  "failed",
  "for",
  "from",
  "if",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "were",
  "with"
]);

type NormalizedFailurePayload = {
  sourceInstance: string;
  workflowName: string;
  workflowReference: string;
  executionId: string;
  executionUrl: string;
  failedAt: Date;
  summary: string;
  description: string;
  errorNodeName?: string;
  errorType?: string;
};

function normalizeFailurePayload(payload: IngestFailureInput): NormalizedFailurePayload | null {
  const sourceInstance = payload.sourceInstance ?? "n8n-default";
  const executionId = payload.executionID ?? payload.executionId;
  const summary = payload.summary ?? payload.errorMessage;
  const description = payload.description ?? payload.errorStack ?? "";
  const failedAtRaw = payload.time ?? payload.failedAt;
  const workflowReference = payload.workflowURL ?? payload.workflowId;
  const executionUrl =
    payload.executionURL ??
    (payload.n8nBaseUrl && executionId ? buildExecutionUrl(payload.n8nBaseUrl, executionId) : undefined);

  if (!executionId || !summary || !failedAtRaw || !workflowReference || !executionUrl) {
    return null;
  }

  const failedAt = parseFailureTime(failedAtRaw);
  if (!failedAt) {
    return null;
  }

  return {
    sourceInstance,
    workflowName: payload.workflowName,
    workflowReference,
    executionId,
    executionUrl,
    failedAt,
    summary,
    description,
    errorNodeName: payload.errorNodeName,
    errorType: payload.errorType
  };
}

function normalizeErrorTextForSimilarity(input: string): string {
  return input
    .toLowerCase()
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeErrorToken(token: string): string {
  if (token === "violates" || token === "violation" || token === "violated") {
    return "violate";
  }

  if (token === "constraints") {
    return "constraint";
  }

  if (token === "duplicates") {
    return "duplicate";
  }

  if (token === "keys") {
    return "key";
  }

  return token;
}

function tokenizeErrorText(input: string): string[] {
  const normalized = normalizeErrorTextForSimilarity(input);
  if (!normalized) {
    return [];
  }

  const tokens = normalized
    .split(" ")
    .map((token) => normalizeErrorToken(token))
    .filter((token) => token.length >= 3 && !ERROR_STOP_WORDS.has(token));

  return Array.from(new Set(tokens)).sort();
}

function calculateJaccardSimilarity(left: string, right: string): number {
  const leftTokens = tokenizeErrorText(left);
  const rightTokens = tokenizeErrorText(right);

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);

  let intersection = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersection += 1;
    }
  }

  const union = leftSet.size + rightSet.size - intersection;
  if (union === 0) {
    return 0;
  }

  return intersection / union;
}

function equalsIgnoreCase(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) {
    return false;
  }

  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function isLikelySameError(
  incoming: Pick<NormalizedFailurePayload, "summary" | "errorType" | "errorNodeName">,
  existing: {
    errorMessage: string;
    errorType: string | null;
    errorNodeName: string | null;
  }
): boolean {
  if (
    incoming.errorType &&
    existing.errorType &&
    !equalsIgnoreCase(incoming.errorType, existing.errorType)
  ) {
    return false;
  }

  if (
    incoming.errorNodeName &&
    existing.errorNodeName &&
    !equalsIgnoreCase(incoming.errorNodeName, existing.errorNodeName)
  ) {
    return false;
  }

  const incomingNormalized = normalizeErrorTextForSimilarity(incoming.summary);
  const existingNormalized = normalizeErrorTextForSimilarity(existing.errorMessage);

  if (
    incomingNormalized.length >= 20 &&
    existingNormalized.length >= 20 &&
    (incomingNormalized.includes(existingNormalized) || existingNormalized.includes(incomingNormalized))
  ) {
    return true;
  }

  const similarity = calculateJaccardSimilarity(incoming.summary, existing.errorMessage);

  let threshold = BASE_SIMILARITY_THRESHOLD;
  if (incoming.errorType && existing.errorType) {
    threshold -= 0.1;
  }
  if (incoming.errorNodeName && existing.errorNodeName) {
    threshold -= 0.05;
  }

  return similarity >= Math.max(0.4, threshold);
}

async function findSimilarActiveIncident(
  normalized: Pick<
    NormalizedFailurePayload,
    "sourceInstance" | "workflowReference" | "workflowName" | "summary" | "errorType" | "errorNodeName"
  >
): Promise<{ id: string } | null> {
  const candidates = await prisma.incident.findMany({
    where: {
      sourceInstance: normalized.sourceInstance,
      status: {
        in: ACTIVE_INCIDENT_STATUSES
      },
      OR: [
        { workflowId: normalized.workflowReference },
        {
          workflowName: {
            equals: normalized.workflowName,
            mode: "insensitive"
          }
        }
      ]
    },
    select: {
      id: true,
      errorMessage: true,
      errorType: true,
      errorNodeName: true
    },
    orderBy: {
      failedAt: "desc"
    },
    take: 30
  });

  for (const candidate of candidates) {
    if (isLikelySameError(normalized, candidate)) {
      return { id: candidate.id };
    }
  }

  return null;
}

type UpsertIncidentInput = Pick<
  NormalizedFailurePayload,
  | "sourceInstance"
  | "workflowReference"
  | "workflowName"
  | "executionId"
  | "failedAt"
  | "summary"
  | "errorNodeName"
  | "errorType"
  | "description"
  | "executionUrl"
>;

async function updateIncidentById(incidentId: string, normalized: UpsertIncidentInput) {
  return prisma.incident.update({
    where: { id: incidentId },
    data: {
      sourceInstance: normalized.sourceInstance,
      workflowId: normalized.workflowReference,
      workflowName: normalized.workflowName,
      executionId: normalized.executionId,
      failedAt: normalized.failedAt,
      errorMessage: normalized.summary,
      errorNodeName: normalized.errorNodeName,
      errorType: normalized.errorType,
      errorStack: normalized.description,
      executionUrl: normalized.executionUrl
    }
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = getBearerToken(request);

  if (!token || token !== env.ingestToken) {
    return jsonError("Unauthorized", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = ingestFailureSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid failure payload", 400);
  }

  const normalized = normalizeFailurePayload(parsed.data);
  if (!normalized) {
    return jsonError("Invalid failure payload", 400);
  }

  const existingByExecution = await prisma.incident.findUnique({
    where: {
      sourceInstance_executionId: {
        sourceInstance: normalized.sourceInstance,
        executionId: normalized.executionId
      }
    },
    select: {
      id: true
    }
  });

  const similarActiveIncident = existingByExecution
    ? null
    : await findSimilarActiveIncident({
        sourceInstance: normalized.sourceInstance,
        workflowReference: normalized.workflowReference,
        workflowName: normalized.workflowName,
        summary: normalized.summary,
        errorType: normalized.errorType,
        errorNodeName: normalized.errorNodeName
      });

  let incident;
  let deduplicated = false;

  if (existingByExecution) {
    deduplicated = true;
    incident = await updateIncidentById(existingByExecution.id, normalized);
  } else if (similarActiveIncident) {
    deduplicated = true;
    incident = await updateIncidentById(similarActiveIncident.id, normalized);
  } else {
    incident = await prisma.incident.create({
      data: {
        sourceInstance: normalized.sourceInstance,
        workflowId: normalized.workflowReference,
        workflowName: normalized.workflowName,
        executionId: normalized.executionId,
        failedAt: normalized.failedAt,
        errorMessage: normalized.summary,
        errorNodeName: normalized.errorNodeName,
        errorType: normalized.errorType,
        errorStack: normalized.description,
        executionUrl: normalized.executionUrl
      }
    });
  }

  await prisma.incidentRawPayload.create({
    data: {
      incidentId: incident.id,
      payload: body as Prisma.InputJsonValue
    }
  });

  return NextResponse.json(
    {
      success: true,
      deduplicated,
      incidentId: incident.id
    },
    { status: deduplicated ? 200 : 201 }
  );
}
