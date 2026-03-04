import { WorkflowRequestEventType, WorkflowRequestStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http";
import { canTransitionWorkflowRequestStatus } from "@/lib/workflowRequests";
import { workflowRequestStatusUpdateSchema } from "@/lib/validation";

type Params = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = workflowRequestStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid status payload", 400);
  }

  const item = await prisma.workflowRequest.findUnique({
    where: {
      id: params.id
    },
    select: {
      id: true,
      status: true
    }
  });

  if (!item) {
    return jsonError("Workflow request not found", 404);
  }

  const toStatus = parsed.data.toStatus;
  if (toStatus === item.status) {
    return jsonError("Target status is the same as current status", 400);
  }

  if (!canTransitionWorkflowRequestStatus(session.role, item.status, toStatus)) {
    return jsonError("Forbidden status transition", 403);
  }

  const actionReason = parsed.data.actionReason?.trim();
  if (
    (toStatus === WorkflowRequestStatus.DONE || toStatus === WorkflowRequestStatus.REJECTED) &&
    !actionReason
  ) {
    return jsonError("actionReason is required when moving to DONE or REJECTED", 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.workflowRequest.update({
      where: {
        id: item.id
      },
      data: {
        status: toStatus
      }
    });

    await tx.workflowRequestEvent.create({
      data: {
        requestId: item.id,
        eventType: WorkflowRequestEventType.STATUS_CHANGED,
        fromStatus: item.status,
        toStatus,
        actionReason: actionReason || null,
        actorUsername: session.username,
        actorRole: session.role
      }
    });

    return next;
  });

  return NextResponse.json({
    success: true,
    item: updated
  });
}
