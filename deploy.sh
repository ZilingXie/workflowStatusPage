#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.prod}"
APP_SERVICE="${APP_SERVICE:-app}"
NO_DEPS="${NO_DEPS:-1}"

HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/status/login}"
HEALTH_RETRIES="${HEALTH_RETRIES:-20}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-3}"

usage() {
  cat <<USAGE
Usage: ./deploy.sh

Environment overrides:
  REMOTE=origin
  BRANCH=main
  COMPOSE_FILE=docker-compose.prod.yml
  ENV_FILE=.env.prod
  APP_SERVICE=app
  NO_DEPS=1
  HEALTH_URL=http://127.0.0.1:3000/status/login
  HEALTH_RETRIES=20
  HEALTH_INTERVAL=3
USAGE
}

log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*"
}

err() {
  printf '[%s] [ERROR] %s\n' "$(date '+%F %T')" "$*" >&2
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    err "Missing required command: $1"
    exit 1
  }
}

health_check() {
  local attempt code

  for attempt in $(seq 1 "$HEALTH_RETRIES"); do
    code="$(curl -sS -o /dev/null -w '%{http_code}' "$HEALTH_URL" || true)"
    if [[ "$code" =~ ^(2|3)[0-9][0-9]$ ]]; then
      log "Health check passed ($attempt/$HEALTH_RETRIES, HTTP $code): $HEALTH_URL"
      return 0
    fi

    log "Health check pending ($attempt/$HEALTH_RETRIES, HTTP ${code:-N/A})"
    sleep "$HEALTH_INTERVAL"
  done

  return 1
}

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  require_cmd git
  require_cmd docker
  require_cmd curl

  [[ -f "$COMPOSE_FILE" ]] || { err "Compose file not found: $COMPOSE_FILE"; exit 1; }
  [[ -f "$ENV_FILE" ]] || { err "Env file not found: $ENV_FILE"; exit 1; }
  [[ -d .git ]] || { err "Not a git repository: $SCRIPT_DIR"; exit 1; }

  log "Fetching latest code from $REMOTE/$BRANCH"
  git fetch "$REMOTE" "$BRANCH"

  log "Resetting local branch to $REMOTE/$BRANCH"
  git checkout "$BRANCH"
  git reset --hard "$REMOTE/$BRANCH"
  git clean -fd

  log "Current revision: $(git rev-parse --short=12 HEAD)"

  if [[ "$NO_DEPS" == "1" ]]; then
    log "Deploying app with --no-deps"
    docker compose -f "$COMPOSE_FILE" up -d --build --no-deps "$APP_SERVICE"
  else
    log "Deploying app with dependencies"
    docker compose -f "$COMPOSE_FILE" up -d --build "$APP_SERVICE"
  fi

  if ! health_check; then
    err "Health check failed: $HEALTH_URL"
    docker compose -f "$COMPOSE_FILE" ps || true
    docker compose -f "$COMPOSE_FILE" logs --tail 200 "$APP_SERVICE" || true
    exit 1
  fi

  docker compose -f "$COMPOSE_FILE" ps
  log "Deploy completed."
}

main "$@"
