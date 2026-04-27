# 06 — Landing Page Rework

## Problem

Strona glowna sprzedaje mitshe jako "AI development platform" / workflow tool. To nie oddaje tego czym mitshe jest: **workspace manager for AI coding agents**. Core to sesje Claude Code, nie chat czy workflow builder.

## Narracja do zbudowania

mitshe = miejsce gdzie AI coding agent (Claude Code) pracuje. Ty dajesz mu srodowisko (Docker, repo, narzedzia), on koduje, testuje, commituje. Ty obserwujesz, reagujesz, iterujesz.

Kluczowe przekazy:
- **Sesje** — izolowane srodowiska z terminalem, przegladarka, git
- **Snapshoty** — zapisz skonfigurowane srodowisko, odtwarzaj jednym klikiem
- **Skills** — daj agentowi instrukcje czego uzyc i jak testowac
- **Workflow** — automatyzuj powtarzalne procesy (ale to secondary feature, nie hero)
- **Self-hosted** — twoje dane, twoje klucze, twoja infrastruktura

## Sekcje do przepisania

### Hero
- Obecny: generic "AI development platform" z chatem
- Nowy: "Workspace manager for AI coding agents" — pokaz sesje z terminalem i przegladarka, nie chata
- CTA: "Start self-hosting" → prosty docker run, nie form

### "Start self-hosting now" (cala sekcja do poprawy)
- Obecny: prawdopodobnie skomplikowany setup
- Nowy: 1 komenda `docker run`, 3 kroki (run, open, add key), gotowe
- Pokaz ze dziala out of the box z SQLite, zero external deps

### Feature sections
- Obecny: chat jako glowny feature, workflow builder prominentnie
- Nowy kolejnosc:
  1. **Sessions** — Claude Code w izolowanym kontenerze, terminal + browser live stream
  2. **Snapshots** — save/restore srodowisk
  3. **Skills** — instrukcje dla agenta jako slash commands
  4. **Workflows** — automatyzacja (secondary, nie hero)
  5. **Integrations** — GitHub, GitLab, Jira, Slack
- Kazda sekcja: krotki headline + 1-2 zdania + screenshot/mockup

### Usunac/zmniejszyc
- Chat nie powinien byc osobna sekcja — to interface, nie feature
- "40+ MCP tools" — techniczny detail, nie selling point
- Workflow builder nie powinien byc hero image

## Pliki do modyfikacji

```
apps/landing/src/app/page.tsx              # Glowna strona
apps/landing/src/components/sections/      # Poszczegolne sekcje
apps/landing/public/                       # Screenshoty/mockupy
```

## Definition of Done
- [ ] Hero section z "Workspace manager for AI coding agents"
- [ ] Feature sections w nowej kolejnosci (Sessions > Snapshots > Skills > Workflows)
- [ ] "Start self-hosting" — 1 docker run komenda, 3 kroki
- [ ] Nowe screenshoty z aktualnego UI (sesja z terminalem)
- [ ] Usuniety chat jako osobny feature
- [ ] Mobile responsive
