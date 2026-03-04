import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

  const existing = await prisma.incident.findUnique({
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

  const incident = await prisma.incident.upsert({
    where: {
      sourceInstance_executionId: {
        sourceInstance: normalized.sourceInstance,
        executionId: normalized.executionId
      }
    },
    create: {
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
    },
    update: {
      workflowId: normalized.workflowReference,
      workflowName: normalized.workflowName,
      failedAt: normalized.failedAt,
      errorMessage: normalized.summary,
      errorNodeName: normalized.errorNodeName,
      errorType: normalized.errorType,
      errorStack: normalized.description,
      executionUrl: normalized.executionUrl
    }
  });

  await prisma.incidentRawPayload.create({
    data: {
      incidentId: incident.id,
      payload: body as Prisma.InputJsonValue
    }
  });

  return NextResponse.json(
    {
      success: true,
      deduplicated: Boolean(existing),
      incidentId: incident.id
    },
    { status: existing ? 200 : 201 }
  );
}
