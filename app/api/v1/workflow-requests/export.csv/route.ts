import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http";
import { escapeCsvField } from "@/lib/incidents";
import {
  buildWorkflowRequestWhere,
  parseWorkflowRequestFilters
} from "@/lib/workflowRequests";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  if (session.role !== UserRole.ADMIN) {
    return jsonError("Forbidden", 403);
  }

  const filters = parseWorkflowRequestFilters(request.nextUrl.searchParams);
  const where = buildWorkflowRequestWhere(filters);

  const items = await prisma.workflowRequest.findMany({
    where,
    orderBy: {
      createdAt: "desc"
    },
    take: 10000
  });

  const header = [
    "id",
    "type",
    "status",
    "priority",
    "title",
    "description",
    "workflow_name",
    "workflow_reference",
    "requested_workflow_name",
    "business_goal",
    "expected_trigger",
    "proposed_by",
    "assignee_username",
    "source_incident_id",
    "created_at_utc",
    "updated_at_utc"
  ];

  const rows = items.map((item) => {
    return [
      item.id,
      item.type,
      item.status,
      item.priority,
      item.title,
      item.description,
      item.workflowName,
      item.workflowReference,
      item.requestedWorkflowName,
      item.businessGoal,
      item.expectedTrigger,
      item.proposedBy,
      item.assigneeUsername,
      item.sourceIncidentId,
      item.createdAt.toISOString(),
      item.updatedAt.toISOString()
    ]
      .map((value) => escapeCsvField(value == null ? "" : String(value)))
      .join(",");
  });

  const csvText = [header.join(","), ...rows].join("\n");

  return new NextResponse(csvText, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=workflow-requests.csv"
    }
  });
}
