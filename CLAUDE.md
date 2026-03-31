# CLAUDE.md - mitshe

> Ten plik jest czytany przez Claude Code jako kontekst projektu.
> Aktualizuj go gdy zmieniasz architekturę lub dodajesz nowe moduły.

## Quick Reference

```
Nazwa projektu: mitshe
Stack: Next.js 16 + NestJS 11 + TypeScript + Prisma + PostgreSQL/SQLite
Architektura: Hexagonal + CQRS + Event-Driven (Monorepo)
UI: shadcn/ui + Tailwind CSS 4
Auth: Selfhosted (JWT) lub Clerk (optional)
Build: pnpm + Turborepo
```

---

## 1. Struktura Monorepo

```
mitshe/
├── apps/
│   ├── web/                     # Next.js 16 frontend (@mitshe/web)
│   │   ├── src/
│   │   │   ├── app/             # App Router pages
│   │   │   ├── components/      # React components
│   │   │   └── lib/             # Utilities, API client
│   │   └── Dockerfile
│   └── api/                     # NestJS 11 backend (@mitshe/api)
│       ├── src/
│       │   ├── modules/         # Feature modules
│       │   ├── infrastructure/  # Adapters, DB, queues
│       │   └── domain/          # Entities, events
│       ├── prisma/              # Database schema
│       └── Dockerfile
├── packages/
│   └── types/                   # Shared TypeScript types (@mitshe/types)
├── docker/
│   ├── light/                   # All-in-one container (SQLite + Redis)
│   ├── dev/                     # Development infra (PostgreSQL + Redis)
│   └── prod/                    # Production deployment
├── .github/workflows/           # CI/CD pipelines
├── justfile                     # Task runner
├── pnpm-workspace.yaml          # pnpm workspace config
└── turbo.json                   # Turborepo config
```

### Deployment Modes

| Mode | Database | Redis | Auth | Use Case |
|------|----------|-------|------|----------|
| **Light** | SQLite (embedded) | Embedded | Selfhosted | Quick start, single user |
| **Dev** | PostgreSQL (Docker) | Docker | Selfhosted | Local development |
| **Prod** | PostgreSQL (external) | External | Selfhosted or Clerk | Production, multi-user |

### Authentication Modes

| Mode | `AUTH_MODE` | Description |
|------|-------------|-------------|
| **Selfhosted** | `selfhosted` | Email/password JWT auth (default) |
| **Clerk** | `clerk` | Clerk authentication, multi-user, organizations, RBAC |

---

## 2. Komendy (justfile)

```bash
# Pokaż wszystkie komendy
just

# Development
just dev              # Start infra + apps with hot-reload
just infra            # Start only databases
just infra-down       # Stop databases

# Build
just build            # Build all packages
just typecheck        # TypeScript type checking
just lint             # ESLint

# Database
just db-generate      # Generate Prisma client
just db-migrate       # Run migrations
just db-studio        # Open Prisma Studio

# Light Mode (all-in-one)
just light-build      # Build Docker image
just light            # Run container

# Testing
just test             # Run all tests
just check            # Run all quality checks
```

---

## 3. Architektura

### 3.1 Hexagonal (Ports & Adapters)

```
PORTS (interfaces) → apps/api/src/ports/
ADAPTERS (implementations) → apps/api/src/infrastructure/adapters/
```

**Główne porty:**
| Port | Plik | Adaptery |
|------|------|----------|
| `IssueTrackerPort` | `ports/issue-tracker.port.ts` | JiraAdapter, YouTrackAdapter, LinearAdapter |
| `GitProviderPort` | `ports/git-provider.port.ts` | GitLabAdapter, GitHubAdapter |
| `NotificationPort` | `ports/notification.port.ts` | SlackAdapter, TeamsAdapter, EmailAdapter |
| `AIProviderPort` | `ports/ai-provider.port.ts` | ClaudeAPIAdapter, OpenAIAdapter |

### 3.2 CQRS

```
Commands (write) → apps/api/src/application/commands/
Queries (read) → apps/api/src/application/queries/
```

**Naming convention:**
- Command: `CreateTaskCommand`, `ProcessTaskCommand`
- Handler: `CreateTaskHandler`, `ProcessTaskHandler`
- Query: `GetTaskQuery`, `ListTasksQuery`

### 3.3 Event-Driven

```
Events → apps/api/src/domain/events/
Handlers → apps/api/src/application/events/handlers/
```

**Główne eventy:**
- `TaskCreatedEvent` → triggers AI processing queue
- `TaskCompletedEvent` → triggers notifications
- `MergeRequestCreatedEvent` → updates JIRA, notifies Slack
- `TaskFailedEvent` → notifies human intervention needed

### 3.4 Visual Workflow Builder

**Kluczowa funkcjonalność:** Użytkownicy tworzą workflow za pomocą:
1. **GUI** - Drag & drop blocks, visual editor (React Flow)
2. **IaC (Infrastructure as Code)** - YAML/JSON definicje

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  JIRA   │───▶│   AI    │───▶│ GitLab  │───▶│  Slack  │
│ Trigger │    │ Analyze │    │   MR    │    │ Notify  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

**Node Types:**
- **Triggers:** `trigger:jira:webhook`, `trigger:gitlab:webhook`, `trigger:manual`, `trigger:schedule`
- **AI Agents:** `ai:analyze`, `ai:developer`, `ai:reviewer`, `ai:tester`, `ai:security`
- **Actions:** `action:jira:update`, `action:gitlab:mr`, `action:slack:notify`
- **Control Flow:** `control:condition`, `control:parallel`, `control:loop`

---

## 4. Konwencje Kodu

### 4.1 Nazewnictwo

```typescript
// Pliki
user.entity.ts          // Entity
create-task.command.ts  // Command
task.repository.ts      // Repository
jira.adapter.ts         // Adapter

// Klasy
class User { }                    // Entity - PascalCase
class CreateTaskCommand { }       // Command - PascalCase
class TaskRepository { }          // Repository - PascalCase
class JiraAdapter { }             // Adapter - PascalCase

// Interfaces (Ports)
interface IssueTrackerPort { }    // Port - PascalCase + "Port" suffix
interface TaskRepository { }      // Repository interface

// Functions
async function createTask() { }   // camelCase
const handleTaskCreated = () => { } // camelCase

// Constants
const MAX_RETRY_COUNT = 3;        // SCREAMING_SNAKE_CASE
const TaskStatus = { ... };       // Enum-like objects - PascalCase

// Files & folders
src/application/commands/         // kebab-case for folders
create-task.command.ts            // kebab-case for files
```

### 4.2 Struktura plików

```typescript
// 1. Imports (external first, then internal, then relative)
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { TaskRepository } from '@/ports/task.repository';
import { Task } from '@/domain/task.entity';

import { CreateTaskDto } from './dto/create-task.dto';

// 2. Types/Interfaces (if not in separate file)
interface CreateTaskParams { ... }

// 3. Class/Function
@Injectable()
export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
  ) {}

  async create(params: CreateTaskParams): Promise<Task> {
    // ...
  }
}
```

### 4.3 Error Handling

```typescript
// Domain errors - extend base error
class TaskNotFoundError extends DomainError {
  constructor(taskId: string) {
    super(`Task ${taskId} not found`);
  }
}

// Use Result pattern for expected failures
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Throw for unexpected failures
throw new InternalServerError('Database connection failed');
```

---

## 5. Next.js vs NestJS - Gdzie co robić

### 5.1 Next.js (apps/web)

**Rób tutaj:**
- UI components i pages
- Server Actions dla prostego CRUD
- Clerk auth integration
- Form handling i validation
- Optimistic UI updates
- Real-time status display (WebSocket client)

**NIE rób tutaj:**
- Background job processing
- AI agent orchestration
- External API integrations (JIRA, GitLab)
- Long-running operations
- Git operations

### 5.2 NestJS (apps/api)

**Rób tutaj:**
- Webhook endpoints (JIRA, GitLab)
- AI processing pipeline
- Background jobs (BullMQ)
- Git operations (clone, commit, push)
- External integrations
- Event-driven workflows
- WebSocket server (status updates)

**NIE rób tutaj:**
- UI rendering
- User session management (Clerk handles it)
- Simple CRUD that Next.js can handle

### 5.3 Shared Types (packages/types)

Współdzielone typy między frontend i backend:
- Task, Project, Workflow entities
- API request/response types
- Integration configurations

```typescript
// Import w apps/web lub apps/api
import { Task, TaskStatus, Workflow } from '@mitshe/types';
```

---

## 6. Baza Danych (Prisma)

### 6.1 Multi-Provider

Schema w `apps/api/prisma/schema.prisma` wspiera:
- **PostgreSQL** - Dev/Prod mode
- **SQLite** - Light mode (via Dockerfile sed transform)

### 6.2 Migracje

```bash
# Tworzenie migracji
just db-migrate

# Aplikowanie w produkcji
pnpm --filter @mitshe/api prisma migrate deploy

# Reset (dev only!)
pnpm --filter @mitshe/api prisma migrate reset
```

---

## 7. Environment Variables

### Root .env (shared)
```bash
# Authentication Mode: 'selfhosted' (email/password) or 'clerk' (Clerk auth)
AUTH_MODE=selfhosted
NEXT_PUBLIC_AUTH_MODE=selfhosted

# Clerk Authentication (required only if AUTH_MODE=clerk)
# CLERK_SECRET_KEY=sk_test_...
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mitshe

# Redis
REDIS_URL=redis://localhost:6379

# Security
ENCRYPTION_KEY=<openssl rand -hex 32>

# URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 8. Checklist przed Commitem

```markdown
- [ ] Czy kod przechodzi `just typecheck`?
- [ ] Czy kod przechodzi `just lint`?
- [ ] Czy dodałeś testy dla nowej funkcjonalności?
- [ ] Czy zaktualizowałeś CLAUDE.md jeśli zmieniłeś architekturę?
- [ ] Czy zaktualizowałeś packages/types jeśli dodałeś nowe typy?
- [ ] Czy nowy adapter implementuje odpowiedni Port?
- [ ] Czy dodałeś obsługę błędów?
- [ ] Czy nie ma hardcoded secrets?
```

---

## 9. Ważne Zasady

### 9.1 BYOK (Bring Your Own Key)

Klienci podają własne API keys dla AI:
- Keys są szyfrowane AES-256-GCM
- Przechowywane w `AICredential` tabeli
- NIGDY nie logujemy kluczy
- Deszyfrujemy tylko w momencie użycia

### 9.2 Pragmatyzm w Architekturze

**Abstrakcja (Ports & Adapters) dla:**
- Issue trackers (JIRA, YouTrack, Linear)
- Git providers (GitLab, GitHub)
- AI providers (Claude, OpenAI, local)
- Notifications (Slack, Teams, Email)

**BEZ abstrakcji dla:**
- Database (Prisma bezpośrednio)
- Queue (BullMQ bezpośrednio)
- Auth (Clerk bezpośrednio)
- Cache (Redis bezpośrednio)

### 9.3 Event-Driven Side Effects

Nigdy nie rób side effects w command handlers. Użyj eventów:

```typescript
// BAD - side effect w command handler
async execute(command: CreateTaskCommand) {
  const task = await this.taskRepository.save(task);
  await this.slackService.notify('Task created'); // ❌ Side effect!
  return task;
}

// GOOD - emit event, handle in event handler
async execute(command: CreateTaskCommand) {
  const task = await this.taskRepository.save(task);
  this.eventBus.publish(new TaskCreatedEvent(task)); // ✅ Event
  return task;
}

// Event handler handles side effect
@EventsHandler(TaskCreatedEvent)
class OnTaskCreated {
  handle(event: TaskCreatedEvent) {
    await this.slackService.notify('Task created'); // ✅ Osobny handler
  }
}
```

---

## 10. Linki do Dokumentacji

- [README.md](./README.md) - Quick start, commands
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development workflow, PR guidelines
- [Clerk Docs](https://clerk.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NestJS CQRS](https://docs.nestjs.com/recipes/cqrs)
- [BullMQ](https://docs.bullmq.io/)
- [shadcn/ui](https://ui.shadcn.com/)
- [React Flow](https://reactflow.dev/)
- [Turborepo](https://turbo.build/repo/docs)

---

*Ostatnia aktualizacja: 2026-04-01*
