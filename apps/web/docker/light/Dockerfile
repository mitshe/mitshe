# mitshe-light: All-in-one container with frontend, backend, SQLite, and Redis
# Perfect for local testing and demos

FROM node:20-alpine AS base

# Install dependencies for building and running
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    sqlite \
    redis \
    supervisor \
    curl \
    bash

# ==========================================
# Stage 1: Build Frontend (Next.js)
# ==========================================
FROM base AS frontend-builder

WORKDIR /build/web

# Copy frontend source (from context)
COPY package*.json ./
RUN npm ci

COPY . .

# Build with light-mode environment
ENV NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ==========================================
# Stage 2: Build Backend (NestJS)
# ==========================================
FROM base AS backend-builder

WORKDIR /build/api

# Clone and build backend
ARG API_REPO=https://github.com/mitshe/api.git
ARG API_BRANCH=main

RUN git clone --depth 1 --branch ${API_BRANCH} ${API_REPO} .

RUN npm ci
RUN npm run build

# ==========================================
# Stage 3: Production Image
# ==========================================
FROM node:20-alpine AS production

LABEL org.opencontainers.image.title="mitshe-light"
LABEL org.opencontainers.image.description="All-in-one mitshe container for local testing"
LABEL org.opencontainers.image.source="https://github.com/mitshe/web"
LABEL org.opencontainers.image.licenses="MIT"

# Install runtime dependencies
RUN apk add --no-cache \
    sqlite \
    redis \
    supervisor \
    curl \
    bash

WORKDIR /app

# Create directories
RUN mkdir -p /app/web /app/api /app/data /var/log/supervisor

# Copy frontend
COPY --from=frontend-builder /build/web/.next /app/web/.next
COPY --from=frontend-builder /build/web/public /app/web/public
COPY --from=frontend-builder /build/web/package*.json /app/web/
COPY --from=frontend-builder /build/web/next.config.ts /app/web/

# Copy backend
COPY --from=backend-builder /build/api/dist /app/api/dist
COPY --from=backend-builder /build/api/package*.json /app/api/
COPY --from=backend-builder /build/api/prisma /app/api/prisma

# Install production dependencies
WORKDIR /app/web
RUN npm ci --only=production

WORKDIR /app/api
RUN npm ci --only=production

# Generate Prisma client for SQLite
RUN npx prisma generate

WORKDIR /app

# Copy configuration files
COPY docker/light/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/light/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Environment variables for light mode
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/mitshe.db
ENV REDIS_URL=redis://localhost:6379
ENV PORT_WEB=3000
ENV PORT_API=3001
ENV NEXT_PUBLIC_API_URL=http://localhost:3001

# Volumes for persistence
VOLUME ["/app/data"]

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000 && curl -f http://localhost:3001/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
