# 05 — E2E Testing (Chrome/Playwright + Live Preview)

## Cel

AI agent w sesji moze uruchomic przegladarke (Chrome), testowac formularze, robic screenshoty, a user moze ogladac co robi w real-time przez WebSocket stream.

## Architektura

```
┌─────────────────────────────────────────────────┐
│ Executor Container (DinD)                       │
│                                                 │
│  ┌──────────────┐     ┌──────────────────────┐  │
│  │ Claude Code   │────▶│ Playwright scripts   │  │
│  │ (agent)       │     │ (npx playwright ...) │  │
│  └──────────────┘     └──────────┬───────────┘  │
│                                  │               │
│                    ┌─────────────▼────────────┐  │
│                    │ Chromium (headless/headed)│  │
│                    │ port 9222 (CDP)           │  │
│                    │ + VNC port 5900 (optional)│  │
│                    └─────────────┬────────────┘  │
│                                  │               │
│                    ┌─────────────▼────────────┐  │
│                    │ Screenshot/Video stream   │  │
│                    │ via CDP or noVNC          │  │
│                    └─────────────┬────────────┘  │
└──────────────────────────────────┼───────────────┘
                                   │ WebSocket
                                   ▼
                            ┌─────────────┐
                            │ mitshe API  │
                            │ (proxy WS)  │
                            └──────┬──────┘
                                   │
                                   ▼
                            ┌─────────────┐
                            │ Browser UI  │
                            │ (live view) │
                            └─────────────┘
```

## Dwa podejscia do live preview

### Opcja A: noVNC (REKOMENDOWANE na start)
- Chromium z DISPLAY + Xvfb (virtual framebuffer)
- VNC server (x11vnc) na porcie 5900
- noVNC (WebSocket VNC client) na porcie 6080
- mitshe API proxuje WebSocket do kontenera
- Frontend renderuje noVNC w iframe/canvas
- **Zalety**: widac WSZYSTKO co robi przegladarka, user moze tez klikac
- **Wady**: wiecej zasobow (Xvfb + VNC)

### Opcja B: CDP Screenshots (lzejsza alternatywa)
- Chromium headless z Chrome DevTools Protocol
- Periodic screenshots via CDP (`Page.captureScreenshot`)
- Stream screenshots przez WebSocket (MJPEG-like)
- **Zalety**: lzejsze, nie wymaga Xvfb
- **Wady**: nie interactive, opoznienie

### Rekomendacja
Zacznij od **Opcja A (noVNC)** — jest bardziej wow, user moze ogladac i wchodzic w interakcje. Mozna pozniej dodac Opcja B jako lightweight mode.

## Zmiany w Executor Image

Dockerfile (`apps/api/docker/executor/Dockerfile`) — dodac:

```dockerfile
# Playwright + Chromium
RUN npx playwright install --with-deps chromium

# VNC + noVNC for live preview
RUN apt-get update && apt-get install -y \
    xvfb \
    x11vnc \
    fluxbox \
    && rm -rf /var/lib/apt/lists/*

# noVNC
RUN git clone --depth 1 https://github.com/novnc/noVNC.git /opt/novnc \
    && git clone --depth 1 https://github.com/novnc/websockify.git /opt/novnc/utils/websockify
```

## Session startup (gdy browser enabled)

W `session-container.service.ts`, jesli sesja ma browser:
```bash
# Start virtual display
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99

# Start window manager (minimalistyczny)
fluxbox &

# Start VNC server
x11vnc -display :99 -forever -nopw -shared &

# Start noVNC websocket proxy
/opt/novnc/utils/websockify/run --web /opt/novnc 6080 localhost:5900 &
```

## Frontend — Live Preview

### Session detail page — nowy tab "Browser"
- noVNC client w iframe lub `@niceline/novnc-react`
- Connects to `ws://api/sessions/:id/browser` (proxied)
- Fullscreen toggle
- Resolution selector

### Opcjonalnie: osobna strona
- `/sessions/:id/browser` — fullscreen browser view
- Embedowalny link (do share)

## API Changes

### Session container config
```typescript
interface SessionContainerConfig {
  // ... existing
  enableBrowser?: boolean;  // start Xvfb + VNC + noVNC
}
```

### New endpoints
```
GET /api/v1/sessions/:id/browser       # WebSocket proxy to noVNC
POST /api/v1/sessions/:id/screenshot   # Take screenshot (CDP)
```

### Prisma — AgentSession
Dodac:
```prisma
enableBrowser Boolean @default(false) @map("enable_browser")
```

## Port mapping

Kontener eksponuje:
- `6080` — noVNC WebSocket (browser live view)
- `9222` — Chrome DevTools Protocol (dla Playwright remote)

API proxuje te porty do frontendu.

## Pliki do stworzenia/modyfikacji

```
# Docker
apps/api/docker/executor/Dockerfile          # +Playwright, Xvfb, VNC, noVNC

# Backend
apps/api/prisma/schema.prisma                # enableBrowser field
apps/api/src/modules/sessions/
  services/session-container.service.ts       # Browser startup w Cmd
  controllers/sessions.controller.ts          # /browser WS proxy, /screenshot
  gateways/browser.gateway.ts                 # WebSocket proxy for noVNC

# Frontend
apps/web/src/app/(dashboard)/sessions/[id]/
  components/browser-view.tsx                 # noVNC component
  page.tsx                                    # Nowy tab "Browser"

# Skill (powiazane z #04)
apps/api/src/modules/skills/system-skills/
  playwright-e2e.skill.ts                     # Instrukcje dla agenta
```

## Zalezy od
- #03 Base Images (obraz z Playwright pre-installed)
- Dobrze sie laczy z #04 Skills (E2E testing skill)

## Definition of Done
- [ ] Playwright + Chromium zainstalowane w executor image
- [ ] Sesja z `enableBrowser=true` startuje Xvfb + VNC + noVNC
- [ ] Live preview widoczny w UI (noVNC tab)
- [ ] Claude Code moze uruchamiac Playwright testy
- [ ] Screenshots dostepne przez API
- [ ] WebSocket proxy dziala stabilnie
