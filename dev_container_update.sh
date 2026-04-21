#!/bin/bash
set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Error: port number is required."
    echo "Usage: $0 <PORT>"
    echo "Example: $0 9001"
    exit 1
fi

TARGET_PORT="$1"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
DEV_CONTAINER="${CONTAINER_NAME:-tm-${BRANCH}}"
DEV_IMAGE="${IMAGE_NAME:-tm:${BRANCH}}"
DATA_VOLUME="${VOLUME_NAME:-tm_data_${BRANCH}}"
SERVICE_ACCOUNT_PATH="${SERVICE_ACCOUNT_PATH:-$(pwd)/service-account.json}"

echo "Updating local backend container ${DEV_CONTAINER}..."
echo "Using image ${DEV_IMAGE}, port ${TARGET_PORT}, and volume ${DATA_VOLUME}."

docker stop "$DEV_CONTAINER" 2>/dev/null || true
docker rm "$DEV_CONTAINER" 2>/dev/null || true
docker build -t "$DEV_IMAGE" .

DOCKER_ARGS=(
  --restart unless-stopped
  -d
  --name "$DEV_CONTAINER"
  -p "$TARGET_PORT:$TARGET_PORT"
  -v "$DATA_VOLUME:/app/tm-instance"
  --env-file .env
  --env "FLASK_PORT=$TARGET_PORT"
)

if [ -f "$SERVICE_ACCOUNT_PATH" ]; then
    DOCKER_ARGS+=( -v "$SERVICE_ACCOUNT_PATH:/app/service-account.json:ro" )
else
    echo "Warning: no service-account.json found at $SERVICE_ACCOUNT_PATH"
    echo "         Continuing without the mounted Firebase Admin credentials file."
fi

docker run "${DOCKER_ARGS[@]}" "$DEV_IMAGE"

echo "Container $DEV_CONTAINER is now running on http://localhost:$TARGET_PORT"