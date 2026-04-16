# mitshe v2 — Roadmap

Nowa wizja: AI-driven chat interface zarządzający mitshe, bazowe obrazy kontenerów zamiast presetów, skills system, E2E testing z live preview.

## Kolejność implementacji

| # | Zadanie | Plik | Zależności | Priorytet |
|---|---------|------|------------|-----------|
| 1 | MCP Server — tools do zarządzania mitshe | [01-mcp-server.md](./01-mcp-server.md) | brak | CRITICAL |
| 2 | Chat — backend + UI | [02-chat.md](./02-chat.md) | #1 | CRITICAL |
| 3 | Base Images — persistent container images | [03-base-images.md](./03-base-images.md) | brak | HIGH |
| 4 | Skills System | [04-skills.md](./04-skills.md) | #3 | MEDIUM |
| 5 | E2E Testing — Chrome/Playwright + live preview | [05-e2e-testing.md](./05-e2e-testing.md) | #3 | MEDIUM |
| 6 | Cleanup — usunięcie Environments/Presets | [06-cleanup.md](./06-cleanup.md) | #3 | LOW |
| 7 | UI Polish — chat UX, workflow creation via chat | [07-ui-polish.md](./07-ui-polish.md) | #2 | LOW |

## Architektura docelowa

```
User <-> Chat UI <-> AI (Claude/OpenAI/...) <-> MCP Tools <-> mitshe API
                                                    |
                            ┌───────────────────────┼──────────────────┐
                            v                       v                  v
                     Sessions/Images          Workflows           Integrations
                     (Docker containers)      (execution engine)  (GitHub, Jira...)
```

## Nawigacja docelowa (sidebar)

- Chat (glowny interfejs)
- Sessions
- Workflows (+ Executions)
- Tasks
- Images (bazowe kontenery)
- Skills
- Integrations
- AI Providers
- Repositories
- Settings (org, team, api-keys, preferences)
