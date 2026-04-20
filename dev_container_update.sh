#!/bin/bash

if [ -z "$1" ]; then
    echo "Error: Port number is required."
    echo "Usage: $0 <PORT>"
    echo "Example: $0 9001"
    exit 1
fi

TARGET_PORT="$1"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
DEV_CONTAINER="${CONTAINER_NAME:-tm-${BRANCH}}"
DEV_IMAGE="${IMAGE_NAME:-tm:${BRANCH}}"
DATA_VOLUME="${VOLUME_NAME:-tm_data_${BRANCH}}"

echo "Updating container $DEV_CONTAINER..."
echo "Using image $DEV_IMAGE, port $TARGET_PORT, and volume $DATA_VOLUME."

docker stop "$DEV_CONTAINER" 2>/dev/null || true
docker rm "$DEV_CONTAINER" 2>/dev/null || true
docker build -t "$DEV_IMAGE" .

docker run --restart always -d \
  --name "$DEV_CONTAINER" \
  -p "$TARGET_PORT:$TARGET_PORT" \
  -v "$DATA_VOLUME:/app/tm-instance" \
  -v "$(pwd)/service-account.json:/app/service-account.json:ro" \
  --env-file .env \
  --env FLASK_PORT="$TARGET_PORT" \
  "$DEV_IMAGE"

echo "Container $DEV_CONTAINER is now running on port $TARGET_PORT."
echo ""