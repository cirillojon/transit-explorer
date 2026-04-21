#!/bin/bash
# Backwards-compat shim. The canonical entrypoint is now bin/start.
# Kept so external scripts / older Dockerfiles continue to work; will
# be removed in the next release.
set -euo pipefail
cd "$(dirname "$0")"
exec ./bin/start prod
