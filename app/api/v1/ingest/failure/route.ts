import { NextRequest, NextResponse } from "next/server";
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

  const payload = parsed.data;

  const existing = await prisma.incident.findUnique({
    where: {
      sourceInstance_executionId: {
        sourceInstance: payload.sourceInstance,
        executionId: payload.executionId
      }
    },
    select: {
      id: true
    }
  });

  const incident = await prisma.incident.upsert({
    where: {
      sourceInstance_executionId: {
        sourceInstance: payload.sourceInstance,
        executionId: payload.executionId
      }
    },
    create: {
      sourceInstance: payload.sourceInstance,
      workflowId: payload.workflowId,
      workflowName: payload.workflowName,
      executionId: payload.executionId,
      failedAt: payload.failedAt,
      errorMessage: payload.errorMessage,
      errorNodeName: payload.errorNodeName,
      errorType: payload.errorType,
      errorStack: payload.errorStack,
      executionUrl: buildExecutionUrl(payload.n8nBaseUrl, payload.executionId)
    },
    update: {
      workflowId: payload.workflowId,
      workflowName: payload.workflowName,
      failedAt: payload.failedAt,
      errorMessage: payload.errorMessage,
      errorNodeName: payload.errorNodeName,
      errorType: payload.errorType,
      errorStack: payload.errorStack,
      executionUrl: buildExecutionUrl(payload.n8nBaseUrl, payload.executionId)
    }
  });

  await prisma.incidentRawPayload.create({
    data: {
      incidentId: incident.id,
      payload: body as Record<string, unknown>
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
