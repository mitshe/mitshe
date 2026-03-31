#!/bin/bash
set -e

echo "Starting mitshe-light..."

# Create data directory if not exists
mkdir -p /build/data

# Initialize SQLite database if not exists
if [ ! -f /build/data/mitshe.db ]; then
    echo "Initializing database..."
    cd /build/apps/api
    prisma db push --skip-generate
    echo "Database initialized"
fi

# Generate encryption key if not set
if [ -z "$ENCRYPTION_KEY" ]; then
    export ENCRYPTION_KEY=$(openssl rand -hex 32)
    echo "Generated encryption key (will change on restart if not set via env)"
fi

# Check auth mode
if [ "$AUTH_MODE" = "selfhosted" ] || [ -z "$AUTH_MODE" ]; then
    echo "Running in SELFHOSTED mode - email/password authentication"
else
    if [ -z "$CLERK_SECRET_KEY" ]; then
        echo "Warning: CLERK_SECRET_KEY not set. Authentication will not work."
    fi
fi

# Ensure executor image exists on host (for workflow execution)
EXECUTOR_IMAGE="${EXECUTOR_IMAGE:-ghcr.io/mitshe/mitshe-executor:latest}"
export EXECUTOR_IMAGE
if [ -S /var/run/docker.sock ]; then
    if ! docker image inspect "$EXECUTOR_IMAGE" > /dev/null 2>&1; then
        echo "Pulling workflow executor image: $EXECUTOR_IMAGE"
        docker pull "$EXECUTOR_IMAGE" 2>/dev/null || echo "Warning: Could not pull executor image. Workflows will not run until image is available."
    else
        echo "Executor image found: $EXECUTOR_IMAGE"
    fi
else
    echo "Warning: Docker socket not mounted. Workflow execution will not work."
    echo "  Mount it with: -v /var/run/docker.sock:/var/run/docker.sock"
fi

echo ""
echo "=================================================="
echo "  mitshe is ready!"
echo ""
echo "  Frontend:  http://localhost:3000"
echo "  API:       http://localhost:3001"
echo "=================================================="
echo ""

exec "$@"
