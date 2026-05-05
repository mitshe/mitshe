#!/bin/bash
set -e

DESKTOP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT_DIR="$(cd "$DESKTOP_DIR/../.." && pwd)"
BACKEND_DIR="$DESKTOP_DIR/backend"

echo "Building embedded backend for desktop..."

# Clean
rm -rf "$BACKEND_DIR"
mkdir -p "$BACKEND_DIR"

# Copy API source
echo "Copying API source..."
cp -r "$ROOT_DIR/apps/api/src" "$BACKEND_DIR/src"
cp -r "$ROOT_DIR/apps/api/prisma" "$BACKEND_DIR/prisma"
cp "$ROOT_DIR/apps/api/package.json" "$BACKEND_DIR/package.json"
cp "$ROOT_DIR/apps/api/tsconfig.json" "$BACKEND_DIR/tsconfig.json"
cp "$ROOT_DIR/apps/api/tsconfig.build.json" "$BACKEND_DIR/tsconfig.build.json" 2>/dev/null || true
cp "$ROOT_DIR/apps/api/nest-cli.json" "$BACKEND_DIR/nest-cli.json"

# Switch Prisma to SQLite
echo "Switching Prisma to SQLite..."
sed -i '' 's/provider = "postgresql"/provider = "sqlite"/' "$BACKEND_DIR/prisma/schema.prisma"
# Remove PostgreSQL-only features
sed -i '' 's/@db\.Text//g' "$BACKEND_DIR/prisma/schema.prisma"

# Install deps
echo "Installing dependencies..."
cd "$BACKEND_DIR"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Generate Prisma client for SQLite
echo "Generating Prisma client (SQLite)..."
npx prisma generate

# Build NestJS
echo "Building NestJS..."
npx nest build

# Copy shared types
echo "Copying shared types..."
mkdir -p "$BACKEND_DIR/node_modules/@mitshe/types"
cp -r "$ROOT_DIR/packages/types/dist" "$BACKEND_DIR/node_modules/@mitshe/types/dist" 2>/dev/null || true
cp "$ROOT_DIR/packages/types/package.json" "$BACKEND_DIR/node_modules/@mitshe/types/package.json" 2>/dev/null || true

# Build Next.js standalone web
echo "Building Next.js standalone..."
WEB_DIR="$DESKTOP_DIR/web-standalone"
rm -rf "$WEB_DIR"

cd "$ROOT_DIR"
BACKEND_URL="http://localhost:13001" pnpm --filter @mitshe/web build

# Copy standalone output
mkdir -p "$WEB_DIR"
cp -r "$ROOT_DIR/apps/web/.next/standalone/." "$WEB_DIR/"
cp -r "$ROOT_DIR/apps/web/.next/static" "$WEB_DIR/apps/web/.next/static"
cp -r "$ROOT_DIR/apps/web/public" "$WEB_DIR/apps/web/public"

echo ""
echo "Desktop backend built successfully!"
echo "API entry: $BACKEND_DIR/dist/main.js"
echo "Web entry: $WEB_DIR/apps/web/server.js"
