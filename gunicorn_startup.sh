#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Gunicorn entrypoint for the Transit Explorer backend.
#
# Knobs (override via env):
#   FLASK_PORT          required — port to bind
#   WEB_CONCURRENCY     worker count (default: 2)  ← keep low; --preload
#                       lets workers share the in-memory transit data
#   GUNICORN_TIMEOUT    request timeout in seconds (default: 120)
#   LOG_LEVEL           gunicorn log level (default: info)
#   SKIP_DATA_LOAD=1    skip the boot-time data preload
#   SKIP_DB_UPGRADE=1   skip running `flask db upgrade` at boot
# ─────────────────────────────────────────────────────────────

if [ -z "${FLASK_PORT:-}" ] || ! [[ "$FLASK_PORT" =~ ^[0-9]+$ ]]; then
    echo "Error: FLASK_PORT is not set or is not a valid port number." >&2
    exit 1
fi

# ─── Materialize Firebase service-account JSON from a secret ──
# Fly / Render / Cloud Run inject secrets as env vars, not files.
# If GOOGLE_APPLICATION_CREDENTIALS_JSON is set, write it to disk
# at the path GOOGLE_APPLICATION_CREDENTIALS points to.
if [ -n "${GOOGLE_APPLICATION_CREDENTIALS_JSON:-}" ]; then
    : "${GOOGLE_APPLICATION_CREDENTIALS:=/app/service-account.json}"
    export GOOGLE_APPLICATION_CREDENTIALS
    if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
        echo "$GOOGLE_APPLICATION_CREDENTIALS_JSON" > "$GOOGLE_APPLICATION_CREDENTIALS"
        chmod 600 "$GOOGLE_APPLICATION_CREDENTIALS" || true
        echo "Wrote Firebase credentials to $GOOGLE_APPLICATION_CREDENTIALS"
    fi
fi

WEB_CONCURRENCY=${WEB_CONCURRENCY:-2}
GUNICORN_TIMEOUT=${GUNICORN_TIMEOUT:-120}
KEEP_ALIVE=${KEEP_ALIVE:-5}
MAX_REQUESTS=${MAX_REQUESTS:-1000}
MAX_REQUESTS_JITTER=${MAX_REQUESTS_JITTER:-50}
LOG_LEVEL=${LOG_LEVEL:-info}
BIND_ADDR="0.0.0.0:${FLASK_PORT}"
APP_MODULE="app:create_app()"

# ─── Run database migrations ──────────────────────────────────
if [ "${SKIP_DB_UPGRADE:-0}" != "1" ]; then
    echo "Running database migrations..."
    if ! FLASK_APP=app.py flask db upgrade 2>/dev/null; then
        echo "  (no migrations to run, or migrations not initialized — continuing)"
    fi
fi

# ─── Preload transit data ─────────────────────────────────────
if [ "${SKIP_DATA_LOAD:-0}" != "1" ]; then
    echo "Loading transit data..."
    SKIP_STARTUP_DATA_TASKS=1 python3 - <<'PY'
import logging
logging.basicConfig(level=logging.INFO)
from app import create_app
from app.data_loader import load_transit_data

app = create_app()
with app.app_context():
    load_transit_data()
print("Data load complete")
PY
fi

# ─── Boot ─────────────────────────────────────────────────────
cat <<EOF
Starting Gunicorn:
  bind                 : $BIND_ADDR
  workers              : $WEB_CONCURRENCY
  timeout              : ${GUNICORN_TIMEOUT}s
  keep-alive           : ${KEEP_ALIVE}s
  max-requests         : $MAX_REQUESTS (+/- $MAX_REQUESTS_JITTER)
  log-level            : $LOG_LEVEL
  preload              : on (workers share preloaded data via fork COW)
EOF

exec gunicorn \
    --bind "$BIND_ADDR" \
    --workers "$WEB_CONCURRENCY" \
    --timeout "$GUNICORN_TIMEOUT" \
    --keep-alive "$KEEP_ALIVE" \
    --max-requests "$MAX_REQUESTS" \
    --max-requests-jitter "$MAX_REQUESTS_JITTER" \
    --log-level "$LOG_LEVEL" \
    --access-logfile - \
    --error-logfile - \
    --forwarded-allow-ips="*" \
    --preload \
    "$APP_MODULE"