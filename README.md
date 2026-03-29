# mitshe

> Open-source AI-powered workflow automation platform

[![CI](https://github.com/mitshe/mitshe/actions/workflows/ci.yml/badge.svg)](https://github.com/mitshe/mitshe/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

mitshe automates development workflows using AI agents. Connect your tools (Jira, GitLab, Slack) and let AI handle repetitive tasks - from code analysis to merge request creation.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    JIRA     │────▶│     AI      │────▶│   GitLab    │────▶│    Slack    │
│  (trigger)  │     │  (analyze)  │     │    (MR)     │     │  (notify)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

## Features

- **Visual Workflow Builder** - Drag-and-drop interface with React Flow
- **Multi-Agent System** - Researcher, Developer, Reviewer, Security, Tester agents
- **Integrations** - Jira, GitLab, GitHub, Slack, Discord, Telegram
- **BYOK** - Bring Your Own API Keys (Claude, OpenAI, etc.)
- **Self-Hosted** - Run on your infrastructure with full data control

---

## Quick Start

### Option 1: Light Mode (Single Container) - Recommended

The fastest way to try mitshe - **no setup required**, everything runs in one container:

```bash
docker run -d \
  --name mitshe \
  -p 3000:3000 \
  -p 3001:3001 \
  -v mitshe-data:/build/data \
  ghcr.io/mitshe/light:latest
```

**That's it!** Open http://localhost:3000

This runs in **local mode** - no authentication, no Clerk keys needed. Perfect for testing and personal use.

### Option 1b: Light Mode with Authentication

If you need multi-user authentication (Clerk):

```bash
docker run -d \
  --name mitshe \
  -p 3000:3000 \
  -p 3001:3001 \
  -v mitshe-data:/build/data \
  -e AUTH_MODE=clerk \
  -e CLERK_SECRET_KEY=sk_... \
  -e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_... \
  ghcr.io/mitshe/light:latest
```

Get Clerk keys from https://clerk.com (free tier available)

### Option 2: Development Mode

For contributing or local development with hot-reload:

```bash
# Prerequisites
corepack enable && corepack prepare pnpm@9 --activate
brew install just  # macOS, or see https://just.systems/man/en/

# Clone and setup
git clone https://github.com/mitshe/mitshe.git
cd mitshe
pnpm install

# Configure environment
cp .env.example .env

# Start databases
just infra

# Setup database schema
just db-generate
just db-migrate

# Start development servers (no auth needed in local mode)
just dev-local

# Or with Clerk authentication (requires CLERK keys in .env)
# just dev
```

Frontend: http://localhost:3000
API: http://localhost:3001
API Docs: http://localhost:3001/api

---

## Project Structure

```
mitshe/
├── apps/
│   ├── web/                 # Next.js 16 frontend
│   │   ├── src/
│   │   │   ├── app/         # App Router pages
│   │   │   ├── components/  # React components
│   │   │   └── lib/         # Utilities, API client
│   │   └── Dockerfile
│   └── api/                 # NestJS 11 backend
│       ├── src/
│       │   ├── modules/     # Feature modules
│       │   ├── infrastructure/  # Adapters, DB, queues
│       │   └── domain/      # Entities, events
│       ├── prisma/          # Database schema
│       └── Dockerfile
├── packages/
│   └── types/               # Shared TypeScript types
├── docker/
│   ├── light/               # All-in-one container (SQLite + Redis)
│   ├── dev/                 # Development infra (PostgreSQL + Redis)
│   └── prod/                # Production deployment
├── .github/workflows/       # CI/CD pipelines
├── justfile                 # Task runner (like Makefile)
├── pnpm-workspace.yaml      # pnpm workspace config
└── turbo.json               # Turborepo config
```

---

## Commands

Run `just` to see all available commands:

| Command | Description |
|---------|-------------|
| `just run` | Run mitshe via `docker run` (no compose needed) |
| `just stop` | Stop running mitshe container |
| `just dev-local` | Start development in local mode (no Clerk auth) |
| `just dev` | Start development with Clerk auth |
| `just infra` | Start only databases (PostgreSQL + Redis) |
| `just infra-down` | Stop databases |
| `just build` | Build all packages |
| `just test` | Run all tests |
| `just lint` | Run ESLint |
| `just typecheck` | Run TypeScript type checking |
| `just light` | Run light mode via docker-compose |
| `just light-build` | Build light mode Docker image |
| `just db-migrate` | Run database migrations |
| `just db-studio` | Open Prisma Studio |

---

## Deployment Modes

| Mode | Database | Redis | Auth | Use Case |
|------|----------|-------|------|----------|
| **Light** | SQLite (embedded) | Embedded | Local (anonymous) | Quick demos, single user |
| **Dev** | PostgreSQL (Docker) | Docker | Clerk | Local development |
| **Prod** | PostgreSQL (external) | External | Clerk | Production, multi-user |

### Production Deployment

For production, use separate containers:

```bash
# Build images
just docker-build

# Push to registry
just docker-push

# Deploy (see docker/prod/ for compose files)
```

---

## Configuration

### Required Environment Variables

```bash
# Authentication Mode: 'local' (no auth) or 'clerk' (Clerk auth)
AUTH_MODE=local

# Clerk Authentication (required only if AUTH_MODE=clerk)
# Get keys from https://clerk.com
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_AUTH_MODE=local  # Must match AUTH_MODE

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mitshe

# Redis
REDIS_URL=redis://localhost:6379

# Security - generate with: openssl rand -hex 32
ENCRYPTION_KEY=<64-character-hex-string>
```

### Optional Variables

```bash
# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001

# Monitoring
SENTRY_DSN=https://...
NEXT_PUBLIC_SENTRY_ENABLED=false
```

See `.env.example` for all options.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui |
| Backend | NestJS 11, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 / SQLite |
| Cache & Queue | Redis 7, BullMQ |
| Auth | Clerk (optional) or Local mode (anonymous) |
| Workflow UI | React Flow |
| Build | pnpm, Turborepo |
| Container | Docker, Docker Compose |
| CI/CD | GitHub Actions |

---

## Architecture

mitshe follows **Hexagonal Architecture** with **CQRS** and **Event-Driven** patterns:

```
┌────────────────────────────────────────────────────────────┐
│                      API Layer                             │
│  (Controllers, WebSocket Gateway, Webhooks)                │
└────────────────────────┬───────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────┐
│                 Application Layer                          │
│  (Commands, Queries, Event Handlers)                       │
└────────────────────────┬───────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────┐
│                   Domain Layer                             │
│  (Entities, Value Objects, Domain Events)                  │
└────────────────────────┬───────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────┐
│               Infrastructure Layer                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │  Jira   │ │ GitLab  │ │  Slack  │ │  AI     │         │
│  │ Adapter │ │ Adapter │ │ Adapter │ │ Adapter │         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
└────────────────────────────────────────────────────────────┘
```

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run checks: `just check`
5. Commit your changes
6. Push to the branch
7. Open a Pull Request

---

## License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## Links

- [Documentation](https://docs.mitshe.io) (coming soon)
- [Discord Community](https://discord.gg/mitshe) (coming soon)
- [Issue Tracker](https://github.com/mitshe/mitshe/issues)
