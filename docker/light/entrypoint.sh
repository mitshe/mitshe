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
if [ "$AUTH_MODE" = "local" ]; then
    echo "Running in LOCAL mode - no authentication required"
else
    # Validate Clerk keys
    if [ -z "$CLERK_SECRET_KEY" ]; then
        echo "Warning: CLERK_SECRET_KEY not set. Authentication will not work."
        echo "Set it via: docker run -e CLERK_SECRET_KEY=sk_... mitshe"
    fi

    if [ -z "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ]; then
        echo "Warning: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not set."
    fi
fi

echo ""
echo "=================================================="
echo "  mitshe-light is starting..."
echo ""
echo "  Frontend:  http://localhost:3000"
echo "  API:       http://localhost:3001"
echo "  Data:      /build/data/mitshe.db"
echo ""
echo "  To persist data, mount a volume:"
echo "  docker run -v mitshe-data:/build/data mitshe"
echo "=================================================="
echo ""

# Execute the main command
exec "$@"
