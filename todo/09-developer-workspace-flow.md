# 09 — Developer Workspace Flow (sesje jako izolowane watki pracy)

## Problem

Pracujesz na jednym repo ale masz wiele kontekstow naraz:
- Feature branch A — implementacja
- Code review PR #47 — musisz checkout'owac cudzy branch
- Hotfix na produkcji — pilne, porzucasz co robisz
- Sprawdzanie czegos — "a jak to dziala w tym pliku?"
- Inne zadanie — klient pisze, musisz cos szybko zmienic

Efekt: `git stash`, `git checkout`, terminal puchnie, tracisz kontekst, zapominasz co gdzie, naruszasz stanu plikow, konflikty.

## Rozwiazanie: sesje jako izolowane watki pracy

Kazde zadanie = sesja w mitshe = izolowany kontener z:
- Wlasna kopia repo (worktree/clone)
- Wlasnym branchem
- Wlasnym terminalem
- Wlasna przegladarka (do testow)
- Claude Code gotowy do pomocy

Przylaczasz sie miedzy sesjami jak miedzy tabami. Kazda sesja ma swoj stan. Nic sie nie miesza.

## Architektura flow

```
┌─ mitshe Dashboard ─────────────────────────────┐
│                                                  │
│  Session: "PROJ-42 Auth refactor"    [RUNNING]   │
│  Branch: feat/auth-refactor                      │
│  Terminal | Browser | Files                      │
│                                                  │
│  Session: "Review PR #47"            [RUNNING]   │
│  Branch: feature/new-api (read-only)             │
│  Terminal | Files (diff view)                    │
│                                                  │
│  Session: "Hotfix login bug"         [RUNNING]   │
│  Branch: hotfix/login-500                        │
│  Terminal | Browser                              │
│                                                  │
│  Session: "Investigate perf issue"   [PAUSED]    │
│  Branch: main (read-only)                        │
│  Terminal                                        │
└──────────────────────────────────────────────────┘
```

## Zadania do implementacji

### Faza 1: Sesja z kontekstem taska

**1.1 "Open in Session" na task detail page**
- Task detail (`/tasks/:id`) — przycisk "Open in Session"
- Otwiera **standardowy dialog tworzenia sesji** ale z pre-filled polami:
  - Nazwa: task title (edytowalna)
  - Instructions: task description + acceptance criteria (edytowalne)
  - Projekt: z taska (jesli ma) — **sugestia**, nie wymuszenie
  - Repo/snapshot/skills: user wybiera sam, nic nie jest automatyczne
- User moze tez wybrac **"Add to existing session"** — dropdown z aktywnymi sesjami,
  task instructions dopisuja sie do sesji (np. jako nowy CLAUDE.md section)
- Logika: task moze wymagac 1 repo, 3 repo, albo sesje z snapshota — to user decyduje

**1.2 "Open in session" z Jira/GitHub issue**
- Gdy task jest zsynchronizowany z Jira/GitHub
- Pre-fill: branch name hint z issue key (np. `PROJ-42-auth-refactor`) — edytowalny
- Po ukonczeniu pracy user moze recznie update'owac status w Jira (lub workflow to zrobi)

### Faza 2: Code Review w sesji

**2.1 "Review in session" na task/PR**
- Przycisk "Review" otwiera dialog tworzenia sesji z:
  - Branch: sugestia PR branch (z dropdownu branchy)
  - Instructions: pre-filled "Review this PR, check for bugs, security issues, performance"
  - User decyduje o reszcie konfiguracji
- Przeglądarka pokazuje diff lub uruchomiona aplikacja do manualnego review

**2.2 Review result → PR comment**
- Po zakonczeniu review, wyniki (co Claude Code znalazl) moga byc:
  - Wklejone jako PR comment (via GitHub/GitLab API)
  - Wyslane na Slack
  - Zapisane jako task notes

### Faza 3: Branch management w sesjach

**3.1 Branch selector przy tworzeniu sesji**
- Dropdown z branchami repo (fetch z GitHub/GitLab API)
- Opcja "Create new branch from..." z base branch
- Branch name auto-generated z session name
- Pola:
  - Source branch (base): main, develop, etc.
  - Target branch: auto lub custom

**3.2 Branch status w session list**
- Na liscie sesji widac:
  - Nazwe brancha
  - Ahead/behind count vs base branch
  - Czy sa uncommitted changes
- Kolorowe wskazniki: green (clean), yellow (uncommitted), red (conflicts)

**3.3 Push/PR z sesji**
- W session detail page przycisk "Create PR"
- Auto-fill: title z session name, description z instructions/task
- Push branch + create PR w jednym kroku
- Link do PR w session detail

### Faza 4: Przeglądarka w sesji (noVNC)

**4.1 Xvfb + noVNC w executor container**
- Gdy `enableBrowser=true`:
  - Xvfb :99 virtual display (1920x1080)
  - fluxbox window manager
  - x11vnc na porcie 5900
  - noVNC websockify na porcie 6080
- Chromium pre-launched na starcie

**4.2 Port mapping + API proxy**
- SessionContainerConfig: expose port 6080
- API endpoint: `GET /api/v1/sessions/:id/browser` → WebSocket proxy do noVNC w kontenerze
- Alternatywnie: direct port mapping na hoście (prostsze dla single-user)

**4.3 Frontend: tab "Browser" w session detail**
- Nowy tab obok "Terminal" i "Files"
- noVNC client (npm: @niceline/novnc-react lub raw noVNC JS)
- Connects via WebSocket proxy
- Controls: resolution, fullscreen, refresh
- Mouse/keyboard passthrough

**4.4 Playwright integration**
- Claude Code odpala `npx playwright test` → testy uruchamiaja Chromium na :99
- User widzi w tabie "Browser" co Playwright robi w real-time
- Screenshot/video recording via Playwright built-in

### Faza 5: Desktop app (Electron)

**5.1 Scaffolding**
- `apps/desktop/` — Electron + electron-builder
- Laduje Next.js frontend (localhost:3000 w dev, bundled w prod)
- Tray icon z aktywnymi sesjami

**5.2 Embedded backend**
- Electron main process startuje:
  - NestJS API (child process)
  - Redis (embedded via keydb lub dockerized)
  - SQLite (plik w app data)
- User NIE musi odpalac `docker run` — app startuje wszystko

**5.3 Native file picker + local mount**
- Dialog.showOpenDialog() → wybor folderu z projektem
- Bind mount: host path → /workspace w kontenerze
- Claude Code pracuje bezposrednio na twoich plikach
- Zmiany widoczne w twoim IDE w real-time

**5.4 Session switching**
- Cmd+1/2/3... → przelaczanie miedzy sesjami (jak tabs w przegladarce)
- Tray menu: lista aktywnych sesji, klik → focus
- Notification: "Session X completed" / "PR created"

**5.5 Auto-update + CI/CD**
- electron-updater z GitHub Releases
- GitHub Actions: build Mac (universal), Windows, Linux
- Code signing (Apple + Windows)

### Faza 6: Workflow templates dla developer flow

**6.1 Template: "Feature Development"**
```
Trigger: manual (z task ID)
1. Create session z repo + new branch
2. Claude Code: implement task
3. Run tests
4. Create PR
5. Notify on Slack
```

**6.2 Template: "Code Review"**
```
Trigger: webhook (new PR)
1. Create session z PR branch
2. Claude Code: review code
3. Post review comment on PR
4. Close session
```

**6.3 Template: "E2E Test Runner"**
```
Trigger: webhook (PR updated)
1. Create session z browser enabled
2. Clone repo, install deps
3. Start app + run Playwright tests
4. Report results as PR check
```

## Kolejnosc implementacji

1. **Branch selector** (Faza 3.1) — szybkie, duza wartosc
2. **Open in session from task** (Faza 1.1) — laczy taski z sesjami
3. **Browser streaming** (Faza 4) — USP, demo-worthy
4. **Push/PR z sesji** (Faza 3.3) — zamyka petle
5. **Desktop app** (Faza 5) — game changer ale duzo pracy
6. **Workflow templates** (Faza 6) — automatyzacja powtarzalnych flow
7. **Code Review flow** (Faza 2) — niszowe ale mocne

## Definition of Done (MVP)
- [x] Branch selector przy tworzeniu sesji (dropdown z branchami)
- [x] "Open in session" z task detail page
- [x] Browser tab w session detail (noVNC)
- [x] Push + Create PR z session detail
- [x] Branch status widoczny na session list
- [x] Min. 1 workflow template (Feature Development)
- [x] 3 workflow templates (Feature Dev, Code Review, E2E Test Runner)
- [x] 6 predefined system skills
