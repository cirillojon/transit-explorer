#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Gunicorn entrypoint for the Transit Explorer backend.
#
# Knobs (override via env):
#   FLASK_PORT          required — port to bind
#   WEB_CONCURRENCY     worker count (default: 2)  ← keep low; --preload
#                       lets workers share the in-memory transit data
#   GUNICORN_TIMEOUT    request timeout in seconds (default: 30)
#   LOG_LEVEL           gunicorn log level (default: info)
#   SKIP_DATA_LOAD=1    skip both the boot-time foreground preload AND
#                       the in-process background loader started by
#                       create_app(). Alias: SKIP_STARTUP_DATA_TASKS=1.
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
GUNICORN_TIMEOUT=${GUNICORN_TIMEOUT:-30}
KEEP_ALIVE=${KEEP_ALIVE:-5}
MAX_REQUESTS=${MAX_REQUESTS:-1000}
MAX_REQUESTS_JITTER=${MAX_REQUESTS_JITTER:-50}
LOG_LEVEL=${LOG_LEVEL:-info}
BIND_ADDR="0.0.0.0:${FLASK_PORT}"
APP_MODULE="app:create_app()"

# ─── Run database migrations ──────────────────────────────────
if [ "${SKIP_DB_UPGRADE:-0}" != "1" ]; then
    echo "Running database migrations..."

    # Self-heal for legacy DBs that were created before Alembic was
    # introduced: if the schema's already there but `alembic_version`
    # isn't, stamp the baseline so `db upgrade` only applies *new*
    # migrations instead of trying to re-CREATE existing tables.
    BASELINE_REV="f838d5f10e83"
    NEEDS_STAMP=$(FLASK_APP=app.py python3 - <<'PY'
import os, sys
try:
    from app import create_app, db
    from sqlalchemy import inspect
    app = create_app()
    with app.app_context():
        insp = inspect(db.engine)
        tables = set(insp.get_table_names())
        if "user_segments" in tables and "alembic_version" not in tables:
            print("yes")
        else:
            print("no")
except Exception as e:
    print(f"err:{e}", file=sys.stderr)
    print("no")
PY
)
    if [ "$NEEDS_STAMP" = "yes" ]; then
        echo "  detected legacy DB without alembic_version — stamping baseline ($BASELINE_REV)"
        FLASK_APP=app.py flask db stamp "$BASELINE_REV" || {
            echo "  WARNING: db stamp failed — subsequent upgrade will likely error" >&2
        }
    fi

    # Don't swallow real migration errors any more — let them surface
    # in logs so a missing column doesn't masquerade as "no migrations
    # to run". A non-zero exit still falls through to gunicorn so the
    # container can serve health checks while you debug.
    if ! FLASK_APP=app.py flask db upgrade; then
        echo "  WARNING: 'flask db upgrade' returned non-zero — schema may be out of date" >&2
    fi
fi

# ─── Preload transit data ─────────────────────────────────────
# Treat SKIP_DATA_LOAD and SKIP_STARTUP_DATA_TASKS as aliases.
if [ "${SKIP_DATA_LOAD:-0}" != "1" ] && [ "${SKIP_STARTUP_DATA_TASKS:-0}" != "1" ]; then
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