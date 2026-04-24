#!/bin/bash
# DEPRECATED: this shim will be removed in the next release.
# Update any external caller (Dockerfile, systemd unit, Fly process
# definition) to invoke `bin/start prod` directly.
set -euo pipefail
echo "[gunicorn_startup.sh] DEPRECATED: forwarding to bin/start prod — " \
     "update your invocation to call bin/start directly." >&2
cd "$(dirname "$0")"
exec ./bin/start prod
