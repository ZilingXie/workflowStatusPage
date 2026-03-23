import test from "node:test";
import assert from "node:assert/strict";
import { IncidentStatus } from "@prisma/client";

import { resolveIncidentListStatusFilter } from "../lib/incidents.ts";

test("defaults to OPEN when status query is absent", () => {
  assert.equal(resolveIncidentListStatusFilter(undefined, false), IncidentStatus.OPEN);
});

test("keeps All unfiltered when status query is explicitly empty", () => {
  assert.equal(resolveIncidentListStatusFilter("", true), undefined);
});

test("accepts valid incident statuses", () => {
  assert.equal(
    resolveIncidentListStatusFilter(IncidentStatus.IN_PROGRESS, true),
    IncidentStatus.IN_PROGRESS
  );
});

test("ignores invalid status query values", () => {
  assert.equal(resolveIncidentListStatusFilter("ALL", true), undefined);
});
