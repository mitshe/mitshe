#!/bin/bash
set -e

echo "Starting mitshe..."

mkdir -p /build/data

# Fix Docker socket permissions (GID may differ between host and container)
if [ -S /var/run/docker.sock ]; then
    SOCK_GID=$(stat -c '%g' /var/run/docker.sock)
    if ! getent group "$SOCK_GID" > /dev/null 2>&1; then
        addgroup -g "$SOCK_GID" dockerhost 2>/dev/null || true
    fi
    DOCKER_GROUP=$(getent group "$SOCK_GID" | cut -d: -f1)
    adduser mitshe "$DOCKER_GROUP" 2>/dev/null || true
fi

cd /build/apps/api
if echo "$DATABASE_URL" | grep -q "^postgresql"; then
    echo "Running PostgreSQL migrations..."
    prisma migrate deploy 2>/dev/null || prisma db push --skip-generate
else
    echo "Running SQLite schema sync..."
    prisma db push --skip-generate
fi
echo "Database ready"

# Fix data directory ownership (entrypoint runs as root, app runs as mitshe)
chown -R mitshe:mitshe /build/data

if [ -z "$ENCRYPTION_KEY" ]; then
    KEY_FILE="/build/data/.encryption_key"
    if [ -f "$KEY_FILE" ]; then
        export ENCRYPTION_KEY=$(cat "$KEY_FILE")
    else
        export ENCRYPTION_KEY=$(openssl rand -hex 32)
        echo "$ENCRYPTION_KEY" > "$KEY_FILE"
        chmod 600 "$KEY_FILE"
    fi
fi

if [ -S /var/run/docker.sock ]; then
    EXECUTOR_IMAGE="${EXECUTOR_IMAGE:-ghcr.io/mitshe/mitshe-executor:latest}"
    export EXECUTOR_IMAGE
    if ! docker image inspect "$EXECUTOR_IMAGE" > /dev/null 2>&1; then
        echo "Pulling executor image: $EXECUTOR_IMAGE"
        docker pull "$EXECUTOR_IMAGE" 2>/dev/null || echo "Warning: Could not pull executor image."
    fi
fi

echo ""
echo "mitshe is ready!"
echo "  Frontend: ${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
echo "  API:      ${NEXT_PUBLIC_API_URL:-http://localhost:3001}"
echo ""

exec "$@"
