# Design Patterns & UX/UI Guidelines

## 1. Design Philosophy

### 1.1 Inspiracje

**Linear App** - nasz główny wzorzec:
- Minimalistyczny, bez clutteru
- Keyboard-first (Cmd+K command palette)
- Błyskawiczna wydajność (<3s load time)
- "Inverted L-shape" layout (sidebar + top nav)
- Role-specific views
- Ciemny motyw jako domyślny

**Kluczowe zasady:**
- Speed over features
- Keyboard shortcuts dla power users
- Progressive disclosure (ukryj złożoność)
- Consistency across all screens
- Mobile-responsive ale desktop-first

### 1.2 Design Tokens

```typescript
// design-tokens.ts
const tokens = {
  colors: {
    // Semantic colors
    primary: 'hsl(262, 83%, 58%)',      // Purple (jak Linear)
    secondary: 'hsl(215, 20%, 65%)',

    // Status colors
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(38, 92%, 50%)',
    error: 'hsl(0, 84%, 60%)',
    info: 'hsl(199, 89%, 48%)',

    // Task status
    todo: 'hsl(215, 20%, 65%)',
    inProgress: 'hsl(38, 92%, 50%)',
    inReview: 'hsl(262, 83%, 58%)',
    done: 'hsl(142, 76%, 36%)',
    failed: 'hsl(0, 84%, 60%)',

    // Backgrounds
    bgPrimary: 'hsl(220, 13%, 10%)',    // Dark
    bgSecondary: 'hsl(220, 13%, 14%)',
    bgTertiary: 'hsl(220, 13%, 18%)',
    bgHover: 'hsl(220, 13%, 22%)',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },

  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    fontMono: 'JetBrains Mono, Menlo, monospace',
  },
};
```

---

## 2. UI Components (Mobbin Glossary Based)

### 2.1 Navigation & Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  SIDEBAR (collapsible)        │  TOP NAV BAR                    │
│  ─────────────────────        │  ────────────                   │
│  • Logo                       │  • Breadcrumbs                  │
│  • Workspace selector         │  • Search (Cmd+K)               │
│  • Main nav items             │  • Notifications                │
│  • Projects list              │  • User menu                    │
│  • Settings (bottom)          │                                 │
├───────────────────────────────┼─────────────────────────────────┤
│                               │                                 │
│                               │  MAIN CONTENT AREA              │
│                               │                                 │
│                               │  • Page header                  │
│                               │  • Filters/actions bar          │
│                               │  • Content (table/cards/etc)    │
│                               │                                 │
└───────────────────────────────┴─────────────────────────────────┘
```

**Sidebar States:**
- Expanded (default on desktop)
- Collapsed (icon-only)
- Hidden (mobile, trigger via hamburger)

**Keyboard Shortcuts:**
| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Command palette |
| `Cmd+/` | Toggle sidebar |
| `Cmd+N` | New task |
| `Cmd+F` | Search |
| `Esc` | Close modal/panel |
| `?` | Show all shortcuts |

### 2.2 Dialogs & Modals

**Kiedy używać:**
- Potwierdzenia (delete, logout)
- Krótkie formularze (add API key)
- Krytyczne decyzje

**Kiedy NIE używać:**
- Złożone formularze (użyj osobnej strony)
- Informacyjne komunikaty (użyj Toast)
- Opcjonalne treści (użyj inline)

**Warianty:**
```typescript
type DialogVariant =
  | 'default'      // Neutralna akcja
  | 'destructive'  // Czerwony przycisk, delete/remove
  | 'info'         // Tylko informacja, jeden przycisk
  | 'form'         // Z inputami
```

**Anatomia:**
```
┌─────────────────────────────────┐
│  [X] Close button (optional)    │
│                                 │
│  Title                          │
│  Description (optional)         │
│                                 │
│  [Content / Form]               │
│                                 │
│  ─────────────────────────────  │
│  [Cancel]           [Confirm]   │
└─────────────────────────────────┘
```

### 2.3 Chips/Tags (Task Status, Labels)

**Użycie w naszej aplikacji:**
- Status zadania (Todo, In Progress, Review, Done)
- Labels (AI, Bug, Feature)
- Filtry
- Integracje (JIRA, GitLab, Slack)

**Warianty:**
```typescript
type ChipVariant =
  | 'filled'     // Solid background
  | 'outlined'   // Border only
  | 'subtle'     // Light background

type ChipSize = 'sm' | 'md' | 'lg'

interface Chip {
  label: string;
  variant: ChipVariant;
  color?: string;          // Status color
  leadingIcon?: ReactNode; // Icon/avatar
  trailingIcon?: ReactNode;// Remove X or dropdown caret
  dismissible?: boolean;
}
```

**Status Chips:**
```
[○ Todo]      - Gray, outlined
[◐ In Progress] - Yellow, filled
[◉ In Review]   - Purple, filled
[✓ Done]        - Green, filled
[✕ Failed]      - Red, filled
```

### 2.4 Cards (Task Cards, Project Cards)

```
┌─────────────────────────────────────────┐
│  [Icon] Task Title              [Menu]  │
│  ───────────────────────────────────    │
│  Short description or preview...        │
│                                         │
│  [Status Chip] [Label] [Label]          │
│                                         │
│  ─────────────────────────────────────  │
│  [Avatar] Assignee  •  2h ago  •  #123  │
└─────────────────────────────────────────┘
```

### 2.5 Tables (Task List, Logs)

**Features:**
- Sortable columns
- Filterable
- Selectable rows
- Pagination or infinite scroll
- Row actions (hover reveal)

```
┌──────────────────────────────────────────────────────────────┐
│ [□] │ Task         │ Status      │ Project  │ Updated │ ... │
├──────────────────────────────────────────────────────────────┤
│ [□] │ Fix login    │ [In Review] │ Web App  │ 2h ago  │ ⋮   │
│ [□] │ Add API      │ [Done]      │ Backend  │ 1d ago  │ ⋮   │
│ [□] │ Update docs  │ [Todo]      │ Docs     │ 3d ago  │ ⋮   │
└──────────────────────────────────────────────────────────────┘
```

### 2.6 Toasts & Notifications

**Types:**
```typescript
type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  duration?: number; // ms, default 5000
  dismissible?: boolean;
}
```

**Pozycjonowanie:** Bottom-right (default)

**Przykłady:**
```
✓ Task completed successfully
✕ Failed to create MR: Connection timeout
⚠ AI analysis taking longer than expected...
ℹ New comment on PROJ-123
```

### 2.7 Empty States

**Użycie:** Gdy brak danych do wyświetlenia

```
┌─────────────────────────────────────────┐
│                                         │
│           [Illustration]                │
│                                         │
│         No tasks yet                    │
│                                         │
│   Add your first AI-powered task        │
│   or connect a project.                 │
│                                         │
│         [+ Create Task]                 │
│                                         │
└─────────────────────────────────────────┘
```

### 2.8 Loading States

**Typy:**
- **Skeleton** - dla content loading (listy, karty)
- **Spinner** - dla akcji (submit, fetch)
- **Progress bar** - dla długich operacji (AI processing)

**AI Processing State:**
```
┌─────────────────────────────────────────┐
│                                         │
│  [Animated AI Icon]                     │
│                                         │
│  AI is analyzing task...                │
│  ████████████░░░░░░░░  60%              │
│                                         │
│  Current step: Researching codebase     │
│                                         │
│  [View logs]                [Cancel]    │
│                                         │
└─────────────────────────────────────────┘
```

### 2.9 Forms & Inputs

**Text Fields:**
- Label (above)
- Placeholder (inside, subtle)
- Helper text (below)
- Error state (red border + error message)
- Disabled state (grayed out)

**API Key Input:**
```
┌─────────────────────────────────────────┐
│  Claude API Key                         │
│  ┌─────────────────────────────────┐    │
│  │ sk-ant-api03-...         [👁] [📋]│   │
│  └─────────────────────────────────┘    │
│  Your key is encrypted and stored       │
│  securely. We never log or expose it.   │
└─────────────────────────────────────────┘
```

---

## 3. Page Layouts

### 3.1 Dashboard (Home)

```
┌─────────────────────────────────────────────────────────────────┐
│  Welcome back, Jakub                              [Cmd+K] [🔔]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Active Tasks │ │ Completed    │ │ Failed       │            │
│  │     12       │ │     47       │ │     3        │            │
│  │ +3 today     │ │ +8 today     │ │ -2 vs last   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  Recent Activity                                    [View all]  │
│  ─────────────────────────────────────────────────────────────  │
│  │ ✓ PROJ-123 completed • MR merged • 2h ago                   │
│  │ ◐ PROJ-456 in progress • Analyzing code • 10m ago           │
│  │ ✕ PROJ-789 failed • Needs human help • 1h ago               │
│                                                                 │
│  Active AI Agents                                               │
│  ─────────────────────────────────────────────────────────────  │
│  │ [████████░░] PROJ-456 • Developer Agent • 80%               │
│  │ [██░░░░░░░░] PROJ-012 • Researcher Agent • 20%              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Tasks List

```
┌─────────────────────────────────────────────────────────────────┐
│  Tasks                                       [+ New Task] [⚙]   │
├─────────────────────────────────────────────────────────────────┤
│  [All] [Active] [Completed] [Failed]         🔍 Search tasks    │
│                                                                 │
│  Filters: [Project ▼] [Status ▼] [Assignee ▼]    [Clear all]   │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ □ │ PROJ-123 │ Fix login bug     │ [Done]    │ 2h ago   │   │
│  │ □ │ PROJ-456 │ Add dark mode     │ [Review]  │ 10m ago  │   │
│  │ □ │ PROJ-789 │ Refactor API      │ [Failed]  │ 1h ago   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Showing 1-10 of 47 tasks              [< Prev] [1] [2] [Next >]│
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Task Detail

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Tasks                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PROJ-123: Fix login validation bug                [Edit] [⋮]  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Status: [In Review]    Project: Web App    Priority: High     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Description                                              │   │
│  │ ─────────────────────────────────────────────────────── │   │
│  │ Users are getting "Invalid email" error even with       │   │
│  │ valid emails. This happens only in Safari browser.      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  AI Analysis                                        [Rerun AI]  │
│  ─────────────────────────────────────────────────────────────  │
│  │ ✓ Root cause identified: Regex incompatibility          │   │
│  │ ✓ Files affected: src/utils/validation.ts (line 42)     │   │
│  │ ✓ Fix applied and tested                                │   │
│  │ ✓ MR created: !456                                       │   │
│                                                                 │
│  Merge Request                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  │ [GitLab] !456 - Fix Safari email validation              │   │
│  │ Status: Open • 2 files changed • +12 -3 lines            │   │
│  │ [View MR] [Approve] [Request Changes]                    │   │
│                                                                 │
│  Activity Log                                       [View all]  │
│  ─────────────────────────────────────────────────────────────  │
│  │ 10:30 AI created MR !456                                 │   │
│  │ 10:25 Developer Agent completed                          │   │
│  │ 10:20 Security Agent passed                              │   │
│  │ 10:15 Researcher Agent identified root cause             │   │
│  │ 10:00 Task received from JIRA                            │   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Settings - Integrations

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings                                                       │
├─────────────────────────────────────────────────────────────────┤
│  [Profile] [Integrations] [API Keys] [Team] [Billing]          │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Issue Trackers                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [JIRA Logo] JIRA Cloud              [Connected] [⚙] [×] │   │
│  │ workspace.atlassian.net • 12 projects synced            │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [YouTrack Logo] YouTrack                    [+ Connect] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Git Providers                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [GitLab Logo] GitLab                [Connected] [⚙] [×] │   │
│  │ gitlab.com/org • 8 repos connected                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Notifications                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Slack Logo] Slack                  [Connected] [⚙] [×] │   │
│  │ #dev-channel, #alerts                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Settings - API Keys

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings > API Keys                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AI Provider                                                    │
│  ─────────────────────────────────────────────────────────────  │
│  Your API key is used to process tasks. We encrypt and store   │
│  it securely. You pay for your own AI usage.                   │
│                                                                 │
│  Provider: [Claude (Anthropic) ▼]                              │
│                                                                 │
│  API Key:                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ sk-ant-api03-****************************Xk2     [👁][📋]│   │
│  └─────────────────────────────────────────────────────────┘   │
│  Last used: 2 hours ago • Verified ✓                           │
│                                                                 │
│  [Test Connection]                      [Update Key] [Remove]   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ⚠ Using Claude API directly costs ~$3-15 per 1M tokens.       │
│  For heavy usage, consider Claude Code prepaid plan.           │
│  [Learn about local worker setup →]                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Clerk Permissions Model

### 4.1 Organization Structure

```
Organization (Team/Company)
├── Owner (org:admin)
│   └── Full access, billing, delete org
├── Admin (org:admin)
│   └── Manage members, settings, integrations
├── Developer (org:developer) [custom]
│   └── Create/manage tasks, view projects
├── Viewer (org:viewer) [custom]
│   └── Read-only access
└── Billing (org:billing) [custom]
    └── Only billing/subscription access
```

### 4.2 Custom Permissions

```typescript
// Clerk custom permissions
const permissions = {
  // Tasks
  'org:tasks:create': 'Create new tasks',
  'org:tasks:read': 'View tasks',
  'org:tasks:update': 'Edit tasks',
  'org:tasks:delete': 'Delete tasks',
  'org:tasks:assign': 'Assign tasks to AI',

  // Projects
  'org:projects:create': 'Create projects',
  'org:projects:read': 'View projects',
  'org:projects:update': 'Edit projects',
  'org:projects:delete': 'Delete projects',

  // Integrations
  'org:integrations:manage': 'Connect/disconnect integrations',
  'org:integrations:read': 'View integrations',

  // API Keys
  'org:apikeys:manage': 'Manage AI API keys',
  'org:apikeys:read': 'View API key status',

  // Team
  'org:members:invite': 'Invite new members',
  'org:members:remove': 'Remove members',
  'org:members:manage_roles': 'Change member roles',

  // Billing
  'org:billing:manage': 'Manage subscription',
  'org:billing:read': 'View billing info',

  // Settings
  'org:settings:manage': 'Manage org settings',
};

// Role -> Permission mapping
const roles = {
  'org:admin': ['*'], // All permissions

  'org:developer': [
    'org:tasks:*',
    'org:projects:read',
    'org:integrations:read',
    'org:apikeys:read',
  ],

  'org:viewer': [
    'org:tasks:read',
    'org:projects:read',
  ],

  'org:billing': [
    'org:billing:*',
  ],
};
```

### 4.3 Subscription Tiers (Clerk Billing)

```typescript
const subscriptionPlans = {
  free: {
    name: 'Free',
    price: 0,
    limits: {
      tasksPerMonth: 10,
      projects: 2,
      teamMembers: 1,
      integrations: 1,
    },
    features: [
      'Basic AI task automation',
      '1 integration (JIRA or GitHub)',
      'Community support',
    ],
  },

  pro: {
    name: 'Pro',
    price: 29, // /month
    limits: {
      tasksPerMonth: 100,
      projects: 10,
      teamMembers: 5,
      integrations: 'unlimited',
    },
    features: [
      'Everything in Free',
      'Unlimited integrations',
      'Priority AI processing',
      'Slack notifications',
      'Email support',
    ],
  },

  team: {
    name: 'Team',
    price: 79, // /month
    limits: {
      tasksPerMonth: 500,
      projects: 'unlimited',
      teamMembers: 20,
      integrations: 'unlimited',
    },
    features: [
      'Everything in Pro',
      'Multi-agent workflows',
      'Custom AI prompts',
      'Audit logs',
      'Priority support',
    ],
  },

  enterprise: {
    name: 'Enterprise',
    price: 'custom',
    limits: {
      tasksPerMonth: 'unlimited',
      projects: 'unlimited',
      teamMembers: 'unlimited',
      integrations: 'unlimited',
    },
    features: [
      'Everything in Team',
      'Local worker support',
      'SSO/SAML',
      'Dedicated support',
      'Custom SLA',
    ],
  },
};
```

### 4.4 Permission Checks in Code

```typescript
// Frontend (React component)
import { Protect } from '@clerk/nextjs';

function TaskActions({ taskId }: { taskId: string }) {
  return (
    <>
      <Protect permission="org:tasks:read">
        <ViewTaskButton taskId={taskId} />
      </Protect>

      <Protect permission="org:tasks:update">
        <EditTaskButton taskId={taskId} />
      </Protect>

      <Protect permission="org:tasks:delete">
        <DeleteTaskButton taskId={taskId} />
      </Protect>
    </>
  );
}

// Backend (Next.js API route)
import { auth } from '@clerk/nextjs/server';

export async function DELETE(req: Request) {
  const { has } = await auth();

  if (!has({ permission: 'org:tasks:delete' })) {
    return new Response('Forbidden', { status: 403 });
  }

  // Delete task...
}
```

---

## 5. Next.js vs NestJS Responsibility Split

### 5.1 Filozofia podziału

```
┌─────────────────────────────────────────────────────────────────┐
│                         NEXT.JS                                 │
│                    (Frontend + Light Backend)                   │
│  ─────────────────────────────────────────────────────────────  │
│  • UI/UX rendering (React)                                     │
│  • Authentication (Clerk)                                       │
│  • Simple CRUD (Server Actions)                                 │
│  • Form handling & validation                                   │
│  • Real-time UI updates (optimistic)                           │
│  • Session management                                           │
│  • Billing UI (Clerk/Stripe)                                   │
│                                                                 │
│  ZASADA: Jeśli to proste i user-facing → Next.js               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         NESTJS                                  │
│                    (Heavy Backend + Workers)                    │
│  ─────────────────────────────────────────────────────────────  │
│  • AI Agent orchestration                                       │
│  • Background job processing (BullMQ)                          │
│  • External API integrations (JIRA, GitLab, Slack)             │
│  • Webhook processing                                           │
│  • Long-running tasks                                           │
│  • Event-driven workflows                                       │
│  • Git operations (clone, commit, push)                        │
│  • MCP server connections                                       │
│                                                                 │
│  ZASADA: Jeśli to długie, złożone, lub background → NestJS     │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Konkretny podział

| Funkcjonalność | Next.js | NestJS | Dlaczego |
|----------------|---------|--------|----------|
| **Auth (login/logout)** | ✅ | ❌ | Clerk działa w Next.js |
| **User profile CRUD** | ✅ | ❌ | Proste, user-facing |
| **Project settings CRUD** | ✅ | ❌ | Proste, user-facing |
| **Task list/detail view** | ✅ | ❌ | UI, read operations |
| **Create task (manual)** | ✅ | ❌ | Prosty form |
| **JIRA webhook receive** | ❌ | ✅ | Wymaga processing |
| **AI task processing** | ❌ | ✅ | Long-running, background |
| **GitLab MR creation** | ❌ | ✅ | External API, complex |
| **Slack notifications** | ❌ | ✅ | External integration |
| **Job queue management** | ❌ | ✅ | BullMQ, workers |
| **Real-time task status** | ✅ (receive) | ✅ (emit) | WebSocket both ends |
| **Billing/subscription** | ✅ | ❌ | Clerk Billing |
| **API key encryption** | ❌ | ✅ | Security-critical |
| **Integration OAuth flows** | ✅ (redirect) | ✅ (token exchange) | Split |

### 5.3 Communication Patterns

```typescript
// ═══════════════════════════════════════════════════════════════
// NEXT.JS → NESTJS (Task submission)
// ═══════════════════════════════════════════════════════════════

// Next.js Server Action
async function createTask(formData: FormData) {
  'use server';

  const { userId, orgId } = await auth();

  // 1. Validate & save to DB (Next.js - simple CRUD)
  const task = await prisma.task.create({
    data: {
      title: formData.get('title'),
      description: formData.get('description'),
      orgId,
      createdBy: userId,
      status: 'PENDING',
    },
  });

  // 2. Send to NestJS for processing (HTTP call)
  await fetch(`${NESTJS_URL}/api/tasks/process`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getInternalToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ taskId: task.id }),
  });

  return task;
}

// ═══════════════════════════════════════════════════════════════
// NESTJS → NEXT.JS (Status updates via WebSocket)
// ═══════════════════════════════════════════════════════════════

// NestJS emits events
@Injectable()
class TaskProcessorService {
  constructor(
    private readonly wsGateway: WebSocketGateway,
  ) {}

  async processTask(taskId: string) {
    // Emit: task started
    this.wsGateway.emitToOrg(task.orgId, 'task:status', {
      taskId,
      status: 'IN_PROGRESS',
      step: 'Researcher analyzing...',
    });

    // ... AI processing ...

    // Emit: task completed
    this.wsGateway.emitToOrg(task.orgId, 'task:status', {
      taskId,
      status: 'COMPLETED',
      result: { mrUrl: '...' },
    });
  }
}

// Next.js receives via useEffect
function TaskStatusListener({ taskId }: { taskId: string }) {
  const [status, setStatus] = useState<TaskStatus>();

  useEffect(() => {
    const socket = io(NESTJS_WS_URL);

    socket.on('task:status', (data) => {
      if (data.taskId === taskId) {
        setStatus(data);
      }
    });

    return () => socket.disconnect();
  }, [taskId]);

  return <TaskStatusBadge status={status} />;
}
```

### 5.4 API Structure

```
NEXT.JS (app/api/)
├── /api/auth/[...clerk]     # Clerk webhooks
├── /api/trpc/[trpc]         # tRPC (optional, for complex queries)
└── /api/billing/webhook     # Stripe webhooks

Server Actions (app/actions/)
├── tasks.ts                 # createTask, updateTask
├── projects.ts              # CRUD projects
├── settings.ts              # User/org settings
└── integrations.ts          # Connect/disconnect (OAuth start)

NESTJS (src/)
├── /api/webhooks/jira       # JIRA webhook endpoint
├── /api/webhooks/gitlab     # GitLab webhook endpoint
├── /api/tasks/process       # Internal: start AI processing
├── /api/tasks/:id/cancel    # Cancel running task
├── /api/integrations/oauth  # OAuth callback handling
└── /ws                      # WebSocket gateway
```

### 5.5 Shared Types (Monorepo)

```typescript
// packages/shared/src/types/task.ts
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  orgId: string;
  projectId: string;
  externalIssueId?: string;
  externalIssueUrl?: string;
  result?: TaskResult;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface TaskResult {
  success: boolean;
  mrUrl?: string;
  analysis?: string;
  error?: string;
  agentLogs?: AgentLog[];
}

// Used by both Next.js and NestJS
```

---

## 6. Component Library

### 6.1 Rekomendacja: shadcn/ui

**Dlaczego shadcn/ui:**
- Copy-paste components (nie npm dependency)
- Pełna kontrola nad kodem
- Tailwind-based
- Radix UI primitives (accessibility)
- Łatwa customizacja

**Instalacja:**
```bash
npx shadcn@latest init
npx shadcn@latest add button card dialog input select table toast
```

### 6.2 Custom Components (do stworzenia)

```
components/
├── ui/                      # shadcn/ui base
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── app/                     # App-specific
│   ├── task-card.tsx
│   ├── task-status-badge.tsx
│   ├── task-table.tsx
│   ├── integration-card.tsx
│   ├── api-key-input.tsx
│   ├── command-palette.tsx
│   ├── ai-progress-indicator.tsx
│   └── activity-log.tsx
├── layout/
│   ├── sidebar.tsx
│   ├── top-nav.tsx
│   ├── page-header.tsx
│   └── app-shell.tsx
└── forms/
    ├── task-form.tsx
    ├── project-form.tsx
    └── settings-form.tsx
```

---

## 7. Sources

- [Mobbin Design Glossary](https://mobbin.com/glossary)
- [Linear App](https://linear.app/) - UI/UX inspiration
- [How Linear redesigned their UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Clerk Organizations](https://clerk.com/docs/organizations/overview)
- [Clerk Roles & Permissions](https://clerk.com/docs/guides/organizations/roles-and-permissions)
- [Clerk Billing](https://clerk.com/newsletter/2025-05-30)
- [Next.js Server Actions vs API Routes](https://medium.com/@shavaizali159/next-js-api-routes-vs-server-actions-which-one-to-use-and-why-809f09d5069b)
- [Next.js Background Jobs Limitations](https://github.com/vercel/next.js/discussions/33989)
- [SaaS UI Design Patterns](https://www.saasui.design/)
- [shadcn/ui](https://ui.shadcn.com/)
