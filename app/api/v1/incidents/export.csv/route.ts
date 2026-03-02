import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http";
import { buildIncidentWhere, escapeCsvField, parseIncidentFilters } from "@/lib/incidents";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  if (session.role !== UserRole.ADMIN) {
    return jsonError("Forbidden", 403);
  }

  const filters = parseIncidentFilters(request.nextUrl.searchParams);
  const where = buildIncidentWhere(filters);

  const incidents = await prisma.incident.findMany({
    where,
    orderBy: {
      failedAt: "desc"
    },
    take: 10000
  });

  const header = [
    "id",
    "failed_at_utc",
    "source_instance",
    "workflow_id",
    "workflow_name",
    "execution_id",
    "execution_url",
    "status",
    "error_message",
    "error_node_name",
    "error_type",
    "resolved_by",
    "resolved_at_utc",
    "resolution_reason"
  ];

  const rows = incidents.map((incident) => {
    return [
      incident.id,
      incident.failedAt.toISOString(),
      incident.sourceInstance,
      incident.workflowId,
      incident.workflowName,
      incident.executionId,
      incident.executionUrl,
      incident.status,
      incident.errorMessage,
      incident.errorNodeName,
      incident.errorType,
      incident.resolvedBy,
      incident.resolvedAt ? incident.resolvedAt.toISOString() : "",
      incident.resolutionReason
    ]
      .map((value) => escapeCsvField(value == null ? "" : String(value)))
      .join(",");
  });

  const csvText = [header.join(","), ...rows].join("\n");

  return new NextResponse(csvText, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=incidents.csv"
    }
  });
}
