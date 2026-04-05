FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/landing/package.json ./apps/landing/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /build
COPY --from=deps /build/node_modules ./node_modules
COPY --from=deps /build/apps/landing/node_modules ./apps/landing/node_modules
COPY pnpm-workspace.yaml package.json ./
COPY apps/landing/ ./apps/landing/

WORKDIR /build/apps/landing
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

FROM node:20-alpine AS production
RUN apk add --no-cache curl
WORKDIR /build

COPY --from=builder /build/apps/landing/.next /build/apps/landing/.next
COPY --from=builder /build/apps/landing/public /build/apps/landing/public
COPY --from=builder /build/apps/landing/package.json /build/apps/landing/
COPY --from=builder /build/apps/landing/next.config.ts /build/apps/landing/
COPY --from=builder /build/node_modules /build/node_modules
COPY --from=builder /build/apps/landing/node_modules /build/apps/landing/node_modules

WORKDIR /build/apps/landing

EXPOSE 3002
ENV NODE_ENV=production
ENV PORT=3002

CMD ["npx", "next", "start", "-p", "3002"]
