# 07 — UI Polish (chat UX, rich rendering)

## Cel

Dopracowanie chat UI zeby tworzenie workflow, sesji itp. przez chat bylo eleganckie i nowoczesne — nie tylko tekst, ale rich previews, inline diagramy, animacje.

## Elementy do dopracowania

### Chat message rendering
- Streaming z animacja (typing indicator, token-by-token)
- Markdown rendering (GFM) z syntax highlighting
- Tool use cards — animowane pojawienie sie, ikony, progress
- Inline workflow diagram (mini React Flow readonly) gdy AI tworzy workflow
- Collapsible thinking/reasoning sections
- Error states z retry button

### Tool use cards — design system
Kazdy tool type ma wlasna karte:
- `workflow_create` → mini diagram + link
- `session_create` → status badge + repos + link do sesji
- `repository_list` → interactive checklist
- `task_create` → task card z priority badge
- `image_create` → image info z size
- Generic fallback → JSON tree view

### Chat input
- Auto-resize textarea
- Cmd+Enter to send (configurable)
- Drag & drop files (screenshots, logs)
- @ mentions (mention repo, workflow, session by name)
- / commands (shortcuts: /workflow, /session, /task)
- Model selector pill

### Conversation management
- Rename conversations
- Pin important conversations
- Search across conversations
- Export conversation (markdown)

### Onboarding
- First-time chat experience
- Suggested prompts: "Create a workflow...", "Show my repositories...", "Start a session..."
- Quick action buttons below input

## Zalezy od
- #02 Chat (bazowy chat musi dzialac)

## Definition of Done
- [ ] Streaming rendering z animacja
- [ ] Wszystkie tool types maja dedykowane karty
- [ ] Chat input z auto-resize, cmd+enter, / commands
- [ ] Conversation search i management
- [ ] Onboarding experience
- [ ] Mobile responsive
