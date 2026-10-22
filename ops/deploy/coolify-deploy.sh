#!/bin/bash
# Back up, then ask Coolify to deploy and wait for the result.
# Installed as /usr/local/bin/bahulu-deploy (root only, chmod 700).
# Settings in /etc/bahulu-deploy.env (root only, chmod 600):
#   COOLIFY_TOKEN=...   API token with the deploy and read permissions
#   APP_UUID=...        the application's UUID in Coolify
#   COOLIFY_URL=http://localhost:8000   (optional)
set -euo pipefail
CONFIG=/etc/bahulu-deploy.env
[ -r "$CONFIG" ] || { echo "Missing $CONFIG" >&2; exit 1; }
# shellcheck disable=SC1090
. "$CONFIG"
COOLIFY_URL="${COOLIFY_URL:-http://localhost:8000}"
: "${COOLIFY_TOKEN:?Set COOLIFY_TOKEN in $CONFIG}" "${APP_UUID:?Set APP_UUID in $CONFIG}"

api() {
  # The token goes through stdin so it never shows up in the process list.
  printf 'header = "Authorization: Bearer %s"\nheader = "Accept: application/json"\n' "$COOLIFY_TOKEN" \
    | curl -fsS --max-time 30 -K - "$COOLIFY_URL/api/v1/$1"
}
field() { sed -n "s/.*\"$1\":\"\([^\"]*\)\".*/\1/p" | head -n1; }

echo "Backing up the database and photos..."
/usr/local/bin/bahulu-backup
echo "Backup saved: $(ls -t /srv/bahulu-backups | head -n1)"

echo "Starting the deploy..."
deployment="$(api "deploy?uuid=$APP_UUID&force=false" | field deployment_uuid)"
[ -n "$deployment" ] || { echo "Coolify did not start a deploy." >&2; exit 1; }

for _ in $(seq 1 120); do
  status="$(api "deployments/$deployment" | field status)"
  case "$status" in
    finished) echo "Deploy finished."; exit 0 ;;
    failed|cancelled*) echo "Deploy $status. Check the deployment log in Coolify." >&2; exit 1 ;;
  esac
  sleep 10
done
echo "Still deploying after 20 minutes. Check Coolify." >&2
exit 1
