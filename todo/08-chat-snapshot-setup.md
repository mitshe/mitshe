# 08 — Chat → Snapshot setup (AI konfiguruje sesje automatycznie)

## Cel

User opisuje w chacie jakie środowisko potrzebuje. AI tworzy sesję, Claude Code
w niej instaluje wszystko, potem AI zapisuje jako snapshot. Minimum ręcznej konfiguracji.

## Jak to działa teraz

1. Chat AI ma MCP tools: session_create, session_exec, snapshot_create
2. Claude Code jest zainstalowany w executor image
3. DinD jest wspierany (docker compose wewnątrz sesji)
4. Snapshoty działają (commit container → persistent image)

## Co brakuje

### A. session_create z chat nie uruchamia Claude Code interaktywnie
Teraz `session_create` tworzy sesję, ale AI w chacie nie może "rozmawiać" z Claude Code
w sesji. Może tylko `session_exec` (jednorazowe komendy).

Potrzebujemy: `session_agent` tool — wysyła prompt do Claude Code w sesji i czeka na wynik.
To pozwoli AI w chacie zlecać Claude Code w sesji: "zainstaluj PHP, skonfiguruj docker compose".

### B. Brak automatycznego DinD przy session_create z chatu
AI musi wiedzieć żeby włączyć `enableDocker: true` gdy user mówi o docker compose,
wielu serwisach, testach z przeglądarką itp.

Fix: zaktualizować system prompt + dodać lepszy opis do tool `session_create`.

### C. Brak flow "zapisz sesję jako snapshot" w jednym kroku z chatu
Teraz AI musi: session_create → session_exec (wielokrotnie) → snapshot_create.
To działa, ale AI musi znać prawidłowy sessionId.

Fix: snapshot_create tool powinien akceptować opcjonalnie sessionId z ostatnio
utworzonej sesji (AI i tak ma kontekst konwersacji).

## Implementacja

### Krok 1: MCP tool `session_agent`
Nowy tool który wysyła prompt do Claude Code w running session:
```
session_agent({
  sessionId: "...",
  prompt: "Install PHP 8.3, Composer, MySQL client. Clone repo X. Run composer install."
})
→ Returns Claude Code output
```

Backend: exec `claude -p '{prompt}'` w kontenerze sesji.

Plik: `apps/api/src/modules/mcp/tools/session.tools.ts` — dodaj tool

### Krok 2: Lepszy system prompt
Zaktualizuj system prompt w chat service żeby AI wiedział:
- Gdy user mówi o wielu serwisach/docker → enableDocker: true
- Gdy user chce skonfigurować środowisko → session_create → session_agent → snapshot_create
- Gdy user mówi o repo → użyj repository_list, podaj repo ID

### Krok 3: session_create tool — lepsze opisy parametrów
Dodaj opisy do tool schema żeby AI lepiej rozumiał kiedy co użyć.

## Pliki do zmiany

```
apps/api/src/modules/mcp/tools/session.tools.ts    # +session_agent tool
apps/api/src/modules/chat/services/chat.service.ts  # lepszy system prompt
```

## Definition of Done
- [ ] AI w chacie potrafi: stworzyć sesję → zlecić Claude Code konfigurację → zapisać snapshot
- [ ] Cały flow działa w jednej konwersacji
- [ ] User nie musi ręcznie nic konfigurować
