import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { isDatabaseUnavailableError } from "../lib/database-errors.ts";

test("recognizes Prisma P1001 errors as database unavailable", () => {
  assert.equal(isDatabaseUnavailableError({ code: "P1001" }), true);
});

test("recognizes Prisma initialization errors that report database reachability", () => {
  assert.equal(
    isDatabaseUnavailableError({
      name: "PrismaClientInitializationError",
      message: "Can't reach database server at `db.example:5432`"
    }),
    true
  );
});

test("ignores non-connectivity errors", () => {
  assert.equal(isDatabaseUnavailableError({ code: "P2002" }), false);
  assert.equal(isDatabaseUnavailableError(new Error("boom")), false);
  assert.equal(isDatabaseUnavailableError(null), false);
});

test("startup script continues booting the app when db:migrate fails", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-status-startup-"));
  const logPath = path.join(tempDir, "npm.log");
  const npmPath = path.join(tempDir, "npm");

  fs.writeFileSync(
    npmPath,
    `#!/bin/sh
echo "$@" >> "$NPM_LOG_PATH"
if [ "$1" = "run" ] && [ "$2" = "db:migrate" ]; then
  exit 1
fi
if [ "$1" = "run" ] && [ "$2" = "start" ]; then
  exit 0
fi
exit 99
`,
    { mode: 0o755 }
  );

  const result = spawnSync("sh", [path.resolve("scripts/start-prod.sh")], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PATH: `${tempDir}:${process.env.PATH}`,
      NPM_LOG_PATH: logPath
    },
    encoding: "utf8"
  });

  const logLines = fs
    .readFileSync(logPath, "utf8")
    .trim()
    .split(/\r?\n/);
  fs.rmSync(tempDir, { recursive: true, force: true });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stderr + result.stdout, /db:migrate failed/i);
  assert.deepEqual(logLines, ["run db:migrate", "run start -- -H 0.0.0.0 -p 3000"]);
});

test("startup script returns the start command exit code", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-status-startup-"));
  const logPath = path.join(tempDir, "npm.log");
  const npmPath = path.join(tempDir, "npm");

  fs.writeFileSync(
    npmPath,
    `#!/bin/sh
echo "$@" >> "$NPM_LOG_PATH"
if [ "$1" = "run" ] && [ "$2" = "db:migrate" ]; then
  exit 0
fi
if [ "$1" = "run" ] && [ "$2" = "start" ]; then
  exit 7
fi
exit 99
`,
    { mode: 0o755 }
  );

  const result = spawnSync("sh", [path.resolve("scripts/start-prod.sh")], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PATH: `${tempDir}:${process.env.PATH}`,
      NPM_LOG_PATH: logPath
    },
    encoding: "utf8"
  });

  const logLines = fs
    .readFileSync(logPath, "utf8")
    .trim()
    .split(/\r?\n/);
  fs.rmSync(tempDir, { recursive: true, force: true });

  assert.equal(result.status, 7, result.stderr || result.stdout);
  assert.deepEqual(logLines, ["run db:migrate", "run start -- -H 0.0.0.0 -p 3000"]);
});
