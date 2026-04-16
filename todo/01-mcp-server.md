# 01 — MCP Server (Model Context Protocol)

## Cel

Stworzyc MCP server ktory eksponuje API mitshe jako tools. Dzieki temu dowolny AI (Claude, OpenAI, etc.) moze zarzadzac mitshe — tworzenie workflow, sesji, zarzadzanie taskami, repo itd.

MCP server bedzie uzywany przez:
1. Chat (glowny interfejs) — AI uzywa tools do wykonywania akcji
2. Claude Code w sesjach — agent moze sam tworzyc workflow, sesje, itd.
3. Zewnetrzne AI (Claude Desktop, Cursor, etc.) — jesli user chce

## Co to jest MCP

Model Context Protocol — standardowy sposob na eksponowanie "tools" dla AI modeli. Zamiast pisac custom integracje, definiujesz tools z parametrami i AI wie jak je wywolac.

Spec: https://modelcontextprotocol.io/

## Tools do zaimplementowania

### Sessions
- `session_create` — tworzy sesje (name, repos, image, integrations, instructions)
- `session_list` — lista sesji (z filtrami status, project)
- `session_get` — szczegoly sesji
- `session_stop` / `session_pause` / `session_resume`
- `session_clone` — klonuj sesje
- `session_exec` — wykonaj komende w sesji
- `session_delete`

### Workflows
- `workflow_create` — tworzy workflow (z definicja nodes/edges lub z template)
- `workflow_list` — lista workflow
- `workflow_get` — szczegoly
- `workflow_run` — uruchom manualnie
- `workflow_update` / `workflow_delete`
- `workflow_execution_get` — status wykonania
- `workflow_list_templates` — dostepne szablony

### Tasks
- `task_create` / `task_list` / `task_get` / `task_update`
- `task_import` — importuj z Jira/GitHub
- `task_process` — uruchom AI processing

### Images (po #03)
- `image_list` — lista bazowych obrazow
- `image_create_from_session` — zamroz sesje jako obraz
- `image_delete`

### Repositories
- `repository_list` — lista repo
- `repository_list_remote` — repo dostepne z integracji (GitHub/GitLab)
- `repository_sync` — synchronizuj

### Integrations
- `integration_list` — lista polaczonych serwisow
- `integration_test` — test polaczenia

### Skills (po #04)
- `skill_list` / `skill_get`

## Implementacja

### Opcja A: Wbudowany MCP server w NestJS API (REKOMENDOWANE)
- Nowy modul `apps/api/src/modules/mcp/`
- MCP server jako endpoint HTTP (SSE transport) lub stdio
- Tools mapuja sie 1:1 na istniejace serwisy
- Reuzywamy cala logike ktora juz istnieje

### Opcja B: Oddzielny MCP server (pakiet)
- `packages/mcp-server/` — standalone MCP server
- Komunikuje sie z API przez HTTP
- Latwiejszy do uzywania z Claude Desktop / Cursor
- Ale duplikacja logiki

### Rekomendacja: Opcja A + thin wrapper dla Opcji B
- Glowna logika w API (modul MCP)
- `packages/mcp-server/` to tylko thin proxy ktory laczy sie z API i eksponuje tools przez stdio (dla Claude Desktop itp.)

## Pliki do stworzenia/modyfikacji

```
apps/api/src/modules/mcp/
  mcp.module.ts
  mcp.controller.ts          # SSE endpoint /api/v1/mcp
  mcp.service.ts              # Tool registry + execution
  tools/
    session.tools.ts
    workflow.tools.ts
    task.tools.ts
    repository.tools.ts
    integration.tools.ts
    image.tools.ts            # po #03
    skill.tools.ts            # po #04
```

## Zalezy od
- Nic — mozna zaczac od razu, mapuje sie na istniejace API

## Definition of Done
- [ ] MCP server odpowiada na `tools/list`
- [ ] Kazdy tool wywoluje odpowiedni serwis
- [ ] Mozna podlaczyc Claude Desktop i zarzadzac mitshe
- [ ] Testy integracyjne dla kazdego toola
