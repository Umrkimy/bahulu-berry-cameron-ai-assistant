#!/bin/sh
# Restore rehearsal: proves a backup can be read and restored.
#
# Usage: restore-test.sh /backups/bahulu-...tar.age
# Needs AGE_IDENTITY_FILE (the private key, mounted read-only; never stored
# with the backups). Restores into a throwaway database on the same server,
# checks the Alembic revision, every table's row count and the media file
# count against the backup's manifest, then always drops the throwaway
# database. The working database is never touched.
set -eu

backup="${1:?Usage: restore-test.sh <backup .tar.age file>}"
: "${POSTGRES_USER:?Set POSTGRES_USER}"
: "${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD}"
AGE_IDENTITY_FILE="${AGE_IDENTITY_FILE:-/run/secrets/age-identity}"
[ -r "$AGE_IDENTITY_FILE" ] || { echo "Cannot read the age identity file $AGE_IDENTITY_FILE." >&2; exit 2; }
[ -r "$backup" ] || { echo "Cannot read backup $backup." >&2; exit 2; }

export PGHOST="${PGHOST:-db}" PGUSER="$POSTGRES_USER" PGPASSWORD="$POSTGRES_PASSWORD"
WORK_DIR="${WORK_DIR:-/work}"
stage="$WORK_DIR/restore-$$"
restore_db="bahulu_restore_$(date +%Y%m%d%H%M%S)_$$"
created=0

cleanup() {
    status=$?
    if [ "$created" = "1" ]; then
        psql --no-psqlrc -q -d postgres -c "DROP DATABASE IF EXISTS $restore_db" >/dev/null ||
            echo "Could not drop $restore_db; remove it manually." >&2
    fi
    rm -rf "$stage"
    if [ "$status" -ne 0 ]; then
        echo "Restore rehearsal FAILED (exit $status)." >&2
    fi
    exit "$status"
}
trap cleanup EXIT INT TERM

umask 077
mkdir -p "$stage"
age --decrypt --identity "$AGE_IDENTITY_FILE" --output "$stage/backup.tar" "$backup"
tar -C "$stage" -xf "$stage/backup.tar"
rm -f "$stage/backup.tar"
for part in manifest.txt db.dump media.tar; do
    [ -s "$stage/$part" ] || { echo "Backup is missing $part." >&2; exit 1; }
done
grep -q '^format bahulu-backup-1$' "$stage/manifest.txt" || { echo "Unknown backup format." >&2; exit 1; }

createdb --maintenance-db=postgres "$restore_db"
created=1
pg_restore --exit-on-error --no-owner --no-privileges --dbname="$restore_db" "$stage/db.dump"

failures=0
expected_revision="$(grep '^revision ' "$stage/manifest.txt" | cut -d' ' -f2)"
actual_revision="$(psql --no-psqlrc -At -d "$restore_db" -c 'SELECT version_num FROM alembic_version')"
if [ "$expected_revision" = "$actual_revision" ]; then
    echo "revision ok: $actual_revision"
else
    echo "revision MISMATCH: backup $expected_revision, restored $actual_revision" >&2
    failures=$((failures + 1))
fi

tables=0
rows=0
while read -r _ table expected; do
    actual="$(psql --no-psqlrc -At -d "$restore_db" -c "SELECT count(*) FROM public.$table")"
    if [ "$actual" != "$expected" ]; then
        echo "row count MISMATCH in $table: backup $expected, restored $actual" >&2
        failures=$((failures + 1))
    fi
    tables=$((tables + 1))
    rows=$((rows + actual))
done <<EOF
$(grep '^row_count ' "$stage/manifest.txt")
EOF
echo "row counts checked: $tables tables, $rows rows"

expected_media="$(grep '^media_files ' "$stage/manifest.txt" | cut -d' ' -f2)"
actual_media="$(tar -tvf "$stage/media.tar" | grep -c '^-' || true)"
if [ "$expected_media" = "$actual_media" ]; then
    echo "media ok: $actual_media files"
else
    echo "media MISMATCH: backup $expected_media files, archive has $actual_media" >&2
    failures=$((failures + 1))
fi

if [ "$failures" -ne 0 ]; then
    echo "Restore rehearsal found $failures problem(s) in $(basename "$backup")." >&2
    exit 1
fi
echo "Restore rehearsal passed for $(basename "$backup") using throwaway database $restore_db (now dropped)."
