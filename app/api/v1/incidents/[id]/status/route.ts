import { IncidentStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http";
import { canTransitionStatus } from "@/lib/incidents";
import { statusUpdateSchema } from "@/lib/validation";

type Params = {
  params: {
    id: string;
  };
};
const DEFAULT_OPEN_TO_IN_PROGRESS_REASON = "start working";

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
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

    const parsed = statusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid status update payload", 400);
    }

    const incident = await prisma.incident.findUnique({
      where: {
        id: params.id
      }
    });

    if (!incident) {
      return jsonError("Incident not found", 404);
    }

    const targetStatus = parsed.data.toStatus;

    if (!canTransitionStatus(session.role, incident.status, targetStatus)) {
      return jsonError("Forbidden status transition", 403);
    }

    if (targetStatus === IncidentStatus.RESOLVED && !parsed.data.resolutionReason) {
      return jsonError("resolutionReason is required for RESOLVED", 400);
    }

    if (
      incident.status === IncidentStatus.RESOLVED &&
      targetStatus === IncidentStatus.OPEN &&
      !parsed.data.reopenReason
    ) {
      return jsonError("reopenReason is required when reopening", 400);
    }

    const actionReason =
      targetStatus === IncidentStatus.RESOLVED
        ? parsed.data.resolutionReason
        : incident.status === IncidentStatus.RESOLVED && targetStatus === IncidentStatus.OPEN
          ? parsed.data.reopenReason
          : parsed.data.actionReason && parsed.data.actionReason.length > 0
            ? parsed.data.actionReason
            : incident.status === IncidentStatus.OPEN && targetStatus === IncidentStatus.IN_PROGRESS
              ? DEFAULT_OPEN_TO_IN_PROGRESS_REASON
              : undefined;

    const updateData: Prisma.IncidentUpdateInput = {
      status: targetStatus
    };

    if (targetStatus === IncidentStatus.RESOLVED) {
      updateData.resolutionReason = parsed.data.resolutionReason;
      updateData.resolvedBy = session.username;
      updateData.resolvedAt = new Date();
    }

    if (incident.status === IncidentStatus.RESOLVED && targetStatus === IncidentStatus.OPEN) {
      updateData.resolutionReason = null;
      updateData.resolvedBy = null;
      updateData.resolvedAt = null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextIncident = await tx.incident.update({
        where: { id: incident.id },
        data: updateData
      });

      await tx.incidentEvent.create({
        data: {
          incidentId: incident.id,
          fromStatus: incident.status,
          toStatus: targetStatus,
          actionReason,
          actorUsername: session.username,
          actorRole: session.role
        }
      });

      return nextIncident;
    });

    return NextResponse.json({
      success: true,
      incident: updated
    });
  } catch (error) {
    console.error("Failed to update incident status", error);
    return jsonError("Failed to update incident status", 500);
  }
}
