# 02 — Chat (glowny interfejs)

## Cel

Chat UI w stylu Claude Desktop / ChatGPT, ale pod spodem AI ma dostep do MCP tools i moze zarzadzac calym mitshe. User pisze naturalnym jezykiem, AI wykonuje akcje.

Przyklad:
```
User: "Stworz workflow ktory bierze taski z Jiry, klonuje repo frontend-app
       z GitHuba, uruchamia Claude Code i robi PR"
AI:   [uzywa workflow_create tool, konfiguruje nodes, zwraca ladny preview]
      "Stworzylem workflow 'Jira to PR'. Oto co robi: ..."
      [renderuje sciezke workflow jako diagram]
```

## Architektura

### Backend

```
User message
    |
    v
Chat Controller (POST /api/v1/chat/messages)
    |
    v
Chat Service
    |-- zapisuje wiadomosc do DB
    |-- wysyla do AI provider (Claude API / OpenAI)
    |   z listą MCP tools
    |-- AI odpowiada (text + tool_use)
    |-- jesli tool_use → wykonaj tool przez MCP service
    |-- powtarzaj az AI skonczy (tool use loop)
    |-- zapisuj odpowiedz + tool results do DB
    |-- stream wynik przez WebSocket
    v
User widzi odpowiedz + wykonane akcje w UI
```

### AI Provider dla chatu

Chat NIE uzywa Claude Code CLI. Uzywa bezposrednio Claude API / OpenAI API z tool use:
- Istniejacy `AIProviderPort` juz wspiera `completeWithTools()`
- MCP tools sa konwertowane na tool definitions dla AI
- Tool use loop: AI wywoluje tool → wykonujemy → zwracamy wynik → AI kontynuuje

Alternatywnie, mozna uzyc Claude Code jako backend (przez API), ale to overkill dla chatu. Lepiej bezposrednio API z tools.

### Frontend

Nowa strona `/chat` z:
- Lista konwersacji (sidebar lub top)
- Wiadomosci (user + assistant)
- Rich rendering odpowiedzi:
  - Markdown
  - Code blocks
  - **Tool use cards** — np. "Created workflow: Jira to PR" z linkiem
  - **Inline previews** — workflow diagram, lista sesji, itp.
  - Streaming (token by token)
- Input box z:
  - Textarea (multiline, shift+enter)
  - Attachment? (pliki, screenshoty — pozniej)
  - Model selector (jesli user ma wiele AI credentials)

### Database

```prisma
model ChatConversation {
  id             String   @id @default(cuid())
  organizationId String   @map("organization_id")
  userId         String   @map("user_id")
  title          String?
  aiCredentialId String?  @map("ai_credential_id")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  organization Organization    @relation(...)
  aiCredential AICredential?   @relation(...)
  messages     ChatMessage[]

  @@index([organizationId, userId])
  @@map("chat_conversations")
}

model ChatMessage {
  id             String   @id @default(cuid())
  conversationId String   @map("conversation_id")
  role           String   // 'user' | 'assistant' | 'tool_result'
  content        String   // text content
  toolUse        Json?    @map("tool_use")    // tool calls made by AI
  toolResults    Json?    @map("tool_results") // results of tool execution
  createdAt      DateTime @default(now()) @map("created_at")

  conversation ChatConversation @relation(...)
  @@map("chat_messages")
}
```

## Rich Tool Use Rendering

Gdy AI wywola tool, chat UI powinien pokazac ladna karte:

### workflow_create
```
┌─ Workflow Created ──────────────────────┐
│ Jira to PR                              │
│                                         │
│ [Jira Trigger] → [AI Analyze] → [PR]   │
│                                         │
│ [Open Workflow →]                        │
└─────────────────────────────────────────┘
```

### session_create
```
┌─ Session Started ───────────────────────┐
│ PHP API Development                     │
│ Image: my-php-base                      │
│ Repos: frontend-app, api-backend        │
│ Status: RUNNING                         │
│                                         │
│ [Open Session →]                         │
└─────────────────────────────────────────┘
```

### repository_list
```
┌─ Repositories ──────────────────────────┐
│ ☐ frontend-app     (GitHub, main)       │
│ ☐ api-backend      (GitLab, develop)    │
│ ☐ shared-types     (GitHub, main)       │
└─────────────────────────────────────────┘
```

## Pliki do stworzenia/modyfikacji

```
# Backend
apps/api/prisma/schema.prisma             # ChatConversation, ChatMessage models
apps/api/src/modules/chat/
  chat.module.ts
  chat.controller.ts                       # REST + streaming endpoints
  chat.service.ts                          # AI orchestration + tool loop
  chat.gateway.ts                          # WebSocket for streaming
  dto/

# Frontend
apps/web/src/app/(dashboard)/chat/
  page.tsx                                 # Chat page
  components/
    chat-message.tsx                       # Single message rendering
    chat-input.tsx                         # Input box
    tool-use-card.tsx                      # Rich tool use rendering
    conversation-list.tsx                  # Sidebar z konwersacjami
apps/web/src/lib/api/client.ts             # Chat API methods
apps/web/src/lib/api/hooks.ts              # React Query hooks
apps/web/src/components/layout/sidebar.tsx  # Dodaj "Chat" do nawigacji
```

## Zalezy od
- #01 MCP Server (tools musza istniec zeby chat mogl ich uzywac)

## Definition of Done
- [ ] Mozna pisac z AI w chacie
- [ ] AI moze tworzyd workflow, sesje, taski przez tools
- [ ] Tool use renderuje sie jako ladne karty
- [ ] Streaming odpowiedzi (token by token)
- [ ] Historia konwersacji persistuje w DB
- [ ] WebSocket streaming dziala
