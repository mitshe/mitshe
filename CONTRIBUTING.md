# Contributing to mitshe

## Getting Started

Prerequisites: Node.js 20+, pnpm 9+, Docker, just

```bash
git clone https://github.com/mitshe/mitshe.git
cd mitshe
just setup
cp .env.example .env
just infra
just db-migrate
just dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001

## Commands

```bash
just dev          # Start dev servers
just check        # Lint + typecheck + test
just db-migrate   # Run migrations
just db-studio    # Prisma Studio
```

## Code Style

- TypeScript everywhere
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions: `camelCase`
- Constants: `SCREAMING_SNAKE`

Import order: external → internal (absolute) → relative.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat(api): add Jira webhook handler
fix(web): resolve task list pagination
chore: update dependencies
```

Scopes: `web`, `api`, `types`, `docker`, `ci`

## Architecture

Backend (NestJS): Hexagonal + CQRS
- Ports: `src/ports/` — interfaces
- Adapters: `src/infrastructure/adapters/` — implementations
- Commands/Queries: `src/application/`
- Events: `src/domain/events/`

Frontend (Next.js): App Router + Server Components + shadcn/ui

## Auth Modes

| Mode | `AUTH_MODE` | Description |
|------|-------------|-------------|
| Selfhosted | `selfhosted` | Email/password JWT (default) |
| Clerk | `clerk` | Clerk auth with organizations |

## Docker Images

- `ghcr.io/mitshe/mitshe:latest` — all-in-one (SQLite + Redis)
- `ghcr.io/mitshe/mitshe-executor:latest` — workflow executor

## License

MIT
