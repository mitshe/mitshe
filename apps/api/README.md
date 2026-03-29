# AI Tasks API

Backend API for the AI-powered task automation platform.

## Tech Stack

- **Framework:** NestJS
- **Database:** PostgreSQL + Prisma ORM
- **Queue:** BullMQ + Redis
- **Auth:** Clerk JWT verification
- **Real-time:** Socket.io
- **Architecture:** Hexagonal + CQRS + Event-Driven

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker (optional, for local services)

### Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Required variables:

```bash
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ai_tasks

# Redis
REDIS_URL=redis://localhost:6379

# Clerk
CLERK_SECRET_KEY=sk_...

# Security
ENCRYPTION_KEY=your-32-byte-hex-key

# CORS
CORS_ORIGINS=http://localhost:3000
```

### Development

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run start:dev
```

API available at [http://localhost:3001](http://localhost:3001).
Swagger docs at [http://localhost:3001/api](http://localhost:3001/api).

### Build

```bash
# Production build
npm run build

# Start production
npm run start:prod
```

## Project Structure

```
src/
├── domain/              # Domain layer (entities, events)
├── application/         # Application layer (commands, queries)
├── ports/               # Port interfaces
├── infrastructure/      # Infrastructure (adapters, persistence)
│   ├── adapters/        # External service adapters
│   ├── persistence/     # Database (Prisma)
│   ├── queue/           # Job processing (BullMQ)
│   └── webhooks/        # Webhook controllers
├── modules/             # Feature modules
│   ├── tasks/           # Task management
│   ├── projects/        # Project management
│   ├── workflows/       # Workflow engine
│   ├── integrations/    # Integration management
│   └── ai-credentials/  # AI API key management
└── shared/              # Shared utilities, guards
```

## Features

- Task management with AI processing
- Visual workflow engine
- Multi-tenant with organization isolation
- BYOK (Bring Your Own Key) for AI providers
- External integrations:
  - Issue trackers: JIRA, YouTrack, Linear
  - Git providers: GitLab, GitHub
  - Notifications: Slack, Teams
- Webhook processing with signature verification
- Real-time updates via WebSocket

## API Documentation

Swagger documentation available at `/api` when running the server.

## Security

- Helmet security headers
- Rate limiting
- Input validation with class-validator
- Timing-safe webhook signature verification
- Encrypted credential storage (AES-256-GCM)
- Organization-level data isolation

## Related

- [ai-tasks-web](../ai-tasks-web) - Frontend application
