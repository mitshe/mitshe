# mitshe - AI workflow automation platform
# Run `just` to see all available commands

# Default recipe - show help
default:
    @just --list

# ==========================================
# Development
# ==========================================

# Start development environment (databases + apps with hot-reload)
dev: infra
    pnpm run dev

# Start only infrastructure (PostgreSQL + Redis)
infra:
    docker compose -f docker/dev/docker-compose.yml up -d
    @echo "Waiting for databases to be ready..."
    @sleep 3
    @echo "Infrastructure ready!"
    @echo "  PostgreSQL: localhost:5432"
    @echo "  Redis:      localhost:6379"

# Stop infrastructure
infra-down:
    docker compose -f docker/dev/docker-compose.yml down

# View infrastructure logs
infra-logs:
    docker compose -f docker/dev/docker-compose.yml logs -f

# ==========================================
# Light Mode (All-in-one container)
# ==========================================

# Build light mode image
light-build:
    docker build -t ghcr.io/mitshe/light:latest -f docker/light/Dockerfile .

# Run light mode container
light:
    docker compose -f docker/light/docker-compose.yml up

# Run light mode in background
light-up:
    docker compose -f docker/light/docker-compose.yml up -d

# Stop light mode
light-down:
    docker compose -f docker/light/docker-compose.yml down

# View light mode logs
light-logs:
    docker logs -f mitshe

# ==========================================
# Installation & Building
# ==========================================

# Install all dependencies
install:
    pnpm install

# Build all packages and apps
build:
    pnpm run build

# Build API only
build-api:
    pnpm --filter @mitshe/api run build

# Build Web only
build-web:
    pnpm --filter @mitshe/web run build

# Build types package
build-types:
    pnpm --filter @mitshe/types run build

# Clean all build artifacts
clean:
    rm -rf apps/web/.next
    rm -rf apps/api/dist
    rm -rf packages/types/dist
    rm -rf node_modules/.cache

# ==========================================
# Database
# ==========================================

# Generate Prisma client
db-generate:
    pnpm --filter @mitshe/api run db:generate

# Run migrations (development)
db-migrate:
    pnpm --filter @mitshe/api run db:migrate

# Deploy migrations (production)
db-migrate-deploy:
    pnpm --filter @mitshe/api run db:migrate:deploy

# Push schema (for SQLite/light mode)
db-push:
    pnpm --filter @mitshe/api run db:push

# Reset database (development only!)
db-reset:
    pnpm --filter @mitshe/api run db:reset

# Open Prisma Studio
db-studio:
    pnpm --filter @mitshe/api run db:studio

# ==========================================
# Testing
# ==========================================

# Run all tests
test:
    pnpm test

# Run API tests
test-api:
    pnpm --filter @mitshe/api test

# Run Web tests
test-web:
    pnpm --filter @mitshe/web test

# Run tests in watch mode
test-watch:
    pnpm test -- --watch

# ==========================================
# Code Quality
# ==========================================

# Run linting
lint:
    pnpm run lint

# Run type checking
typecheck:
    pnpm run typecheck

# Format code
format:
    pnpm run format

# Run all checks (lint + typecheck + test)
check: lint typecheck test

# ==========================================
# Docker Images
# ==========================================

# Build all Docker images
docker-build: light-build
    docker build -t ghcr.io/mitshe/web:latest -f apps/web/Dockerfile .
    docker build -t ghcr.io/mitshe/api:latest -f apps/api/Dockerfile .

# Push all images to GHCR
docker-push:
    docker push ghcr.io/mitshe/web:latest
    docker push ghcr.io/mitshe/api:latest
    docker push ghcr.io/mitshe/light:latest

# Login to GitHub Container Registry
ghcr-login:
    @echo "Login to GHCR with: echo \$GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"

# ==========================================
# Setup
# ==========================================

# Initial setup for new developers
setup: install db-generate
    @echo ""
    @echo "Setup complete! Next steps:"
    @echo "  1. Copy .env.example to .env and configure"
    @echo "  2. Run 'just infra' to start databases"
    @echo "  3. Run 'just db-migrate' to create tables"
    @echo "  4. Run 'just dev' to start development"

# Create .env files from examples
env-setup:
    @if [ ! -f .env ]; then cp .env.example .env && echo "Created .env"; fi
    @if [ ! -f apps/web/.env ]; then cp apps/web/.env.example apps/web/.env 2>/dev/null || echo "No apps/web/.env.example"; fi
    @if [ ! -f apps/api/.env ]; then cp apps/api/.env.example apps/api/.env 2>/dev/null || echo "No apps/api/.env.example"; fi
