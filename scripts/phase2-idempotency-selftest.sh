#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PORT="${PORT:-3180}"
BASE_URL="${BASE_URL:-http://127.0.0.1:${PORT}}"
PG_PORT="${PG_PORT:-55432}"
TEST_DB_NAME="n8n_status_phase2_test"
ENV_FILE="${ROOT_DIR}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Create env config before running Phase 2 self-test." >&2
  exit 1
fi

for bin in curl node npm initdb pg_ctl pg_isready createdb; do
  if ! command -v "${bin}" >/dev/null 2>&1; then
    echo "Required command not found: ${bin}" >&2
    exit 1
  fi
done

INGEST_TOKEN="$(awk -F= '/^INGEST_TOKEN=/{print substr($0,index($0,$2)); exit}' "${ENV_FILE}")"
if [[ -z "${INGEST_TOKEN}" ]]; then
  echo "INGEST_TOKEN is missing in .env" >&2
  exit 1
fi

if [[ "${INGEST_TOKEN}" == "replace_with_a_long_random_token" ]]; then
  echo "INGEST_TOKEN in .env is still placeholder value" >&2
  exit 1
fi

PGDATA_DIR="$(mktemp -d -t phase2-pgdata.XXXXXX)"
PG_LOG="$(mktemp -t phase2-pg-log.XXXXXX)"
SERVER_LOG="$(mktemp -t phase2-server-log.XXXXXX)"
RESP1_FILE="$(mktemp -t phase2-resp1.XXXXXX)"
RESP2_FILE="$(mktemp -t phase2-resp2.XXXXXX)"
PAYLOAD1_FILE="$(mktemp -t phase2-payload1.XXXXXX)"
PAYLOAD2_FILE="$(mktemp -t phase2-payload2.XXXXXX)"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" >/dev/null 2>&1 || true
  fi

  if [[ -n "${PG_STARTED:-}" ]]; then
    pg_ctl -D "${PGDATA_DIR}" stop -m fast >/dev/null 2>&1 || true
  fi

  rm -rf "${PGDATA_DIR}"
  rm -f "${PG_LOG}" "${SERVER_LOG}" "${RESP1_FILE}" "${RESP2_FILE}" "${PAYLOAD1_FILE}" "${PAYLOAD2_FILE}"
}
trap cleanup EXIT

echo "[phase2] Initializing temporary PostgreSQL cluster"
initdb -D "${PGDATA_DIR}" --username=postgres --auth=trust >/dev/null
pg_ctl -D "${PGDATA_DIR}" -o "-p ${PG_PORT}" -l "${PG_LOG}" start >/dev/null
PG_STARTED=1

for _ in $(seq 1 30); do
  if pg_isready -h 127.0.0.1 -p "${PG_PORT}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! pg_isready -h 127.0.0.1 -p "${PG_PORT}" >/dev/null 2>&1; then
  echo "Temporary PostgreSQL did not become ready" >&2
  cat "${PG_LOG}" >&2
  exit 1
fi

createdb -h 127.0.0.1 -p "${PG_PORT}" -U postgres "${TEST_DB_NAME}"
DATABASE_URL="postgresql://postgres@127.0.0.1:${PG_PORT}/${TEST_DB_NAME}?schema=public"

echo "[phase2] Applying migrations to temporary database"
cd "${ROOT_DIR}"
DATABASE_URL="${DATABASE_URL}" npm run db:migrate >/dev/null

echo "[phase2] Starting app server for ingest verification"
DATABASE_URL="${DATABASE_URL}" PORT="${PORT}" npm run start >"${SERVER_LOG}" 2>&1 &
SERVER_PID="$!"

READY=0
for _ in $(seq 1 60); do
  if curl -fsS "${BASE_URL}/login" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [[ "${READY}" -ne 1 ]]; then
  echo "Server did not become ready at ${BASE_URL}. Server logs:" >&2
  cat "${SERVER_LOG}" >&2
  exit 1
fi

RUN_ID="$(date -u +%Y%m%d%H%M%S)"
SOURCE_INSTANCE="phase2-selftest"
WORKFLOW_ID="wf-phase2"
WORKFLOW_NAME="Phase2-SelfTest"
EXECUTION_ID="phase2-${RUN_ID}"
SUMMARY_1="phase2-selftest-summary-1-${RUN_ID}"
SUMMARY_2="phase2-selftest-summary-2-${RUN_ID}"
N8N_BASE_URL="https://n8n.example.com"
WORKFLOW_URL="${N8N_BASE_URL}/workflow/${WORKFLOW_ID}"
EXECUTION_URL="${N8N_BASE_URL}/execution/${EXECUTION_ID}"
FAILED_AT="$(date -u +%Y-%m-%dT%H:%M)"

cat >"${PAYLOAD1_FILE}" <<JSON
{
  "sourceInstance": "${SOURCE_INSTANCE}",
  "workflowName": "${WORKFLOW_NAME}",
  "workflowURL": "${WORKFLOW_URL}",
  "executionID": "${EXECUTION_ID}",
  "executionURL": "${EXECUTION_URL}",
  "summary": "${SUMMARY_1}",
  "description": "description-1-${RUN_ID}",
  "time": "${FAILED_AT}"
}
JSON

cat >"${PAYLOAD2_FILE}" <<JSON
{
  "sourceInstance": "${SOURCE_INSTANCE}",
  "workflowName": "${WORKFLOW_NAME}",
  "workflowURL": "${WORKFLOW_URL}",
  "executionID": "${EXECUTION_ID}",
  "executionURL": "${EXECUTION_URL}",
  "summary": "${SUMMARY_2}",
  "description": "description-2-${RUN_ID}",
  "time": "${FAILED_AT}"
}
JSON

STATUS_1="$(curl -sS -o "${RESP1_FILE}" -w "%{http_code}" \
  -X POST "${BASE_URL}/api/v1/ingest/failure" \
  -H "Authorization: Bearer ${INGEST_TOKEN}" \
  -H "Content-Type: application/json" \
  --data @"${PAYLOAD1_FILE}")"

if [[ "${STATUS_1}" != "201" ]]; then
  echo "First ingest expected HTTP 201, got ${STATUS_1}. Response:" >&2
  cat "${RESP1_FILE}" >&2
  echo "Server logs:" >&2
  cat "${SERVER_LOG}" >&2
  exit 1
fi

INCIDENT_ID_1="$(node -e '
const fs = require("node:fs");
const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (body.success !== true) throw new Error("first ingest success should be true");
if (body.deduplicated !== false) throw new Error("first ingest deduplicated should be false");
if (!body.incidentId) throw new Error("first ingest missing incidentId");
process.stdout.write(body.incidentId);
' "${RESP1_FILE}")"

STATUS_2="$(curl -sS -o "${RESP2_FILE}" -w "%{http_code}" \
  -X POST "${BASE_URL}/api/v1/ingest/failure" \
  -H "Authorization: Bearer ${INGEST_TOKEN}" \
  -H "Content-Type: application/json" \
  --data @"${PAYLOAD2_FILE}")"

if [[ "${STATUS_2}" != "200" ]]; then
  echo "Second ingest expected HTTP 200, got ${STATUS_2}. Response:" >&2
  cat "${RESP2_FILE}" >&2
  echo "Server logs:" >&2
  cat "${SERVER_LOG}" >&2
  exit 1
fi

INCIDENT_ID_2="$(node -e '
const fs = require("node:fs");
const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (body.success !== true) throw new Error("second ingest success should be true");
if (body.deduplicated !== true) throw new Error("second ingest deduplicated should be true");
if (!body.incidentId) throw new Error("second ingest missing incidentId");
process.stdout.write(body.incidentId);
' "${RESP2_FILE}")"

if [[ "${INCIDENT_ID_1}" != "${INCIDENT_ID_2}" ]]; then
  echo "Idempotency check failed: incidentId changed between duplicate ingests" >&2
  echo "first=${INCIDENT_ID_1}" >&2
  echo "second=${INCIDENT_ID_2}" >&2
  exit 1
fi

node "${SCRIPT_DIR}/phase2-idempotency-db-check.cjs" \
  "${DATABASE_URL}" \
  "${SOURCE_INSTANCE}" \
  "${EXECUTION_ID}" \
  "${SUMMARY_2}" \
  "${INCIDENT_ID_2}"

echo "Phase 2 self-test passed: duplicate ingest is idempotent and update behavior is verified."
