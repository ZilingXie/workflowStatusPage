#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
APP_SERVICE="${APP_SERVICE:-app}"
DB_SERVICE="${DB_SERVICE:-db}"

BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/backups}"
SKIP_BACKUP="${SKIP_BACKUP:-0}"
ROLLBACK_DB="${ROLLBACK_DB:-0}"

HEALTH_PATH="${HEALTH_PATH:-/status/login}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000${HEALTH_PATH}}"
HEALTH_RETRIES="${HEALTH_RETRIES:-20}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-3}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-5}"

LOCK_FILE="${LOCK_FILE:-/tmp/workflow-status-deploy.lock}"

PREV_REV=""
PREV_SHORT=""
NEW_SHORT=""
BACKUP_FILE=""
DEPLOY_STARTED=0

log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*"
}

warn() {
  printf '[%s] [WARN] %s\n' "$(date '+%F %T')" "$*" >&2
}

err() {
  printf '[%s] [ERROR] %s\n' "$(date '+%F %T')" "$*" >&2
}

usage() {
  cat <<USAGE
Usage: ./deploy.sh

Environment overrides:
  REMOTE=origin
  BRANCH=main
  COMPOSE_FILE=docker-compose.prod.yml
  APP_SERVICE=app
  DB_SERVICE=db
  BACKUP_DIR=./backups
  SKIP_BACKUP=0          # 1 to skip pg_dump
  ROLLBACK_DB=0          # 1 to restore DB from backup on rollback (destructive)
  HEALTH_PATH=/status/login
  HEALTH_URL=http://127.0.0.1:3000/status/login
  HEALTH_RETRIES=20
  HEALTH_INTERVAL=3
  HEALTH_TIMEOUT=5
  LOCK_FILE=/tmp/workflow-status-deploy.lock
USAGE
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    err "Missing required command: $1"
    exit 1
  }
}

get_db_container_id() {
  docker compose -f "$COMPOSE_FILE" ps -q "$DB_SERVICE"
}

ensure_db_up() {
  docker compose -f "$COMPOSE_FILE" up -d "$DB_SERVICE" >/dev/null
}

create_backup() {
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/db_$(date +%F_%H%M%S).sql"

  local db_id
  db_id="$(get_db_container_id)"
  if [[ -z "$db_id" ]]; then
    err "Cannot find DB container for service '$DB_SERVICE'."
    return 1
  fi

  log "Creating PostgreSQL backup: $BACKUP_FILE"
  docker exec "$db_id" sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$BACKUP_FILE"
  log "Backup created successfully."
}

restore_database() {
  local backup_path="$1"

  if [[ ! -f "$backup_path" ]]; then
    err "Backup file not found: $backup_path"
    return 1
  fi

  log "Restoring database from backup: $backup_path"
  docker compose -f "$COMPOSE_FILE" stop "$APP_SERVICE" >/dev/null || true
  docker compose -f "$COMPOSE_FILE" up -d "$DB_SERVICE" >/dev/null

  local db_id
  db_id="$(get_db_container_id)"
  if [[ -z "$db_id" ]]; then
    err "Cannot find DB container for restore."
    return 1
  fi

  docker exec "$db_id" sh -lc 'psql -U "$POSTGRES_USER" "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"'
  docker exec -i "$db_id" sh -lc 'psql -U "$POSTGRES_USER" "$POSTGRES_DB" -v ON_ERROR_STOP=1' < "$backup_path"

  log "Database restore complete."
}

health_check() {
  local stage="${1:-deploy}"
  local code=""

  log "Health check ($stage): $HEALTH_URL"
  for ((i=1; i<=HEALTH_RETRIES; i++)); do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time "$HEALTH_TIMEOUT" "$HEALTH_URL" || true)"
    if [[ "$code" =~ ^(2|3)[0-9][0-9]$ ]]; then
      log "Health check passed (attempt $i/$HEALTH_RETRIES, HTTP $code)."
      return 0
    fi

    log "Health check pending (attempt $i/$HEALTH_RETRIES, HTTP ${code:-N/A})."
    sleep "$HEALTH_INTERVAL"
  done

  return 1
}

rollback() {
  local reason="$1"

  trap - ERR
  warn "Rollback triggered: $reason"

  if [[ -z "$PREV_REV" ]]; then
    err "No previous git revision captured; cannot rollback code."
    exit 1
  fi

  log "Rolling back git to $PREV_SHORT"
  git checkout "$BRANCH" >/dev/null 2>&1 || true
  git reset --hard "$PREV_REV" >/dev/null

  log "Rebuilding and restarting app service on rollback"
  docker compose -f "$COMPOSE_FILE" up -d --build "$APP_SERVICE"

  if [[ "$ROLLBACK_DB" == "1" ]]; then
    if [[ -n "$BACKUP_FILE" ]]; then
      warn "ROLLBACK_DB=1: restoring database from backup (destructive)."
      restore_database "$BACKUP_FILE"
      docker compose -f "$COMPOSE_FILE" up -d --build "$APP_SERVICE"
    else
      warn "ROLLBACK_DB=1 but no backup file captured; skipping DB restore."
    fi
  else
    warn "Database restore skipped (ROLLBACK_DB=0)."
  fi

  if health_check "rollback"; then
    warn "Rollback succeeded. Current revision: $PREV_SHORT"
  else
    err "Rollback attempted but health check still failing."
    docker compose -f "$COMPOSE_FILE" logs --tail=200 "$APP_SERVICE" || true
  fi

  exit 1
}

on_error() {
  local line_no="$1"
  local exit_code="$2"

  if [[ "$DEPLOY_STARTED" -eq 1 ]]; then
    rollback "command failed at line $line_no (exit $exit_code)"
  else
    err "Deploy failed before release switch at line $line_no (exit $exit_code)."
    exit "$exit_code"
  fi
}

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  require_cmd git
  require_cmd docker
  require_cmd curl
  require_cmd flock

  if [[ ! -f "$COMPOSE_FILE" ]]; then
    err "Compose file not found: $COMPOSE_FILE"
    exit 1
  fi

  if [[ ! -d .git ]]; then
    err "Current directory is not a git repository: $SCRIPT_DIR"
    exit 1
  fi

  if ! git diff --quiet || ! git diff --cached --quiet; then
    err "Git working tree is dirty. Commit/stash changes before deploy."
    exit 1
  fi

  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    err "Another deploy is running (lock: $LOCK_FILE)."
    exit 1
  fi

  trap 'on_error "$LINENO" "$?"' ERR

  log "Deploy started (branch: $BRANCH, remote: $REMOTE)"

  git checkout "$BRANCH" >/dev/null
  PREV_REV="$(git rev-parse HEAD)"
  PREV_SHORT="$(git rev-parse --short=12 "$PREV_REV")"
  log "Current revision: $PREV_SHORT"

  ensure_db_up

  if [[ "$SKIP_BACKUP" == "1" ]]; then
    warn "Skipping backup (SKIP_BACKUP=1)."
  else
    create_backup
  fi

  log "Fetching latest code from $REMOTE/$BRANCH"
  git fetch "$REMOTE" "$BRANCH"

  log "Pulling latest code"
  git pull --ff-only "$REMOTE" "$BRANCH"

  NEW_SHORT="$(git rev-parse --short=12 HEAD)"
  log "Target revision: $NEW_SHORT"

  DEPLOY_STARTED=1

  log "Building and restarting app service: $APP_SERVICE"
  docker compose -f "$COMPOSE_FILE" up -d --build "$APP_SERVICE"

  if ! health_check "deploy"; then
    docker compose -f "$COMPOSE_FILE" logs --tail=200 "$APP_SERVICE" || true
    rollback "health check failed after deploy"
  fi

  DEPLOY_STARTED=0
  log "Deploy succeeded. Revision: $NEW_SHORT"
  docker compose -f "$COMPOSE_FILE" ps
}

main "$@"
