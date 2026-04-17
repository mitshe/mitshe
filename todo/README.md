# mitshe v2 — Roadmap

AI-driven chat + snapshoty + workflow automation. User opisuje co chce, AI konfiguruje.

## Stan

| # | Zadanie | Status | Plik |
|---|---------|--------|------|
| 1 | MCP Server — tools do zarządzania mitshe | DONE | [01-mcp-server.md](./01-mcp-server.md) |
| 2 | Chat — backend + UI | DONE | [02-chat.md](./02-chat.md) |
| 3 | Snapshots — persistent container images | DONE (basic) | [03-base-images.md](./03-base-images.md) |
| 4 | Chat → Snapshot setup (AI konfiguruje sesje) | TODO | [08-chat-snapshot-setup.md](./08-chat-snapshot-setup.md) |
| 5 | Snapshot w workflow (session_create z snapshotId) | TODO | [09-snapshot-workflow.md](./09-snapshot-workflow.md) |
| 6 | Skills System | TODO | [04-skills.md](./04-skills.md) |
| 7 | E2E Testing — Chrome/Playwright + live preview | TODO | [05-e2e-testing.md](./05-e2e-testing.md) |
| 8 | Cleanup — usunięcie Environments/Presets | TODO | [06-cleanup.md](./06-cleanup.md) |

## Kluczowy flow

```
1. User w chacie: "Potrzebuję środowisko z PHP API i Next.js frontendem"
2. AI tworzy sesję z DinD
3. Claude Code w sesji: klonuje repo, instaluje deps, stawia docker compose
4. User: "Zapisz to jako snapshot"
5. AI zapisuje snapshot "firma-fullstack"
6. User: "Zrób workflow: po tasku z Jiry uruchom testy na tym snapshocie"
7. AI tworzy workflow: Jira trigger → session from snapshot → Claude Code → tests → Slack
```

## Architektura

```
User <-> Chat UI <-> AI + MCP Tools <-> mitshe API
                                            |
                    ┌───────────────────────┼──────────────────┐
                    v                       v                  v
             Sessions/Snapshots       Workflows           Integrations
             (Docker + DinD)          (execution engine)  (GitHub, Jira...)
                    |
                    v
              Claude Code (w sesji)
              - wie jak skonfigurować projekty
              - docker compose up
              - playwright install
              - zapisz jako snapshot
```
