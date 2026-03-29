# Compact Summary - AI Task Automation Platform

> Stan na: 2025-12-02
> Cel: Kontekst do przeniesienia do nowej konwersacji

---

## 1. Struktura Projektu

```
/Users/jakub/Documents/ai/
├── ai-tasks-web/          # Frontend (Next.js 15)
├── ai-tasks-api/          # Backend (NestJS)
├── CLAUDE.md              # Główne instrukcje projektu
├── research.md            # Research techniczny
├── design-patterns.md     # UX/UI patterns
└── compact.md             # Ten plik
```

**Dlaczego 2 repozytoria:**
- Niezależne deploye (Vercel + Railway)
- Loose coupling (HTTP/WebSocket)
- Różne cykle życia

---

## 2. Stack Technologiczny

### Frontend (ai-tasks-web)
```
Next.js 15 + React 19 + TypeScript
UI: shadcn/ui + Tailwind CSS v4 + Radix UI
State: Zustand + TanStack Query
Auth: Clerk (Organizations + RBAC)
Payments: Clerk Billing (Stripe)
Real-time: Socket.io client
Workflow Editor: @xyflow/react (React Flow) + Dagre
```

### Backend (ai-tasks-api)
```
NestJS + TypeScript
DB: PostgreSQL + Prisma ORM
Queue: BullMQ + Redis
Auth: Clerk (token verification)
WebSocket: Socket.io
Git: simple-git
Docker: dockerode (workflow execution)
```

---

## 3. Architektura

### Hexagonal (Ports & Adapters)
```
src/ports/           → Interfejsy (IssueTrackerPort, GitProviderPort, AIProviderPort, NotificationPort)
src/infrastructure/adapters/  → Implementacje (JiraAdapter, GitLabAdapter, ClaudeAdapter, SlackAdapter...)
```

### CQRS (Commands/Queries)
```
src/application/commands/    → Write operations (CreateTaskCommand, ProcessTaskCommand)
src/application/queries/     → Read operations (GetTaskQuery, ListTasksQuery)
src/application/events/      → Event handlers (OnTaskCreated, OnMRCreated)
```

### Event-Driven
```
src/domain/events/    → Domain events (TaskCreatedEvent, TaskCompletedEvent, MergeRequestCreatedEvent)
```

**WAŻNE:** Warstwa Application (CQRS) jest obecnie PUSTA - to główny bloker!

---

## 4. Zaimplementowane Funkcjonalności

### Frontend ✅
| Strona | Ścieżka | Status |
|--------|---------|--------|
| Dashboard | `/dashboard` | ✅ |
| Projects | `/projects`, `/projects/[id]` | ✅ |
| Tasks | `/tasks`, `/tasks/[id]` | ✅ |
| Workflows | `/workflows`, `/workflows/[id]/edit` | ✅ |
| Executions | `/workflows/[id]/executions` | ✅ |
| Settings | `/settings/*` (integrations, api-keys, billing, team, ai-providers, repositories) | ✅ |
| Documentation | `/docs`, `/docs/api` | ✅ |
| Auth | `/sign-in`, `/sign-up` | ✅ |

**Komponenty:**
- Workflow Editor z React Flow (drag & drop nodes)
- Command Palette (⌘K)
- Theme switching (dark/light)
- Real-time status indicator (WebSocket)

### Backend ✅
| Moduł | Kontroler | Status |
|-------|-----------|--------|
| Tasks | `tasks.controller.ts` | ✅ |
| Projects | `projects.controller.ts` | ✅ |
| Workflows | `workflows.controller.ts` | ✅ |
| Integrations | `integrations.controller.ts` | ✅ |
| Repositories | `repositories.controller.ts` | ✅ |
| AI Credentials | `ai-credentials.controller.ts` | ✅ |
| API Keys | `api-keys.controller.ts` | ✅ |
| Webhooks | JIRA, GitLab, GitHub | ✅ |

**Adaptery (Ports & Adapters):**
- AI: `ClaudeAPIAdapter`, `OpenAIAdapter`, `ClaudeCodeLocalAdapter`
- Git: `GitLabAdapter`, `GitHubAdapter`
- Issue Tracker: `JiraAdapter`, `YouTrackAdapter`
- Notifications: `SlackAdapter`
- Knowledge Base: `ObsidianAdapter`

**Infrastruktura:**
- WebSocket Gateway (Socket.io)
- BullMQ Queue setup (ale brak processors!)
- Prisma ORM (13 modeli)
- Git Operations Service
- Docker Executor (workflow execution)
- Encryption Service (AES-256 dla API keys)

---

## 5. Brakujące Elementy (Blokery Produkcyjne)

### 🔴 KRYTYCZNE

1. **Warstwa Application (CQRS) - PUSTA**
   ```
   src/application/commands/handlers/  → BRAK
   src/application/queries/handlers/   → BRAK
   src/application/events/handlers/    → BRAK
   ```
   Kontrolery wywołują serwisy bezpośrednio, zamiast przez command bus.

2. **BullMQ Job Processors - BRAK**
   - Queue jest skonfigurowana, ale brak workerów
   - Async task processing nie działa
   - Workflow execution nie zadziała

3. **Migracje DB - BRAK**
   - Jest tylko `schema.prisma`
   - Brak wygenerowanych migration files
   - `npx prisma migrate dev` nie było uruchomione

### 🟠 WYSOKIE

4. **Testy - MINIMALNE**
   - Frontend: 2 pliki testowe (~5% coverage)
   - Backend: 5 plików .spec.ts (~20% coverage)
   - Brak testów E2E

5. **Error Handling**
   - Brak structured error responses
   - Brak global exception filter z proper formatting

6. **Logging**
   - Brak Winston/Pino
   - Brak structured logging
   - Brak correlation IDs

### 🟡 ŚREDNIE

7. **Rate Limiting** - `@nestjs/throttler` zainstalowany, nie skonfigurowany
8. **Validation** - `class-validator` zainstalowany, nie wszędzie użyty
9. **OpenAPI/Swagger** - Częściowo skonfigurowany
10. **Health Checks** - Brak Kubernetes-ready probes
11. **Monitoring** - Brak Prometheus/Grafana

---

## 6. Prisma Schema (Kluczowe Modele)

```prisma
model Organization {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  name      String
}

model Project {
  id              String   @id @default(cuid())
  organizationId  String
  name            String
  repoUrl         String?
}

model Task {
  id              String     @id @default(cuid())
  organizationId  String
  projectId       String
  title           String
  status          TaskStatus  // PENDING, IN_PROGRESS, COMPLETED, FAILED
  externalIssueId String?     // JIRA-123
}

model Workflow {
  id              String   @id @default(cuid())
  organizationId  String
  name            String
  definition      Json     // Node/Edge structure
  isActive        Boolean
}

model Integration {
  id              String   @id @default(cuid())
  organizationId  String
  type            IntegrationType  // JIRA, GITLAB, GITHUB, SLACK...
  config          Bytes    // Encrypted JSON
}

model AICredential {
  id              String   @id @default(cuid())
  organizationId  String
  provider        AIProvider  // CLAUDE, OPENAI
  encryptedKey    Bytes
}
```

---

## 7. Workflow Engine

### Node Types
```typescript
// Triggers
'trigger:manual' | 'trigger:schedule' | 'trigger:jira:webhook' | 'trigger:gitlab:webhook'

// AI Agents
'ai:analyze' | 'ai:developer' | 'ai:reviewer' | 'ai:tester' | 'ai:security'

// Actions
'action:jira:update' | 'action:gitlab:mr' | 'action:slack:notify'

// Control Flow
'control:condition' | 'control:parallel' | 'control:loop'
```

### Workflow Definition (JSON)
```json
{
  "nodes": [
    { "id": "trigger1", "type": "trigger:manual", "name": "Start", "config": {} },
    { "id": "ai1", "type": "ai:analyze", "name": "Analyze Task", "config": { "prompt": "..." } }
  ],
  "edges": [
    { "id": "e1", "source": "trigger1", "target": "ai1" }
  ]
}
```

---

## 8. Konwencje Kodu

### Nazewnictwo Plików
```
user.entity.ts          # Entity
create-task.command.ts  # Command
task.repository.ts      # Repository
jira.adapter.ts         # Adapter
issue-tracker.port.ts   # Port (interface)
```

### Error Handling
```typescript
// Domain errors
class TaskNotFoundError extends DomainError {
  constructor(taskId: string) {
    super(`Task ${taskId} not found`);
  }
}

// Result pattern dla expected failures
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
```

### Event-Driven Side Effects
```typescript
// ❌ ZŁE - side effect w command handler
async execute(command: CreateTaskCommand) {
  const task = await this.taskRepository.save(task);
  await this.slackService.notify('Task created'); // Side effect!
  return task;
}

// ✅ DOBRE - emit event, handle w event handler
async execute(command: CreateTaskCommand) {
  const task = await this.taskRepository.save(task);
  this.eventBus.publish(new TaskCreatedEvent(task));
  return task;
}
```

---

## 9. Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### Backend (.env)
```bash
PORT=3001
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
CLERK_SECRET_KEY=sk_...
ENCRYPTION_KEY=...  # AES-256 dla API keys
```

---

## 10. Komendy

### Frontend
```bash
cd ai-tasks-web
npm run dev          # Dev server :3000
npm run build        # Production build
npm run lint         # ESLint
```

### Backend
```bash
cd ai-tasks-api
npm run start:dev    # Dev server :3001
npm run build        # Production build
docker-compose up -d # PostgreSQL + Redis
```

### Prisma
```bash
npx prisma generate  # Generate client
npx prisma migrate dev --name init  # Create migration
npx prisma studio    # DB GUI
```

---

## 11. Następne Kroki (Priorytet)

1. **Zaimplementować warstwę Application (CQRS)**
   - Command handlers dla wszystkich operacji write
   - Query handlers dla operacji read
   - Event handlers dla side effects

2. **Dodać BullMQ Job Processors**
   - Task processing worker
   - Workflow execution worker
   - Notification worker

3. **Wygenerować migracje Prisma**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Dodać testy**
   - Unit tests dla command/query handlers
   - Integration tests dla kontrolerów
   - E2E tests dla krytycznych ścieżek

5. **Structured logging**
   - Winston/Pino z correlation IDs
   - Request/response logging

---

## 12. Ważne Pliki

### Frontend
```
src/app/                          # Next.js App Router pages
src/components/ui/                # shadcn/ui components
src/components/workflow-editor/   # React Flow editor
src/lib/api-client.ts            # HTTP client do API
src/lib/socket-client.ts         # WebSocket client
src/stores/                      # Zustand stores
```

### Backend
```
src/modules/                     # NestJS feature modules
src/ports/                       # Port interfaces
src/infrastructure/adapters/     # Adapter implementations
src/infrastructure/prisma/       # Prisma service
src/infrastructure/queue/        # BullMQ setup
src/infrastructure/websocket/    # Socket.io gateway
src/domain/entities/             # Domain entities
src/domain/events/               # Domain events
prisma/schema.prisma             # Database schema
```

---

## 13. Znane Problemy

1. **API docs page** - sidebar scrolling naprawiony (sticky + h-screen)
2. **Workflow editor** - działa, ale brak execution engine
3. **Integracje** - adaptery istnieją, ale nie są w pełni przetestowane
4. **BYOK model** - szyfrowanie działa, ale brak rotation mechanism

---

*Ostatnia aktualizacja: 2025-12-02*
