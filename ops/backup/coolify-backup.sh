#!/bin/bash
# Host wrapper for Coolify, which does not build or start profile services.
# Installed as /usr/local/bin/bahulu-backup (root only, chmod 700).
#   bahulu-backup                         nightly backup (cron)
#   bahulu-backup restore-test <file>     rehearsal; key in /dev/shm first
set -euo pipefail
APP=REPLACE_WITH_COOLIFY_APP_ID
AGE_RECIPIENT='REPLACE_WITH_AGE_PUBLIC_KEY'
ENV_FILE=/data/coolify/applications/$APP/.env
SOURCE_DIR=/opt/bahulu-backup
BACKUP_DIR=/srv/bahulu-backups
KEY_FILE=/dev/shm/bahulu-age-key.txt

get() { sed -n "s/^$1=//p" "$ENV_FILE" | head -n1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"; }
export POSTGRES_DB="$(get POSTGRES_DB)" POSTGRES_USER="$(get POSTGRES_USER)" POSTGRES_PASSWORD="$(get POSTGRES_PASSWORD)" AGE_RECIPIENT

TAG="$(docker image ls "${APP}_backup" --format '{{.Tag}}' | head -n1)"
if [ -z "$TAG" ]; then
  docker build -q -t "${APP}_backup:manual" "$SOURCE_DIR" >/dev/null
  TAG=manual
fi

run() {
  docker run --rm --network "$APP" \
    --security-opt no-new-privileges:true \
    -e POSTGRES_DB -e POSTGRES_USER -e POSTGRES_PASSWORD -e AGE_RECIPIENT -e BACKUP_KIND \
    -v "${APP}_product-media:/media/products:ro" \
    -v "$BACKUP_DIR:/backups" \
    --tmpfs /work \
    "$@"
}

if [ "${1:-}" = "restore-test" ]; then
  [ -r "$KEY_FILE" ] || { echo "Put the private key in $KEY_FILE first" >&2; exit 1; }
  run -v "$KEY_FILE:/run/secrets/age-identity:ro" --entrypoint restore-test.sh \
    "${APP}_backup:$TAG" "/backups/${2:?Give the backup file name}"
else
  run "${APP}_backup:$TAG"
fi
