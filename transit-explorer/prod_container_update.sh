#!/bin/bash

PROD_PORT=8880
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
APP_BASE="${CONTAINER_NAME:-tm-${GIT_BRANCH}}"
APP_IMAGE="${IMAGE_NAME:-tm:${GIT_BRANCH}}"
DATA_VOLUME="${VOLUME_NAME:-tm_data_${GIT_BRANCH}}"
PORT_BLUE=8881
PORT_GREEN=8882
NGINX_SITE="/etc/nginx/sites-enabled/tm"
NGINX_SAVE="/root/Projects/tm/nginx/nginx.conf.backup"

BLUE_RUNNING=$(docker ps --filter "name=${APP_BASE}-blue" --format "{{.Names}}")
GREEN_RUNNING=$(docker ps --filter "name=${APP_BASE}-green" --format "{{.Names}}")

if [ -n "$BLUE_RUNNING" ] && [ -n "$GREEN_RUNNING" ]; then
    if grep -q "proxy_pass http://localhost:$PORT_BLUE" "$NGINX_SITE"; then
        CURRENT_SRV="${APP_BASE}-blue"
        CURRENT_PORT=$PORT_BLUE
        DEPLOY_SRV="${APP_BASE}-green"
        DEPLOY_PORT=$PORT_GREEN
    else
        CURRENT_SRV="${APP_BASE}-green"
        CURRENT_PORT=$PORT_GREEN
        DEPLOY_SRV="${APP_BASE}-blue"
        DEPLOY_PORT=$PORT_BLUE
    fi
elif [ -n "$BLUE_RUNNING" ]; then
    CURRENT_SRV="${APP_BASE}-blue"
    CURRENT_PORT=$PORT_BLUE
    DEPLOY_SRV="${APP_BASE}-green"
    DEPLOY_PORT=$PORT_GREEN
elif [ -n "$GREEN_RUNNING" ]; then
    CURRENT_SRV="${APP_BASE}-green"
    CURRENT_PORT=$PORT_GREEN
    DEPLOY_SRV="${APP_BASE}-blue"
    DEPLOY_PORT=$PORT_BLUE
else
    CURRENT_SRV=""
    DEPLOY_SRV="${APP_BASE}-blue"
    DEPLOY_PORT=$PORT_BLUE
fi

echo "Active: ${CURRENT_SRV:-None}"
echo "Deploying: $DEPLOY_SRV on $DEPLOY_PORT"

BUILD_TS=$(date +%Y%m%d%H%M%S)
IMAGE_TAG="${APP_IMAGE}-${BUILD_TS}"
docker build -t "$IMAGE_TAG" .

docker stop "$DEPLOY_SRV" 2>/dev/null || true
docker rm "$DEPLOY_SRV" 2>/dev/null || true

docker run --restart always -d \
  --name "$DEPLOY_SRV" \
  -p "$DEPLOY_PORT:$PROD_PORT" \
  -v "$DATA_VOLUME:/app/tm-instance" \
  --env FLASK_PORT="$PROD_PORT" \
  "$IMAGE_TAG"

echo "Initializing..."
sleep 5

HEALTH_URL="http://localhost:$DEPLOY_PORT/ready"
OK=false
MAX=10
COUNT=0

while [ $COUNT -lt $MAX ]; do
    if curl -s -m 2 "$HEALTH_URL" | grep -q "ok"; then
        OK=true
        break
    fi
    COUNT=$((COUNT+1))
    echo "Waiting ($COUNT/$MAX)"
    sleep 2
done

if [ "$OK" = true ]; then
    cp "$NGINX_SITE" "$NGINX_SAVE"
    sed -i "s|proxy_pass http://localhost:[0-9]\+;|proxy_pass http://localhost:$DEPLOY_PORT;|g" "$NGINX_SITE"
    sed -i "/location \/ready/,/}/s|proxy_pass http://localhost:[0-9]\+;|proxy_pass http://localhost:$DEPLOY_PORT;|" "$NGINX_SITE"
    echo "Testing nginx..."
    if nginx -t; then
        systemctl reload nginx
        sleep 10
        if [ -n "$CURRENT_SRV" ]; then
            docker stop "$CURRENT_SRV"
            docker rm "$CURRENT_SRV"
        fi
        echo "Deployed $DEPLOY_SRV"
    else
        cp "$NGINX_SAVE" "$NGINX_SITE"
        systemctl reload nginx
        docker stop "$DEPLOY_SRV"
        docker rm "$DEPLOY_SRV"
        echo "Failed, rolled back to $CURRENT_SRV"
        exit 1
    fi
else
    docker stop "$DEPLOY_SRV"
    docker rm "$DEPLOY_SRV"
    echo "Health check failed"
    exit 1
fi

docker image prune -f