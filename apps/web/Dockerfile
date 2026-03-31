# Build stage
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Install dependencies
FROM base AS deps
WORKDIR /build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /build
COPY --from=deps /build/node_modules ./node_modules
COPY --from=deps /build/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /build/apps/web/node_modules ./apps/web/node_modules
COPY pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Build types
WORKDIR /build/packages/types
RUN pnpm run build

# Build web
WORKDIR /build/apps/web
ENV NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_AUTH_MODE=selfhosted
ENV AUTH_MODE=selfhosted
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# Production
FROM node:20-alpine AS production
RUN apk add --no-cache curl
WORKDIR /build

COPY --from=builder /build/apps/web/.next /build/apps/web/.next
COPY --from=builder /build/apps/web/public /build/apps/web/public
COPY --from=builder /build/apps/web/package.json /build/apps/web/
COPY --from=builder /build/apps/web/next.config.ts /build/apps/web/
COPY --from=builder /build/node_modules /build/node_modules
COPY --from=builder /build/apps/web/node_modules /build/apps/web/node_modules
COPY --from=builder /build/packages/types /build/packages/types

WORKDIR /build/apps/web

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

CMD ["pnpm", "start"]
