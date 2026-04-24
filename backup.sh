#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Snapshot the SQLite database from a running Transit Explorer
# container. Uses `sqlite3 .backup` for a consistent online
# snapshot, gzips it, and prunes anything older than RETAIN
# days (default: 14).
#
# Encryption (recommended for offsite copies):
#   BACKUP_PASSPHRASE=<secret> ./backup.sh
# When set, the gzip is wrapped in `openssl enc -aes-256-cbc -pbkdf2`
# and the output filename gains a `.enc` suffix. Decrypt with:
#   openssl enc -d -aes-256-cbc -pbkdf2 -in <file>.gz.enc -out <file>.gz \
#     -pass env:BACKUP_PASSPHRASE
#
# AES-CBC provides confidentiality but NOT authenticated integrity, and
# `openssl enc` has no AEAD/GCM mode in its CLI. To detect tampering of
# encrypted backups we additionally write a keyed HMAC-SHA256 sidecar
# (`<file>.hmac`) using the same passphrase. Verify before decrypting:
#   openssl dgst -sha256 -hmac "$BACKUP_PASSPHRASE" <file>.enc
# and compare against `<file>.enc.hmac`. The unkeyed `.sha256` is only
# useful for catching accidental corruption — it is NOT a tamper check.
#
# A SHA-256 manifest is always written alongside the backup so a
# corrupted snapshot is detectable on restore (compare with
# `sha256sum -c <file>.sha256`).
#
# Usage:
#   ./backup.sh                       # auto-detect tm-* container
#   CONTAINER=tm-blue ./backup.sh     # explicit
#   BACKUP_DIR=/var/backups/tm RETAIN=30 ./backup.sh
#   BACKUP_PASSPHRASE=hunter2 ./backup.sh
# ─────────────────────────────────────────────────────────────

CONTAINER="${CONTAINER:-$(docker ps --filter 'name=tm-' --format '{{.Names}}' | head -n1)}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETAIN="${RETAIN:-14}"
PASSPHRASE="${BACKUP_PASSPHRASE:-}"

if [ -z "$CONTAINER" ]; then
    echo "Error: no running container matching 'tm-*'. Set CONTAINER=<name> or start one." >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
TMP_IN_CTR="/tmp/tm-backup-${TS}.db"
PLAIN="$BACKUP_DIR/data-${TS}.db"
OUT="${PLAIN}.gz"

echo "Container : $CONTAINER"
echo "Output    : $OUT$([ -n "$PASSPHRASE" ] && echo .enc)"

# Take a consistent online snapshot inside the container, then copy out.
if docker exec "$CONTAINER" sh -c "command -v sqlite3 >/dev/null 2>&1"; then
    docker exec "$CONTAINER" sqlite3 /app/tm-instance/data.db ".backup '$TMP_IN_CTR'"
else
    # Fallback: file-level copy. SQLite WAL mode makes this generally safe.
    docker exec "$CONTAINER" cp /app/tm-instance/data.db "$TMP_IN_CTR"
fi

docker cp "$CONTAINER:$TMP_IN_CTR" "$PLAIN"
docker exec "$CONTAINER" rm -f "$TMP_IN_CTR" || true
gzip -f "$PLAIN"

# Optional symmetric encryption. PBKDF2 + AES-256-CBC is the openssl
# default since 1.1.1 — confidentiality only, no AEAD. To detect
# tampering we also emit a keyed HMAC-SHA256 sidecar below.
if [ -n "$PASSPHRASE" ]; then
    openssl enc -aes-256-cbc -pbkdf2 -salt \
        -in "$OUT" -out "${OUT}.enc" \
        -pass env:BACKUP_PASSPHRASE
    rm -f "$OUT"
    OUT="${OUT}.enc"
    # Keyed MAC over the ciphertext. This is what should be checked
    # before decrypting; the unkeyed sha256 only catches bit rot.
    openssl dgst -sha256 -hmac "$PASSPHRASE" "$OUT" \
        | awk '{print $2}' > "${OUT}.hmac"
fi

# Always emit a sha256 sidecar so corruption is detectable on restore.
( cd "$(dirname "$OUT")" && sha256sum "$(basename "$OUT")" > "$(basename "$OUT").sha256" )

echo "Wrote $(du -h "$OUT" | cut -f1) -> $OUT"
echo "SHA256: $(cat "${OUT}.sha256")"
if [ -n "$PASSPHRASE" ]; then
    echo "HMAC  : $(cat "${OUT}.hmac")"
fi

# Prune old backups (and their sidecars). Keep the manifests in lockstep
# with the data files so we don't leave orphan .sha256/.hmac entries
# behind.
if [ "$RETAIN" -gt 0 ]; then
    find "$BACKUP_DIR" \
        \( -name 'data-*.db.gz' -o -name 'data-*.db.gz.enc' \
           -o -name 'data-*.db.gz.sha256' -o -name 'data-*.db.gz.enc.sha256' \
           -o -name 'data-*.db.gz.enc.hmac' \) \
        -type f -mtime "+$RETAIN" -print -delete || true
fi