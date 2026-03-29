
🔬 Deep Research Report: AI Task Automation Platform

  1. Czy istnieją już podobne rozwiązania?

  TAK - ale żadne nie jest kompletnym produktem jak Twoja wizja

  | Produkt                                                                           | Co robi
                                    | Czego brakuje                                              |
  |-----------------------------------------------------------------------------------|------------------
  ----------------------------------|------------------------------------------------------------|
  | https://www.cognition.ai/                                                         | Autonomiczny AI
  developer, integracja Slack/GitHub | Zamknięty, drogi ($500+/mies), brak JIRA, brak multi-agent |
  | https://sweep.dev/                                                                | GitHub Issues →
  PR automatycznie                   | Tylko GitHub, brak JIRA/YouTrack, brak Slack notifications |
  | https://github.blog/news-insights/company-news/welcome-home-agents/               | Orkiestracja
  agentów w GitHub                      | Vendor lock-in do GitHub, brak własnego hostingu           |
  | https://docs.port.io/guides/all/automatically-resolve-tickets-with-coding-agents/ | JIRA → GitHub →
  AI Agent workflow                  | Platforma, nie własny produkt                              |
  | https://github.com/rosidotidev/CrewAI-Agentic-Jira                                | JIRA + CrewAI
                                    | Open-source PoC, nie production-ready                      |

  Kluczowy wniosek:

  Nie ma produktu, który łączy:
  - ✅ JIRA/YouTrack webhooks
  - ✅ Multi-agent system (researcher, coder, designer, security, tester)
  - ✅ GitLab + GitHub
  - ✅ Slack notifications
  - ✅ MCP integrations
  - ✅ Self-hosted lub SaaS

  Twoja wizja to UNIKALNA NISZA na rynku.

  ---
  2. Czy jest to technicznie możliwe?

  TAK - wszystkie komponenty istnieją

  2.1 Multi-Agent Orchestration

  | Framework                                                                       | Język             |
   Zalety                                                        | Wady                 |
  |---------------------------------------------------------------------------------|-------------------|
  ---------------------------------------------------------------|----------------------|
  | https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk | TypeScript/Python |
   Oficjalne SDK Anthropic, pełny dostęp do narzędzi Claude Code | Nowość (2025)        |
  | https://www.langchain.com/langgraph                                             | TypeScript/Python |
   Dojrzały, graph-based, supervisor pattern                     | Steep learning curve |
  | https://www.crewai.com/                                                         | Python            |
   Role-based agents, popularne                                  | Tylko Python         |

  Rekomendacja: Claude Agent SDK + LangGraph dla TypeScript

  2.2 Dostępne integracje (API/Webhooks)

  | Serwis     | Możliwość                                                | API/SDK
                                   |
  |------------|----------------------------------------------------------|------------------------------
  ---------------------------------|
  | JIRA Cloud | Webhooks: jira:issue_created, jira:issue_updated, labels |
  https://developer.atlassian.com/cloud/jira/platform/webhooks/ |
  | YouTrack   | Webhooks, REST API                                       | Pełne wsparcie
                                   |
  | GitLab     | Create MR, push, webhooks                                |
  https://docs.gitlab.com/api/merge_requests/                   |
  | GitHub     | Create PR, push, webhooks                                | Octokit SDK
                                   |
  | Slack      | Send messages, webhooks                                  |
  https://github.com/slackapi/node-slack-sdk                    |

  2.3 MCP Servers dostępne od razu

  | MCP Server                                                           | Użycie
    |
  |----------------------------------------------------------------------|-------------------------------
  --|
  | https://github.com/upstash/context7                                  | Aktualna dokumentacja
  bibliotek |
  | https://github.com/rahulthedevil/Jira-Context-MCP                    | Kontekst ticketów JIRA
    |
  | https://mcpindex.net/en/mcpserver/modelcontextprotocol-server-gitlab | Operacje GitLab
    |
  | https://github.com/modelcontextprotocol/servers                      | Operacje GitHub
    |
  | https://github.com/modelcontextprotocol/servers                      | API testing
    |
  | https://github.com/modelcontextprotocol/servers                      | Slack messages
    |

  ---
  3. Architektura Systemu (Hexagonal + CQRS + Event-Driven)

  ZASADY:
  - Ports & Adapters dla WSZYSTKICH integracji (nie tylko AI)
  - CQRS gdzie ma sens (oddzielenie read/write)
  - Event-Driven między modułami
  - PRAGMATYZM - nie over-engineerować prostych rzeczy
  - Kod elastyczny, łatwo rozbudowywalny

  3.1 Hexagonal Architecture Overview

  ```
                            ┌─────────────────────────────────────┐
                            │           APPLICATION CORE          │
                            │  ┌───────────────────────────────┐  │
                            │  │         DOMAIN LOGIC          │  │
                            │  │  • Entities (Task, Project)   │  │
                            │  │  • Value Objects              │  │
                            │  │  • Domain Events              │  │
                            │  │  • Domain Services            │  │
                            │  └───────────────────────────────┘  │
                            │  ┌───────────────────────────────┐  │
                            │  │        APPLICATION LAYER      │  │
                            │  │  • Commands & Handlers        │  │
                            │  │  • Queries & Handlers         │  │
                            │  │  • Event Handlers             │  │
                            │  │  • Use Cases / Services       │  │
                            │  └───────────────────────────────┘  │
                            └─────────────────────────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
              ▼                           ▼                           ▼
  ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
  │    DRIVING PORTS    │   │   DRIVEN PORTS      │   │   DRIVEN PORTS      │
  │    (Primary)        │   │   (Secondary)       │   │   (Secondary)       │
  │  ─────────────────  │   │  ─────────────────  │   │  ─────────────────  │
  │  • REST API         │   │  • IssueTracker     │   │  • AIProvider       │
  │  • Webhooks         │   │  • GitProvider      │   │  • Notification     │
  │  • WebSocket        │   │  • Repository       │   │  • FileStorage      │
  │  • CLI              │   │  • Queue            │   │  • Cache            │
  └─────────────────────┘   └─────────────────────┘   └─────────────────────┘
              │                           │                           │
              ▼                           ▼                           ▼
  ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
  │      ADAPTERS       │   │      ADAPTERS       │   │      ADAPTERS       │
  │  ─────────────────  │   │  ─────────────────  │   │  ─────────────────  │
  │  • NestJS Controllers│  │  • JiraAdapter      │   │  • ClaudeAPIAdapter │
  │  • WebhookHandlers  │   │  • YouTrackAdapter  │   │  • OpenAIAdapter    │
  │  • Socket.io        │   │  • GitLabAdapter    │   │  • ClaudeCodeLocal  │
  │                     │   │  • GitHubAdapter    │   │  • SlackAdapter     │
  │                     │   │  • PrismaRepository │   │  • ResendAdapter    │
  │                     │   │  • BullMQAdapter    │   │  • S3Adapter        │
  └─────────────────────┘   └─────────────────────┘   └─────────────────────┘
  ```

  3.2 Ports (Interfejsy) - przykłady

  ```typescript
  // ═══════════════════════════════════════════════════════════════
  // ISSUE TRACKER PORT - abstrakcja na JIRA/YouTrack/Linear
  // ═══════════════════════════════════════════════════════════════

  // ports/issue-tracker.port.ts
  interface IssueTrackerPort {
    getIssue(issueId: string): Promise<Issue>;
    updateStatus(issueId: string, status: IssueStatus): Promise<void>;
    addComment(issueId: string, comment: string): Promise<void>;
    getComments(issueId: string): Promise<Comment[]>;
    addLabel(issueId: string, label: string): Promise<void>;
    getAttachments(issueId: string): Promise<Attachment[]>;
  }

  // ═══════════════════════════════════════════════════════════════
  // GIT PROVIDER PORT - abstrakcja na GitLab/GitHub/Bitbucket
  // ═══════════════════════════════════════════════════════════════

  // ports/git-provider.port.ts
  interface GitProviderPort {
    cloneRepo(repoUrl: string, branch: string): Promise<LocalRepo>;
    createBranch(repo: LocalRepo, branchName: string): Promise<void>;
    commit(repo: LocalRepo, message: string, files: string[]): Promise<void>;
    push(repo: LocalRepo, branch: string): Promise<void>;
    createMergeRequest(params: CreateMRParams): Promise<MergeRequest>;
    getMergeRequestStatus(mrId: string): Promise<MRStatus>;
  }

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATION PORT - abstrakcja na Slack/Teams/Discord/Email
  // ═══════════════════════════════════════════════════════════════

  // ports/notification.port.ts
  interface NotificationPort {
    send(notification: Notification): Promise<void>;
    sendToChannel(channelId: string, message: Message): Promise<void>;
    sendDirectMessage(userId: string, message: Message): Promise<void>;
  }

  // ═══════════════════════════════════════════════════════════════
  // AI PROVIDER PORT - abstrakcja na Claude/OpenAI/Local
  // ═══════════════════════════════════════════════════════════════

  // ports/ai-provider.port.ts
  interface AIProviderPort {
    execute(task: AgentTask): Promise<AgentResult>;
    executeStream(task: AgentTask): AsyncIterable<AgentChunk>;
    getCapabilities(): ProviderCapabilities;
    estimateCost(task: AgentTask): CostEstimate;
  }

  // ═══════════════════════════════════════════════════════════════
  // REPOSITORY PORT - abstrakcja na bazę danych
  // ═══════════════════════════════════════════════════════════════

  // ports/repository.port.ts
  interface TaskRepository {
    save(task: Task): Promise<Task>;
    findById(id: string): Promise<Task | null>;
    findByStatus(status: TaskStatus): Promise<Task[]>;
    update(task: Task): Promise<Task>;
  }

  interface ProjectRepository {
    findByComponent(component: string): Promise<Project | null>;
    findAll(): Promise<Project[]>;
  }
  ```

  3.3 Adaptery - implementacje

  ```typescript
  // ═══════════════════════════════════════════════════════════════
  // JIRA ADAPTER
  // ═══════════════════════════════════════════════════════════════

  // adapters/jira/jira.adapter.ts
  @Injectable()
  class JiraAdapter implements IssueTrackerPort {
    constructor(
      private readonly httpClient: HttpService,
      private readonly config: JiraConfig,
    ) {}

    async getIssue(issueId: string): Promise<Issue> {
      const response = await this.httpClient.get(
        `${this.config.baseUrl}/rest/api/3/issue/${issueId}`
      );
      return this.mapToIssue(response.data);
    }

    async updateStatus(issueId: string, status: IssueStatus): Promise<void> {
      await this.httpClient.post(
        `${this.config.baseUrl}/rest/api/3/issue/${issueId}/transitions`,
        { transition: { id: this.getTransitionId(status) } }
      );
    }

    private mapToIssue(data: JiraIssueResponse): Issue {
      // Map JIRA-specific response to domain Issue
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // YOUTRACK ADAPTER - ta sama logika, inny vendor
  // ═══════════════════════════════════════════════════════════════

  // adapters/youtrack/youtrack.adapter.ts
  @Injectable()
  class YouTrackAdapter implements IssueTrackerPort {
    async getIssue(issueId: string): Promise<Issue> {
      // YouTrack-specific implementation
    }
    // ... reszta metod
  }

  // ═══════════════════════════════════════════════════════════════
  // GITLAB ADAPTER
  // ═══════════════════════════════════════════════════════════════

  // adapters/gitlab/gitlab.adapter.ts
  @Injectable()
  class GitLabAdapter implements GitProviderPort {
    async createMergeRequest(params: CreateMRParams): Promise<MergeRequest> {
      const response = await this.httpClient.post(
        `/projects/${params.projectId}/merge_requests`,
        {
          source_branch: params.sourceBranch,
          target_branch: params.targetBranch,
          title: params.title,
          description: params.description,
        }
      );
      return this.mapToMergeRequest(response.data);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GITHUB ADAPTER - ta sama logika, inny vendor
  // ═══════════════════════════════════════════════════════════════

  // adapters/github/github.adapter.ts
  @Injectable()
  class GitHubAdapter implements GitProviderPort {
    constructor(private readonly octokit: Octokit) {}

    async createMergeRequest(params: CreateMRParams): Promise<MergeRequest> {
      const { data } = await this.octokit.pulls.create({
        owner: params.owner,
        repo: params.repo,
        head: params.sourceBranch,
        base: params.targetBranch,
        title: params.title,
        body: params.description,
      });
      return this.mapToMergeRequest(data);
    }
  }
  ```

  3.4 CQRS - Commands & Queries

  ```typescript
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS (Write operations)
  // ═══════════════════════════════════════════════════════════════

  // commands/process-task.command.ts
  class ProcessTaskCommand {
    constructor(
      public readonly taskId: string,
      public readonly issueId: string,
      public readonly projectId: string,
    ) {}
  }

  // commands/handlers/process-task.handler.ts
  @CommandHandler(ProcessTaskCommand)
  class ProcessTaskHandler implements ICommandHandler<ProcessTaskCommand> {
    constructor(
      private readonly issueTracker: IssueTrackerPort,
      private readonly taskRepository: TaskRepository,
      private readonly eventBus: EventBus,
    ) {}

    async execute(command: ProcessTaskCommand): Promise<void> {
      const issue = await this.issueTracker.getIssue(command.issueId);

      const task = Task.create({
        id: command.taskId,
        issueId: command.issueId,
        title: issue.title,
        description: issue.description,
      });

      await this.taskRepository.save(task);
      await this.issueTracker.updateStatus(command.issueId, 'IN_PROGRESS');

      // Emit domain event
      this.eventBus.publish(new TaskCreatedEvent(task));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES (Read operations)
  // ═══════════════════════════════════════════════════════════════

  // queries/get-task.query.ts
  class GetTaskQuery {
    constructor(public readonly taskId: string) {}
  }

  // queries/handlers/get-task.handler.ts
  @QueryHandler(GetTaskQuery)
  class GetTaskHandler implements IQueryHandler<GetTaskQuery> {
    constructor(private readonly taskRepository: TaskRepository) {}

    async execute(query: GetTaskQuery): Promise<TaskDto> {
      const task = await this.taskRepository.findById(query.taskId);
      return TaskDto.fromDomain(task);
    }
  }
  ```

  3.5 Event-Driven Architecture

  ```typescript
  // ═══════════════════════════════════════════════════════════════
  // DOMAIN EVENTS
  // ═══════════════════════════════════════════════════════════════

  // events/task-created.event.ts
  class TaskCreatedEvent {
    constructor(public readonly task: Task) {}
  }

  class TaskCompletedEvent {
    constructor(
      public readonly taskId: string,
      public readonly result: TaskResult,
    ) {}
  }

  class MergeRequestCreatedEvent {
    constructor(
      public readonly taskId: string,
      public readonly mrUrl: string,
    ) {}
  }

  class TaskFailedEvent {
    constructor(
      public readonly taskId: string,
      public readonly reason: string,
      public readonly analysis: string,
    ) {}
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT HANDLERS - reagują na eventy, triggerują side effects
  // ═══════════════════════════════════════════════════════════════

  // events/handlers/on-task-created.handler.ts
  @EventsHandler(TaskCreatedEvent)
  class OnTaskCreatedHandler implements IEventHandler<TaskCreatedEvent> {
    constructor(
      private readonly queueService: QueueService,
    ) {}

    handle(event: TaskCreatedEvent): void {
      // Dodaj do kolejki przetwarzania przez AI
      this.queueService.add('process-with-ai', {
        taskId: event.task.id,
      });
    }
  }

  // events/handlers/on-mr-created.handler.ts
  @EventsHandler(MergeRequestCreatedEvent)
  class OnMergeRequestCreatedHandler implements IEventHandler<MergeRequestCreatedEvent> {
    constructor(
      private readonly notification: NotificationPort,
      private readonly issueTracker: IssueTrackerPort,
    ) {}

    async handle(event: MergeRequestCreatedEvent): Promise<void> {
      // Notify on Slack
      await this.notification.sendToChannel('dev-channel', {
        text: `🔀 New MR ready for review: ${event.mrUrl}`,
      });

      // Update JIRA status
      await this.issueTracker.updateStatus(event.taskId, 'CODE_REVIEW');

      // Add comment to JIRA
      await this.issueTracker.addComment(
        event.taskId,
        `AI created MR: ${event.mrUrl}`
      );
    }
  }

  // events/handlers/on-task-failed.handler.ts
  @EventsHandler(TaskFailedEvent)
  class OnTaskFailedHandler implements IEventHandler<TaskFailedEvent> {
    constructor(
      private readonly notification: NotificationPort,
      private readonly issueTracker: IssueTrackerPort,
    ) {}

    async handle(event: TaskFailedEvent): Promise<void> {
      // Add detailed comment to JIRA
      await this.issueTracker.addComment(event.taskId, `
        ⚠️ AI nie mogło automatycznie rozwiązać tego zadania.

        **Analiza:**
        ${event.analysis}

        **Powód:**
        ${event.reason}

        Zadanie wymaga interwencji człowieka.
      `);

      // Notify developer
      await this.notification.sendToChannel('dev-channel', {
        text: `⚠️ Task ${event.taskId} wymaga pomocy człowieka`,
      });
    }
  }
  ```

  3.6 Dependency Injection - wiring adapters

  ```typescript
  // ═══════════════════════════════════════════════════════════════
  // MODULE CONFIGURATION - wybór adaptera per organization
  // ═══════════════════════════════════════════════════════════════

  // modules/integrations.module.ts
  @Module({
    providers: [
      // Issue Tracker - dynamiczny wybór adaptera
      {
        provide: 'IssueTrackerPort',
        useFactory: (config: ConfigService, org: Organization) => {
          switch (org.issueTrackerType) {
            case 'jira':
              return new JiraAdapter(config.get('jira'));
            case 'youtrack':
              return new YouTrackAdapter(config.get('youtrack'));
            case 'linear':
              return new LinearAdapter(config.get('linear'));
            default:
              throw new Error(`Unknown issue tracker: ${org.issueTrackerType}`);
          }
        },
        inject: [ConfigService, 'CurrentOrganization'],
      },

      // Git Provider - dynamiczny wybór adaptera
      {
        provide: 'GitProviderPort',
        useFactory: (config: ConfigService, org: Organization) => {
          switch (org.gitProviderType) {
            case 'gitlab':
              return new GitLabAdapter(config.get('gitlab'));
            case 'github':
              return new GitHubAdapter(config.get('github'));
            case 'bitbucket':
              return new BitbucketAdapter(config.get('bitbucket'));
            default:
              throw new Error(`Unknown git provider: ${org.gitProviderType}`);
          }
        },
        inject: [ConfigService, 'CurrentOrganization'],
      },

      // AI Provider - BYOK model
      {
        provide: 'AIProviderPort',
        useFactory: (user: User, localWorker?: LocalWorkerConnection) => {
          if (localWorker?.isConnected) {
            return new ClaudeCodeLocalAdapter(localWorker);
          }
          switch (user.aiProviderType) {
            case 'claude':
              return new ClaudeAPIAdapter(user.decryptedApiKey);
            case 'openai':
              return new OpenAIAdapter(user.decryptedApiKey);
            default:
              throw new Error('No AI provider configured');
          }
        },
        inject: ['CurrentUser', 'LocalWorkerConnection'],
      },
    ],
  })
  export class IntegrationsModule {}
  ```

  3.7 Kiedy NIE over-engineerować (pragmatyzm)

  ✅ UŻYWAJ Ports & Adapters dla:
  - Issue trackers (JIRA, YouTrack, Linear) - RÓŻNI KLIENCI
  - Git providers (GitLab, GitHub, Bitbucket) - RÓŻNI KLIENCI
  - AI providers (Claude, OpenAI, local) - BYOK MODEL
  - Notifications (Slack, Teams, Email) - RÓŻNI KLIENCI
  - Storage (S3, GCS, local) - MOŻE SIĘ ZMIENIĆ

  ❌ NIE OVER-ENGINEERUJ dla:
  - Database (Prisma) - nie zmieniamy ORM co tydzień
  - Queue (BullMQ) - nie zmieniamy queue co tydzień
  - Auth (Clerk) - SaaS, nie zmieniamy
  - Cache (Redis) - standard, nie abstrakcja

  ZASADA: Abstrakcja tam gdzie WIADOMO że będą różni klienci/vendorzy
  lub gdzie Ty sam chcesz mieć alternatywę (AI: API vs local)

  ---
  4. Rekomendowany Stack Technologiczny

  ┌─────────────────────────────────────────────────────────────┐
  │                        FRONTEND                              │
  │  Next.js 15 + TypeScript + Tailwind + shadcn/ui             │
  │  Auth: Clerk | Payments: Stripe | Real-time: Socket.io      │
  └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                        BACKEND                               │
  │  NestJS + TypeScript + Prisma ORM + PostgreSQL              │
  │  Queue: BullMQ (Redis) | Email: Resend | Logs: Axiom        │
  └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                    AI AGENT LAYER                            │
  │  Claude Agent SDK / LangGraph.js                            │
  │  MCP Servers: Context7, JIRA, GitHub, GitLab, Slack         │
  └─────────────────────────────────────────────────────────────┘

  Gotowe rozwiązania (zgodnie z Twoją filozofią):

  | Funkcja  | Rozwiązanie                                | Dlaczego                                    |
  |----------|--------------------------------------------|---------------------------------------------|
  | Auth     | https://clerk.com/                         | Multi-tenant, webhooks, organizations       |
  | Payments | https://stripe.com/                        | Subscriptions, usage-based billing          |
  | Email    | https://resend.com/ + https://react.email/ | https://github.com/jiangtaste/nestjs-resend |
  | Database | PostgreSQL + https://prisma.io/            | Type-safe, migrations                       |
  | Queue    | https://bullmq.io/                         | Job processing, retries                     |
  | Hosting  | https://railway.app/ / https://render.com/ | Deploy w minuty                             |

  Boilerplate do rozważenia:

  - https://github.com/ixartz/SaaS-Boilerplate - Next.js + Clerk + Stripe + Drizzle
  - https://www.buildkits.dev/categories/nextjs - Next.js + NestJS + Prisma + GraphQL

  ---
  4. Architektura Multi-Agent System

                      ┌──────────────────┐
                      │   SUPERVISOR     │
                      │   (Orchestrator) │
                      └────────┬─────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
  │  RESEARCHER   │   │   DEVELOPER   │   │   DESIGNER    │
  │  Agent        │   │   Agent       │   │   Agent       │
  │  ─────────    │   │   ─────────   │   │   ─────────   │
  │  • Context7   │   │   • GitLab    │   │   • Figma?    │
  │  • Codebase   │   │   • GitHub    │   │   • UI rules  │
  │  • Docs       │   │   • Code edit │   │   • UX check  │
  └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
                ┌─────────────────────────┐
                │     SECURITY Agent      │
                │     ─────────────────   │
                │     • OWASP checks      │
                │     • Semgrep MCP       │
                │     • Dependency audit  │
                └───────────┬─────────────┘
                            ▼
                ┌─────────────────────────┐
                │     TESTER Agent        │
                │     ─────────────────   │
                │     • Run tests         │
                │     • Coverage check    │
                │     • E2E scenarios     │
                └───────────┬─────────────┘
                            ▼
                ┌─────────────────────────┐
                │   CODE REVIEWER Agent   │
                │   ─────────────────     │
                │   • Best practices      │
                │   • Code style          │
                │   • Final approval      │
                └───────────┬─────────────┘
                            ▼
                ┌─────────────────────────┐
                │      OUTPUT             │
                │   • Create MR/PR        │
                │   • Slack notification  │
                │   • JIRA status update  │
                └─────────────────────────┘

  ---
  5. Workflow aplikacji

  1. User dodaje label "AI" w JIRA
             │
             ▼
  2. JIRA Webhook → POST /api/webhooks/jira
             │
             ▼
  3. Backend parsuje:
     • Issue description
     • Components → mapowanie na repo
     • Comments, attachments
             │
             ▼
  4. Tworzy Job w BullMQ
             │
             ▼
  5. Agent Worker:
     a) Zmienia status JIRA → "In Progress"
     b) Researcher Agent analizuje task
     c) Decision: wykonalne samodzielnie?
             │
       ┌─────┴─────┐
       │           │
       ▼           ▼
     TAK         NIE
       │           │
       ▼           ▼
  6a. Pipeline:   6b. Komentarz JIRA:
     Developer      "Potrzebna pomoc"
     → Designer     + szczegóły analizy
     → Security     + sugestie
     → Tester
     → Reviewer
       │
       ▼
  7. Create MR/PR
       │
       ▼
  8. Slack: "Code Review needed"
       │
       ▼
  9. JIRA status → "Code Review"

  ---
  6. Plan MVP (Proof of Concept)

  Faza 1: Podstawowa infrastruktura (tydzień 1-2)

  □ Setup NestJS + Next.js monorepo
  □ Clerk integration (auth)
  □ PostgreSQL + Prisma schema
  □ Basic dashboard UI

  Faza 2: Integracje (tydzień 2-3)

  □ JIRA webhook endpoint
  □ GitLab/GitHub OAuth + API
  □ Slack app + notifications
  □ Project mapping (component → repo)

  Faza 3: Single Agent PoC (tydzień 3-4)

  □ Claude Agent SDK integration
  □ Basic researcher agent
  □ Basic developer agent
  □ Create MR flow

  Faza 4: Multi-Agent (tydzień 4-6)

  □ LangGraph supervisor
  □ Agent communication
  □ Security agent
  □ Code review agent
  □ Decision logic (can AI solve vs needs human)

  Faza 5: Polish (tydzień 6-8)

  □ Stripe subscription
  □ Usage tracking
  □ Logging/monitoring
  □ Error handling
  □ Documentation

  ---
  7. Kluczowe ryzyko i mitygacja

  | Ryzyko                | Mitygacja                                       |
  |-----------------------|-------------------------------------------------|
  | Koszt API Claude      | Usage-based billing, limity per org             |
  | Halucynacje AI        | Context7 MCP, code review agent, human approval |
  | Bezpieczeństwo kodu   | Sandboxed execution, permission model           |
  | Złożoność multi-agent | Start od 2-3 agentów, skaluj                    |

  ---
  8. Model biznesowy i AI Provider Architecture

  KLUCZOWE ZAŁOŻENIA:
  - TY hostujesz SaaS (NIE self-hosted przez klientów)
  - Klienci płacą za SWOJE AI (BYOK - Bring Your Own Key)
  - Dla Ciebie lokalnie: Claude Code (prepaid, tańsze)
  - Architektura MODULARNA - łatwa wymiana AI providera

  8.1 BYOK (Bring Your Own Key) Model

  ┌─────────────────────────────────────────────────────────────────┐
  │                     TWÓJ SaaS (hosted by you)                   │
  │  ┌───────────────────────────────────────────────────────────┐  │
  │  │                   AI Provider Abstraction                  │  │
  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │  │
  │  │  │ Claude API  │ │ OpenAI API  │ │ Claude Code (local) │  │  │
  │  │  │ (user key)  │ │ (user key)  │ │ (your prepaid)      │  │  │
  │  │  └─────────────┘ └─────────────┘ └─────────────────────┘  │  │
  │  └───────────────────────────────────────────────────────────┘  │
  └─────────────────────────────────────────────────────────────────┘

  Jak to działa:

  DLA KLIENTÓW SaaS:
  1. Klient rejestruje się w Twojej aplikacji
  2. Klient wkleja swój API key (Claude/OpenAI) w settings
  3. Key jest szyfrowany (AES-256) i przechowywany bezpiecznie
  4. Każde zadanie używa KLUCZA KLIENTA
  5. Ty NIE płacisz za ich AI usage

  DLA CIEBIE (local dev / własne projekty):
  1. Uruchamiasz lokalny worker
  2. Worker łączy się z Twoim SaaS przez WebSocket/API
  3. Zamiast API call → spawns Claude Code subprocess
  4. Claude Code (prepaid) = tańsze niż API per-token

  8.2 AI Provider Interface (modularność)

  ```typescript
  // packages/ai-providers/src/types.ts

  interface AIProviderConfig {
    type: 'claude-api' | 'openai-api' | 'claude-code-local';
    apiKey?: string;           // dla API providers
    localEndpoint?: string;    // dla local Claude Code
  }

  interface AIProvider {
    name: string;

    // Core execution
    execute(task: AgentTask): Promise<AgentResult>;

    // Streaming support
    executeStream(task: AgentTask): AsyncIterable<AgentChunk>;

    // Capabilities check
    getCapabilities(): ProviderCapabilities;

    // Cost estimation
    estimateCost(task: AgentTask): CostEstimate;
  }

  interface ProviderCapabilities {
    supportsTools: boolean;
    supportsMCP: boolean;
    supportsStreaming: boolean;
    maxContextTokens: number;
    supportsCodeExecution: boolean;
  }
  ```

  8.3 Implementacje providerów

  ```typescript
  // Claude API Provider (dla klientów SaaS)
  class ClaudeAPIProvider implements AIProvider {
    constructor(private apiKey: string) {}

    async execute(task: AgentTask): Promise<AgentResult> {
      const client = new Anthropic({ apiKey: this.apiKey });
      // ... standard API call
    }
  }

  // OpenAI Provider (dla klientów którzy preferują GPT)
  class OpenAIProvider implements AIProvider {
    constructor(private apiKey: string) {}

    async execute(task: AgentTask): Promise<AgentResult> {
      const client = new OpenAI({ apiKey: this.apiKey });
      // ... translate to OpenAI format
    }
  }

  // Claude Code Local Provider (dla Ciebie - tańsze!)
  class ClaudeCodeLocalProvider implements AIProvider {
    async execute(task: AgentTask): Promise<AgentResult> {
      // Spawn Claude Code jako subprocess
      const result = await spawn('claude', [
        '--print',
        '--output-format', 'json',
        task.prompt
      ], {
        cwd: task.workingDirectory,
        env: { ...process.env }
      });

      return this.parseClaudeCodeOutput(result);
    }
  }
  ```

  8.4 Factory pattern dla wyboru providera

  ```typescript
  // packages/ai-providers/src/factory.ts

  class AIProviderFactory {
    static create(config: AIProviderConfig): AIProvider {
      switch (config.type) {
        case 'claude-api':
          return new ClaudeAPIProvider(config.apiKey!);
        case 'openai-api':
          return new OpenAIProvider(config.apiKey!);
        case 'claude-code-local':
          return new ClaudeCodeLocalProvider(config.localEndpoint);
        default:
          throw new Error(`Unknown provider: ${config.type}`);
      }
    }
  }

  // Usage w worker:
  const provider = AIProviderFactory.create(
    user.isLocalWorker
      ? { type: 'claude-code-local' }
      : { type: 'claude-api', apiKey: user.encryptedApiKey }
  );
  ```

  8.5 Bezpieczeństwo API Keys

  ```typescript
  // Encryption service dla API keys
  class APIKeyVault {
    private cipher: Cipher;

    constructor(masterKey: string) {
      this.cipher = createCipheriv('aes-256-gcm', masterKey, iv);
    }

    encrypt(apiKey: string): EncryptedKey {
      // Encrypt with AES-256-GCM
      // Store IV + ciphertext + authTag
    }

    decrypt(encrypted: EncryptedKey): string {
      // Decrypt only when needed
      // Never log or expose
    }
  }

  // W bazie danych:
  model User {
    id                String @id
    encryptedApiKey   Bytes?    // AES-256 encrypted
    apiKeyProvider    String?   // 'claude' | 'openai'
    apiKeyLastDigits  String?   // "...abc123" for UI display
  }
  ```

  8.6 Local Worker dla Twojego użytku

  ```
  ┌─────────────────────────────────────────────────┐
  │              TWÓJ KOMPUTER (local)              │
  │  ┌─────────────────────────────────────────┐    │
  │  │         Local Worker Process            │    │
  │  │  ┌─────────────────────────────────┐    │    │
  │  │  │   WebSocket connection to SaaS  │    │    │
  │  │  └─────────────────────────────────┘    │    │
  │  │              │                           │    │
  │  │              ▼                           │    │
  │  │  ┌─────────────────────────────────┐    │    │
  │  │  │   Claude Code subprocess        │    │    │
  │  │  │   (uses your prepaid credits)   │    │    │
  │  │  └─────────────────────────────────┘    │    │
  │  └─────────────────────────────────────────┘    │
  └─────────────────────────────────────────────────┘
            │
            │ Results via WebSocket
            ▼
  ┌─────────────────────────────────────────────────┐
  │              TWÓJ SaaS (cloud)                  │
  │  • Task queue (BullMQ)                          │
  │  • Results storage                              │
  │  • Webhook to JIRA/Slack/GitLab                 │
  └─────────────────────────────────────────────────┘
  ```

  8.7 Koszt comparison

  | Scenariusz           | Provider            | Koszt przykładowy       |
  |----------------------|---------------------|-------------------------|
  | Klient SaaS          | Claude API (BYOK)   | $0 dla Ciebie           |
  | Klient SaaS          | OpenAI API (BYOK)   | $0 dla Ciebie           |
  | Twoje projekty       | Claude Code prepaid | ~$20/mies unlimited*    |
  | Twoje projekty       | Claude API          | ~$50-200/mies per usage |

  * Claude Code Pro plan = prepaid, znacznie tańsze dla heavy usage

  ---
  9. Konkurencyjna przewaga produktu

  1. BYOK Model - klienci płacą za swoje AI, Ty za infrastrukturę
  2. Multi-provider support - Claude, OpenAI, lokalne modele
  3. Local worker option - dla power userów (jak Ty)
  4. Agnostic integrations - JIRA + YouTrack + Linear, GitLab + GitHub
  5. MCP ecosystem - łatwe dodawanie nowych integracji
  6. Transparent AI - użytkownik widzi co AI robi
  7. Git blame philosophy - analiza historii zmian jako feature

  ---
  Sources

  AI Agents & Platforms:
  - https://github.blog/news-insights/company-news/welcome-home-agents/
  - https://docs.port.io/guides/all/automatically-resolve-tickets-with-coding-agents/
  - https://github.com/rosidotidev/CrewAI-Agentic-Jira
  - https://sweep.dev/
  - https://bito.ai/blog/devin-alternatives/

  Claude & MCP:
  - https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk
  - https://github.com/anthropics/claude-agent-sdk-typescript
  - https://github.com/modelcontextprotocol/servers
  - https://github.com/upstash/context7

  Multi-Agent Frameworks:
  - https://blog.langchain.com/langgraph-multi-agent-workflows/
  - https://www.crewai.com/
  - https://www.anthropic.com/engineering/multi-agent-research-system

  APIs & Integrations:
  - https://developer.atlassian.com/cloud/jira/platform/webhooks/
  - https://docs.gitlab.com/api/merge_requests/
  - https://github.com/slackapi/node-slack-sdk
  - https://github.com/jiangtaste/nestjs-resend

  Boilerplates:
  - https://github.com/ixartz/SaaS-Boilerplate
  - https://boilerplatelist.com/collections/top-next-js-saas-boilerplates/

  ---
  Podsumowanie

  Czy to możliwe? TAK, wszystkie komponenty istnieją.

  Czy to unikalne? TAK, nie ma kompletnego produktu łączącego wszystkie te funkcje.

  Czy warto? TAK, rynek AI coding agents rośnie exponencjalnie.

  Następny krok? Chcesz, żebym pomógł Ci rozpocząć implementację MVP? Mogę:
  1. Stworzyć strukturę projektu (monorepo Next.js + NestJS)
  2. Przygotować podstawowe endpointy webhooks
  3. Zintegrować Claude Agent SDK z pierwszym agentem

  Co chciałbyś zrobić dalej?
