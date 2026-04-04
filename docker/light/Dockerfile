# mitshe-light: All-in-one container with frontend, backend, SQLite, and Redis
# Perfect for local testing and demos
#
# Build from monorepo root:
#   docker build -t ghcr.io/mitshe/light:latest -f docker/light/Dockerfile .

FROM node:20-alpine AS base

# Install pnpm and build dependencies
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    sqlite \
    openssl

# ==========================================
# Stage 1: Install dependencies
# ==========================================
FROM base AS deps

WORKDIR /build

# Copy workspace config and lockfile
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package.json files for all packages
COPY packages/types/package.json ./packages/types/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ==========================================
# Stage 2: Build all packages
# ==========================================
FROM base AS builder

WORKDIR /build

# Copy dependencies from deps stage
COPY --from=deps /build/node_modules ./node_modules
COPY --from=deps /build/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /build/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /build/apps/api/node_modules ./apps/api/node_modules

# Copy all source files
COPY pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/

# Build shared types first
WORKDIR /build/packages/types
RUN pnpm run build

# Modify Prisma schema to use SQLite for light mode
WORKDIR /build/apps/api
RUN sed -i 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
RUN pnpm run db:generate

# Build API
RUN pnpm run build

# Build Web (with light mode environment)
WORKDIR /build/apps/web
ENV NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_WS_URL=ws://localhost:3001
ENV NEXT_PUBLIC_AUTH_MODE=selfhosted
ENV AUTH_MODE=selfhosted
ENV NEXT_TELEMETRY_DISABLED=1
# Set turbopack root for monorepo builds
ENV TURBO_ROOT=/build
RUN pnpm run build

# ==========================================
# Stage 3: Production Image
# ==========================================
FROM node:20-alpine AS production

LABEL org.opencontainers.image.title="mitshe-light"
LABEL org.opencontainers.image.description="All-in-one mitshe container for local testing"
LABEL org.opencontainers.image.source="https://github.com/mitshe/mitshe"
LABEL org.opencontainers.image.licenses="MIT"

# Install runtime dependencies
RUN apk add --no-cache \
    sqlite \
    redis \
    supervisor \
    curl \
    bash \
    openssl \
    docker-cli && \
    npm install -g prisma@6

# Use /build as base directory to preserve pnpm symlink structure
WORKDIR /build

# Create directories
RUN mkdir -p /build/apps/web /build/apps/api /build/data /var/log/supervisor

# Copy built frontend
COPY --from=builder /build/apps/web/.next /build/apps/web/.next
COPY --from=builder /build/apps/web/public /build/apps/web/public
COPY --from=builder /build/apps/web/package.json /build/apps/web/
COPY --from=builder /build/apps/web/next.config.ts /build/apps/web/

# Copy built backend
COPY --from=builder /build/apps/api/dist /build/apps/api/dist
COPY --from=builder /build/apps/api/package.json /build/apps/api/
COPY --from=builder /build/apps/api/prisma /build/apps/api/prisma

# Copy full monorepo node_modules structure (required for pnpm symlinks)
COPY --from=builder /build/node_modules /build/node_modules
COPY --from=builder /build/apps/web/node_modules /build/apps/web/node_modules
COPY --from=builder /build/apps/api/node_modules /build/apps/api/node_modules
COPY --from=builder /build/packages/types /build/packages/types

WORKDIR /build

# Create non-root user with docker group access
RUN addgroup -g 998 docker 2>/dev/null || true && \
    adduser -D -u 1000 mitshe && \
    addgroup mitshe docker 2>/dev/null || true && \
    chown -R mitshe:mitshe /build /var/log/supervisor

# Copy configuration files
COPY docker/light/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/light/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Environment variables for light mode
ENV NODE_ENV=production
ENV AUTH_MODE=selfhosted
ENV DATABASE_URL=file:/build/data/mitshe.db
ENV REDIS_URL=redis://localhost:6379
ENV PORT=3001
ENV NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_WS_URL=ws://localhost:3001
ENV NEXT_PUBLIC_AUTH_MODE=selfhosted

# Volumes for persistence
VOLUME ["/build/data"]

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000 && curl -f http://localhost:3001/health || exit 1

# Note: entrypoint runs as root for initialization (Redis, DB setup, Docker pull).
# Application processes (web, api) run as 'mitshe' user via supervisor config.

ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
