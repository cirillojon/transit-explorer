#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Snapshot the SQLite database from a running Transit Explorer
# container. Uses `sqlite3 .backup` for a consistent online
# snapshot, gzips it, and prunes anything older than RETAIN
# days (default: 14).
#
# Usage:
#   ./backup.sh                       # auto-detect tm-* container
#   CONTAINER=tm-blue ./backup.sh     # explicit
#   BACKUP_DIR=/var/backups/tm RETAIN=30 ./backup.sh
# ─────────────────────────────────────────────────────────────

CONTAINER="${CONTAINER:-$(docker ps --filter 'name=tm-' --format '{{.Names}}' | head -n1)}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETAIN="${RETAIN:-14}"

if [ -z "$CONTAINER" ]; then
    echo "Error: no running container matching 'tm-*'. Set CONTAINER=<name> or start one." >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
TMP_IN_CTR="/tmp/tm-backup-${TS}.db"
OUT="$BACKUP_DIR/data-${TS}.db.gz"

echo "Container : $CONTAINER"
echo "Output    : $OUT"

# Take a consistent online snapshot inside the container, then copy out.
if docker exec "$CONTAINER" sh -c "command -v sqlite3 >/dev/null 2>&1"; then
    docker exec "$CONTAINER" sqlite3 /app/tm-instance/data.db ".backup '$TMP_IN_CTR'"
else
    # Fallback: file-level copy. SQLite WAL mode makes this generally safe.
    docker exec "$CONTAINER" cp /app/tm-instance/data.db "$TMP_IN_CTR"
fi

docker cp "$CONTAINER:$TMP_IN_CTR" "${OUT%.gz}"
docker exec "$CONTAINER" rm -f "$TMP_IN_CTR" || true
gzip -f "${OUT%.gz}"

echo "Wrote $(du -h "$OUT" | cut -f1) -> $OUT"

# Prune old backups
if [ "$RETAIN" -gt 0 ]; then
    find "$BACKUP_DIR" -name 'data-*.db.gz' -type f -mtime "+$RETAIN" -print -delete || true
fi