# mitshe

> Open-source AI-powered workflow automation platform

[![CI](https://github.com/mitshe/mitshe/actions/workflows/ci.yml/badge.svg)](https://github.com/mitshe/mitshe/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

mitshe automates development workflows using AI agents. Connect your tools (Jira, GitLab, Slack) and let AI handle repetitive tasks - from code analysis to merge request creation.

## Run it

```bash
docker run -d \
  --name mitshe \
  -p 3000:3000 \
  -p 3001:3001 \
  -v mitshe-data:/build/data \
  ghcr.io/mitshe/light:latest
```

Open **http://localhost:3000**. That's it.

Everything runs in one container: frontend, API, SQLite, Redis. No configuration needed.

```bash
# Stop
docker stop mitshe && docker rm mitshe
```

## Develop

```bash
# Prerequisites: Node.js 20+, pnpm 9+, Docker, just
corepack enable && corepack prepare pnpm@9 --activate
brew install just  # macOS

# Setup
git clone https://github.com/mitshe/mitshe.git
cd mitshe
just setup

# Start databases + dev servers (no auth config needed)
just dev-local
```

Frontend: http://localhost:3000 | API: http://localhost:3001 | API Docs: http://localhost:3001/api

## Commands

Run `just` to see all commands. Key ones:

| Command | Description |
|---------|-------------|
| `just run` | Run mitshe via `docker run` |
| `just stop` | Stop mitshe container |
| `just dev-local` | Dev mode, no auth needed |
| `just dev` | Dev mode with Clerk auth |
| `just build` | Build all packages |
| `just check` | Lint + typecheck + test |
| `just light-build` | Build Docker image locally |
| `just db-migrate` | Run database migrations |

## Project Structure

```
mitshe/
├── apps/
│   ├── web/          # Next.js 16 frontend
│   └── api/          # NestJS 11 backend
├── packages/
│   └── types/        # Shared TypeScript types
├── docker/
│   ├── light/        # All-in-one container (SQLite + Redis)
│   └── dev/          # Dev infrastructure (PostgreSQL + Redis)
├── justfile          # Task runner
└── turbo.json        # Build config
```

## Tech Stack

Next.js 16 + NestJS 11 + TypeScript + Prisma + PostgreSQL/SQLite + Redis + BullMQ + React Flow + shadcn/ui + Tailwind CSS 4

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for architecture, code conventions, and development workflow.

## License

MIT - see [LICENSE](./LICENSE)
