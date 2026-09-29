#!/bin/sh
# Encrypted backup of the database and product photos.
#
# Writes one file per run: /backups/bahulu-YYYYmmdd-HHMMSS-<kind>.tar.age,
# encrypted to AGE_RECIPIENT. Inside: db.dump (pg_dump custom format),
# media.tar (the product_media volume) and manifest.txt (revision, row counts
# and media file count, taken from the same snapshot as the dump) which
# restore-test.sh checks against. Nothing unencrypted is written outside /work.
#
# Keeps the newest 7 daily and 4 weekly backups (weekly = Sunday, KL time).
set -eu

: "${POSTGRES_DB:?Set POSTGRES_DB}"
: "${POSTGRES_USER:?Set POSTGRES_USER}"
: "${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD}"
: "${AGE_RECIPIENT:?Set AGE_RECIPIENT to the age public key (age1...) that backups are encrypted to}"

export PGHOST="${PGHOST:-db}" PGUSER="$POSTGRES_USER" PGDATABASE="$POSTGRES_DB" PGPASSWORD="$POSTGRES_PASSWORD"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
MEDIA_DIR="${MEDIA_DIR:-/media/products}"
WORK_DIR="${WORK_DIR:-/work}"
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"

stamp="$(date +%Y%m%d-%H%M%S)"
if [ -n "${BACKUP_KIND:-}" ]; then
    kind="$BACKUP_KIND"
elif [ "$(date +%u)" = "7" ]; then
    kind="weekly"
else
    kind="daily"
fi
case "$kind" in daily|weekly) ;; *) echo "BACKUP_KIND must be daily or weekly." >&2; exit 2 ;; esac

stage="$WORK_DIR/backup-$stamp"
target="$BACKUP_DIR/bahulu-$stamp-$kind.tar.age"
session_in="$stage/session.in"
session_out="$stage/session.out"
session_pid=""

cleanup() {
    status=$?
    if [ -n "$session_pid" ]; then
        exec 3>&- 2>/dev/null || true
        kill "$session_pid" 2>/dev/null || true
    fi
    rm -rf "$stage" "$target.partial"
    if [ "$status" -ne 0 ]; then
        echo "Backup FAILED (exit $status). No new backup was written." >&2
    fi
    exit "$status"
}
trap cleanup EXIT INT TERM

umask 077
mkdir -p "$stage" "$BACKUP_DIR"

# Wait for a marker line written by the open psql session.
wait_for() {
    tries=0
    until grep -q "^$1" "$session_out" 2>/dev/null; do
        tries=$((tries + 1))
        if [ "$tries" -gt 600 ]; then
            echo "Timed out waiting for the database session." >&2
            exit 1
        fi
        if ! kill -0 "$session_pid" 2>/dev/null; then
            echo "The database session ended unexpectedly." >&2
            cat "$session_out" >&2 || true
            exit 1
        fi
        sleep 0.1
    done
}

# Table list (fixed before the snapshot; schema changes only happen in releases).
tables="$(psql --no-psqlrc -At -v ON_ERROR_STOP=1 -c \
    "SELECT quote_ident(tablename) FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")"
count_query="SELECT 'row_count ' || t.name || ' ' || t.n FROM ("
separator=""
for table in $tables; do
    count_query="$count_query$separator SELECT '$table' AS name, count(*) AS n FROM public.$table"
    separator=" UNION ALL"
done
count_query="$count_query) t ORDER BY t.name;"

# Hold one repeatable-read transaction open and export its snapshot, so the
# manifest counts and pg_dump see exactly the same data.
mkfifo "$session_in"
psql --no-psqlrc -At -v ON_ERROR_STOP=1 <"$session_in" >"$session_out" 2>&1 &
session_pid=$!
exec 3>"$session_in"
echo "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;" >&3
echo "SELECT 'snapshot ' || pg_export_snapshot();" >&3
wait_for "snapshot "
snapshot="$(grep '^snapshot ' "$session_out" | cut -d' ' -f2)"

{
    echo "format bahulu-backup-1"
    echo "created_at $(date -Iseconds)"
    echo "kind $kind"
} >"$stage/manifest.txt"

echo "SELECT 'revision ' || version_num FROM alembic_version;" >&3
echo "$count_query" >&3
echo "SELECT 'counts_done';" >&3
wait_for "counts_done"
grep -E '^(revision|row_count) ' "$session_out" >>"$stage/manifest.txt"

pg_dump --snapshot="$snapshot" --format=custom --compress=9 --no-owner --no-privileges \
    --file="$stage/db.dump"

echo "COMMIT;" >&3
exec 3>&-
wait "$session_pid"
session_pid=""

if [ -d "$MEDIA_DIR" ]; then
    tar -C "$MEDIA_DIR" -cf "$stage/media.tar" .
    media_files="$(find "$MEDIA_DIR" -type f | wc -l | tr -d ' ')"
else
    echo "Media directory $MEDIA_DIR not found." >&2
    exit 1
fi
echo "media_files $media_files" >>"$stage/manifest.txt"

grep -q '^revision ' "$stage/manifest.txt" || { echo "Could not read the Alembic revision." >&2; exit 1; }

tar -C "$stage" -cf - manifest.txt db.dump media.tar | age --encrypt --recipient "$AGE_RECIPIENT" --output "$target.partial"
mv "$target.partial" "$target"

# Retention: only this script's own encrypted files are ever deleted.
prune() {
    # shellcheck disable=SC2012
    ls -1 "$BACKUP_DIR" | grep -E "^bahulu-[0-9]{8}-[0-9]{6}-$1\.tar\.age$" | sort -r | tail -n +"$(($2 + 1))" |
        while read -r old; do
            rm -f "$BACKUP_DIR/$old"
            echo "Removed old $1 backup $old"
        done
}
prune daily "$KEEP_DAILY"
prune weekly "$KEEP_WEEKLY"

tables_counted="$(grep -c '^row_count ' "$stage/manifest.txt")"
echo "Backup OK: $(basename "$target") ($(du -h "$target" | cut -f1), $tables_counted tables, $media_files media files, $(grep '^revision ' "$stage/manifest.txt"))"
