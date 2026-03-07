#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${PROJECT_DIR}"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
FORCE_UPDATE="${FORCE_UPDATE:-0}"

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  cat <<'EOF'
Usage:
  ./deploy-update.sh

Optional env vars:
  COMPOSE_FILE=xxx.yml   # default: docker-compose.prod.yml
  FORCE_UPDATE=1         # allow update even if git working tree is dirty
EOF
  exit 0
fi

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  fail "Compose file not found: ${COMPOSE_FILE}"
fi

if ! command -v git >/dev/null 2>&1; then
  fail "git is required but not installed."
fi

if ! command -v docker >/dev/null 2>&1; then
  fail "docker is required but not installed."
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  fail "Neither 'docker compose' nor 'docker-compose' is available."
fi

if [[ "${FORCE_UPDATE}" != "1" ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    fail "Working tree has uncommitted changes. Commit/stash first, or run with FORCE_UPDATE=1."
  fi
fi

log "Fetching latest code..."
git fetch --all --prune

if git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
  log "Pulling latest commit (fast-forward only)..."
  git pull --ff-only
else
  log "No upstream branch configured; skipping git pull."
fi

log "Pulling base images (if any updates)..."
"${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" pull db || true

log "Rebuilding app image..."
"${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" build app

log "Restarting services..."
"${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" up -d db app

log "Service status:"
"${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" ps

BASE_PATH="/status"
if [[ -f ".env.prod" ]]; then
  ENV_BASE_PATH="$(awk -F= '/^NEXT_PUBLIC_BASE_PATH=/{print $2; exit}' .env.prod | tr -d '"' | tr -d "'")"
  if [[ -n "${ENV_BASE_PATH}" ]]; then
    BASE_PATH="${ENV_BASE_PATH}"
  fi
fi

if [[ "${BASE_PATH}" != /* ]]; then
  BASE_PATH="/${BASE_PATH}"
fi

HEALTH_URL="http://127.0.0.1:3000${BASE_PATH}/login"
if [[ "${BASE_PATH}" == "/" ]]; then
  HEALTH_URL="http://127.0.0.1:3000/login"
fi

log "Waiting for app to become healthy at ${HEALTH_URL} ..."
for _ in $(seq 1 30); do
  if curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
    log "Update complete. App is healthy."
    exit 0
  fi
  sleep 2
done

log "App did not become healthy in time. Last app logs:"
"${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" logs --tail=120 app || true
fail "Health check failed."
