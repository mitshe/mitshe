# mitshe

> Open-source AI-powered workflow automation platform with interactive agent workspaces

[![CI](https://github.com/mitshe/mitshe/actions/workflows/ci.yml/badge.svg)](https://github.com/mitshe/mitshe/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

mitshe automates development workflows using AI agents and provides interactive workspaces for hands-on collaboration with AI. Connect your tools (Jira, GitHub, GitLab, Slack), build visual automation pipelines, and work with AI agents like Claude Code or OpenClaw directly in your browser - complete with a terminal, code editor, and file browser. Each session runs in an isolated Docker container with full access to your repositories.

![mitshe dashboard](docs/dashboard.png)

## Screenshots

| | |
|---|---|
| ![Dashboard](docs/dashboard.png) | ![Projects](docs/projects.png) |
| ![Tasks](docs/tasks.png) | ![Workflows](docs/workflows.png) |
| ![Executions](docs/executions.png) | ![Integrations](docs/integrations.png) |
| ![Documentation](docs/documentation.png) | |

## Run it

```bash
docker run -d \
  --name mitshe \
  -p 3000:3000 \
  -p 3001:3001 \
  -v mitshe-data:/build/data \
  -v /var/run/docker.sock:/var/run/docker.sock \
  ghcr.io/mitshe/mitshe:latest
```

Open **http://localhost:3000**. Create your admin account on first visit.

Docker socket is mounted so mitshe can run workflow tasks in isolated containers on the host.

```bash
# Stop
docker stop mitshe && docker rm mitshe
```

## Update

Your data is stored in the `mitshe-data` volume and persists across updates.

```bash
docker stop mitshe && docker rm mitshe
docker pull ghcr.io/mitshe/mitshe:latest
docker run -d \
  --name mitshe \
  -p 3000:3000 \
  -p 3001:3001 \
  -v mitshe-data:/build/data \
  -v /var/run/docker.sock:/var/run/docker.sock \
  ghcr.io/mitshe/mitshe:latest
```

## Develop

```bash
# Prerequisites: Node.js 20+, pnpm 9+, Docker, just
corepack enable && corepack prepare pnpm@9 --activate
brew install just  # macOS (or: curl -sSf https://just.systems/install.sh | bash)

# Setup
git clone https://github.com/mitshe/mitshe.git
cd mitshe
just setup

# Configure environment
cp .env.example .env
cp apps/api/.env.example apps/api/.env
# Edit .env files - ENCRYPTION_KEY and JWT_SECRET auto-generate if not set

# Build workflow executor image (one-time, required for sessions and workflows)
just executor-build

# Start databases + dev servers
just dev
```

Frontend: http://localhost:3000 | API: http://localhost:3001 | API Docs: http://localhost:3001/api

## Commands

Run `just` to see all commands. Key ones:

| Command | Description |
|---------|-------------|
| `just run` | Run mitshe via `docker run` |
| `just stop` | Stop mitshe container |
| `just dev` | Dev mode (email/password auth) |
| `just executor-build` | Build workflow executor image |
| `just build` | Build all packages |
| `just check` | Lint + typecheck + test |
| `just light-build` | Build light Docker image |
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
