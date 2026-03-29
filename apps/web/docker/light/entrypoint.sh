#!/bin/bash
set -e

echo "🚀 Starting mitshe-light..."

# Create data directory if not exists
mkdir -p /app/data

# Initialize SQLite database if not exists
if [ ! -f /app/data/mitshe.db ]; then
    echo "📦 Initializing database..."
    cd /app/api
    npx prisma migrate deploy
    echo "✅ Database initialized"
fi

# Generate encryption key if not set
if [ -z "$ENCRYPTION_KEY" ]; then
    export ENCRYPTION_KEY=$(openssl rand -hex 32)
    echo "🔐 Generated encryption key (will change on restart if not set via env)"
fi

# Set default Clerk keys for demo mode (users should override these)
if [ -z "$CLERK_SECRET_KEY" ]; then
    echo "⚠️  Warning: CLERK_SECRET_KEY not set. Authentication will not work."
    echo "   Set it via: docker run -e CLERK_SECRET_KEY=sk_... mitshe-light"
fi

if [ -z "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ]; then
    echo "⚠️  Warning: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not set."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  mitshe-light is starting..."
echo ""
echo "  🌐 Frontend:  http://localhost:3000"
echo "  🔧 API:       http://localhost:3001"
echo "  📊 Data:      /app/data/mitshe.db"
echo ""
echo "  To persist data, mount a volume:"
echo "  docker run -v mitshe-data:/app/data mitshe-light"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Execute the main command
exec "$@"
