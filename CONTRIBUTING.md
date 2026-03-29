# Contributing to mitshe

Thank you for your interest in contributing to mitshe! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)
- [Project Structure](#project-structure)

---

## Code of Conduct

Be respectful and inclusive. We welcome contributions from everyone regardless of experience level.

---

## Getting Started

### Prerequisites

- **Node.js 20+** - [Download](https://nodejs.org/)
- **pnpm 9+** - Enable via corepack: `corepack enable && corepack prepare pnpm@9 --activate`
- **just** - Task runner: `brew install just` (macOS) or [see installation](https://just.systems/man/en/)
- **Docker** - For running databases locally

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/mitshe/mitshe.git
cd mitshe

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env
# Edit .env with your Clerk keys

# Start databases
just infra

# Setup database
just db-generate
just db-migrate

# Start development servers
just dev
```

### Verify Setup

- Frontend: http://localhost:3000
- API: http://localhost:3001
- API Docs: http://localhost:3001/api

---

## Development Workflow

### Daily Development

```bash
# Start everything (databases + apps with hot-reload)
just dev

# Or start separately:
just infra          # Start databases only
just dev-apps       # Start frontend + backend only
```

### Running Tests

```bash
just test           # Run all tests
just lint           # Run ESLint
just typecheck      # Run TypeScript checks
just check          # Run all quality checks
```

### Database Changes

```bash
# After modifying prisma/schema.prisma:
just db-generate    # Regenerate Prisma client
just db-migrate     # Create and apply migration
just db-studio      # Open Prisma Studio (database GUI)
```

### Building

```bash
just build          # Build all packages
```

---

## Code Style

### TypeScript

- Use TypeScript for all code
- Enable strict mode
- Prefer interfaces over types for object shapes
- Use explicit return types for functions

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `task-service.ts` |
| Classes | PascalCase | `TaskService` |
| Interfaces | PascalCase | `IssueTrackerPort` |
| Functions | camelCase | `createTask()` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES` |
| Variables | camelCase | `taskCount` |

### File Structure

```typescript
// 1. External imports
import { Injectable } from '@nestjs/common';

// 2. Internal imports (absolute paths)
import { TaskRepository } from '@/ports/task.repository';

// 3. Relative imports
import { CreateTaskDto } from './dto/create-task.dto';

// 4. Types/Interfaces (if not in separate file)
interface CreateTaskParams { }

// 5. Implementation
@Injectable()
export class TaskService {
  // ...
}
```

### Formatting

We use Prettier for code formatting:

```bash
pnpm format         # Format all files
```

Prettier config is in `package.json`.

---

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes nor adds |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |

### Examples

```bash
feat(api): add Jira webhook handler
fix(web): resolve task list pagination issue
docs: update README with new commands
refactor(api): extract AI service interface
test(api): add unit tests for TaskService
chore: update dependencies
```

### Scope

Use the app or package name:
- `web` - Frontend changes
- `api` - Backend changes
- `types` - Shared types package
- `docker` - Docker configuration
- `ci` - CI/CD changes

---

## Pull Requests

### Before Submitting

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

3. **Run quality checks**
   ```bash
   just check
   ```

4. **Commit your changes**
   ```bash
   git commit -m "feat(scope): description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

### PR Guidelines

- **Title**: Use conventional commit format
- **Description**: Explain what and why
- **Size**: Keep PRs focused and small when possible
- **Tests**: Add tests for new functionality
- **Documentation**: Update docs if needed

### PR Template

```markdown
## Summary
Brief description of changes

## Changes
- Change 1
- Change 2

## Testing
How to test these changes

## Checklist
- [ ] Tests pass (`just test`)
- [ ] Linting passes (`just lint`)
- [ ] Types check (`just typecheck`)
- [ ] Documentation updated (if needed)
```

---

## Project Structure

```
mitshe/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/         # App Router pages
│   │   │   ├── components/  # React components
│   │   │   └── lib/         # Utilities
│   │   └── package.json
│   └── api/                 # NestJS backend
│       ├── src/
│       │   ├── modules/     # Feature modules
│       │   ├── infrastructure/
│       │   └── domain/
│       ├── prisma/          # Database schema
│       └── package.json
├── packages/
│   └── types/               # Shared TypeScript types
├── docker/
│   ├── light/               # All-in-one container
│   ├── dev/                 # Development databases
│   └── prod/                # Production setup
├── justfile                 # Task runner
└── turbo.json               # Build orchestration
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `apps/web/src/app/` | Next.js pages and routes |
| `apps/web/src/components/` | Reusable React components |
| `apps/api/src/modules/` | NestJS feature modules |
| `apps/api/src/infrastructure/` | External integrations |
| `apps/api/prisma/` | Database schema and migrations |
| `packages/types/` | Shared TypeScript definitions |

---

## Architecture

### Backend (NestJS)

We follow **Hexagonal Architecture** with **CQRS**:

- **Ports** (`src/ports/`) - Interfaces for external systems
- **Adapters** (`src/infrastructure/adapters/`) - Implementations
- **Commands** (`src/application/commands/`) - Write operations
- **Queries** (`src/application/queries/`) - Read operations
- **Events** (`src/domain/events/`) - Domain events

### Frontend (Next.js)

- **App Router** - File-based routing
- **Server Components** - Default for pages
- **Client Components** - Interactive UI
- **Server Actions** - Form handling

---

## Need Help?

- **Questions**: Open a [Discussion](https://github.com/mitshe/mitshe/discussions)
- **Bugs**: Open an [Issue](https://github.com/mitshe/mitshe/issues)
- **Security**: Email security@mitshe.io

---

Thank you for contributing!
