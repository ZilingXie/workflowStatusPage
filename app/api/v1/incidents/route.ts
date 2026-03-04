import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/guards";
import { buildIncidentWhere, parseIncidentFilters } from "@/lib/incidents";
import { jsonError } from "@/lib/http";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const filters = parseIncidentFilters(request.nextUrl.searchParams);
  const where = buildIncidentWhere(filters);

  const [total, incidents] = await prisma.$transaction([
    prisma.incident.count({ where }),
    prisma.incident.findMany({
      where,
      orderBy: {
        failedAt: "desc"
      },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        failedAt: true,
        workflowId: true,
        workflowName: true,
        executionId: true,
        executionUrl: true,
        priority: true,
        errorMessage: true,
        errorStack: true,
        status: true,
        resolvedBy: true,
        updatedAt: true
      }
    })
  ]);

  return NextResponse.json({
    success: true,
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    items: incidents.map((incident) => ({
      ...incident,
      workflowURL: incident.workflowId,
      executionID: incident.executionId,
      executionURL: incident.executionUrl,
      summary: incident.errorMessage,
      description: incident.errorStack ?? "",
      priority: incident.priority
    }))
  });
}
