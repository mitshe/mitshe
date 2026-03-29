# AI Tasks Platform - Setup Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis (for BullMQ job queues)
- pnpm or npm

## Project Structure

```
ai-tasks-web/     # Next.js 16 frontend
ai-tasks-api/     # NestJS backend
```

## Backend Setup (ai-tasks-api)

### 1. Install Dependencies

```bash
cd ai-tasks-api
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai_tasks"

# Redis (for job queues)
REDIS_HOST=localhost
REDIS_PORT=6379

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_...

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your-32-byte-hex-key

# Optional: Webhook Secrets
GITHUB_WEBHOOK_SECRET=
GITLAB_WEBHOOK_SECRET=
JIRA_WEBHOOK_SECRET=

# Optional: AI Providers (configured per-organization in the app)
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
```

### 3. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### 4. Start the Server

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3001`

## Frontend Setup (ai-tasks-web)

### 1. Install Dependencies

```bash
cd ai-tasks-web
npm install
```

### 2. Configure Environment

Create a `.env.local` file:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Start the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Clerk Configuration

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Enable Organizations in the sidebar
4. Configure OAuth providers as needed (Google, GitHub)
5. Copy the API keys to both `.env` files

### Clerk Webhook (Required for Sync)

Set up a webhook in Clerk Dashboard:
- **Endpoint URL**: `https://your-api-domain/webhooks/clerk`
- **Events**: `organization.created`, `organization.updated`, `organizationMembership.*`

## Running Tests

```bash
# Backend tests
cd ai-tasks-api
npm test

# Frontend type check
cd ai-tasks-web
npm run build
```

## Architecture Overview

### Backend (NestJS)

- **Hexagonal Architecture** with Ports & Adapters
- **CQRS** pattern for commands/queries
- **BullMQ** for async job processing
- **Prisma ORM** for database access
- **WebSocket** support via Socket.io

### Frontend (Next.js 16)

- **App Router** with server components
- **Clerk** for authentication & organizations
- **TanStack Query** for data fetching
- **Shadcn/ui** component library
- **React Flow** for workflow editor

## Key Features

- Multi-organization support via Clerk
- AI-powered task processing (OpenAI, Anthropic, Google AI)
- Visual workflow builder
- Git integration (GitHub, GitLab)
- Issue tracker integration (JIRA)
- Real-time updates via WebSocket

## Troubleshooting

### Clerk "Missing publishableKey" Error

Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set in `.env.local` and restart the dev server.

### Database Connection Issues

1. Verify PostgreSQL is running
2. Check `DATABASE_URL` format
3. Run `npx prisma db push` to sync schema

### Redis Connection Issues

Ensure Redis is running on the configured host/port. For development, you can use Docker:

```bash
docker run -d -p 6379:6379 redis:alpine
```
