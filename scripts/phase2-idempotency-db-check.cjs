#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");

async function main() {
  const [databaseUrl, sourceInstance, executionId, expectedSummary, expectedIncidentId] =
    process.argv.slice(2);

  if (
    !databaseUrl ||
    !sourceInstance ||
    !executionId ||
    !expectedSummary ||
    !expectedIncidentId
  ) {
    throw new Error(
      "Usage: phase2-idempotency-db-check.cjs <databaseUrl> <sourceInstance> <executionId> <expectedSummary> <expectedIncidentId>"
    );
  }

  process.env.DATABASE_URL = databaseUrl;

  const prisma = new PrismaClient();

  try {
    const incidents = await prisma.incident.findMany({
      where: {
        sourceInstance,
        executionId
      },
      select: {
        id: true,
        errorMessage: true
      }
    });

    if (incidents.length !== 1) {
      throw new Error(
        `Expected exactly 1 incident for (${sourceInstance}, ${executionId}), got ${incidents.length}`
      );
    }

    const incident = incidents[0];

    if (incident.id !== expectedIncidentId) {
      throw new Error(
        `Incident id mismatch. Expected ${expectedIncidentId}, got ${incident.id}`
      );
    }

    if (incident.errorMessage !== expectedSummary) {
      throw new Error(
        `Expected incident summary to be updated by second payload. Expected '${expectedSummary}', got '${incident.errorMessage}'`
      );
    }

    const rawPayloadCount = await prisma.incidentRawPayload.count({
      where: {
        incidentId: incident.id
      }
    });

    if (rawPayloadCount < 2) {
      throw new Error(
        `Expected at least 2 raw payload records for incident ${incident.id}, got ${rawPayloadCount}`
      );
    }

    console.log(`DB idempotency checks passed: incident=${incident.id}, rawPayloads=${rawPayloadCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
