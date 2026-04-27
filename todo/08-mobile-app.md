# 08 — Mobile App (React Native)

## Cel

Mobilna wersja mitshe do monitorowania sesji, workflow i taskow w czasie rzeczywistym. Nie do kodowania — do obserwowania co robi AI agent i reagowania na zdarzenia (approve PR, restart session, sprawdzenie logow).

## Podejscie

React Native (Expo) z tym samym API co web. Wspoldzielone typy z `@mitshe/types`. Push notifications zamiast WebSocket (tlo). WebSocket gdy app jest aktywna.

## Funkcjonalnosci

### MVP (v1)

**Dashboard**
- Status sesji (RUNNING/COMPLETED/FAILED) z live updates
- Lista aktywnych workflow executions
- Ostatnie taski z statusami
- Quick stats (active sessions, running workflows)

**Sesje**
- Lista sesji z filtrowaniem po statusie
- Szczegoly sesji: status, logi terminala (read-only scroll)
- Start/Stop/Restart session
- Podglad plików (read-only)

**Workflow**
- Lista workflow z statusami
- Manual trigger (Run Now)
- Execution history z logami
- Status poszczegolnych nodow

**Taski**
- Lista taskow z filtrami (status, priorytet, projekt)
- Szczegoly taska
- Zmiana statusu

**Notyfikacje (push)**
- Session completed/failed
- Workflow execution completed/failed
- Task status changed
- PR created (from workflow)

### v2 (pozniej)

- Terminal read-only live view (xterm.js w WebView)
- Browser preview (noVNC w WebView)
- Chat z AI (uproszczona wersja)
- Biometrics auth (Face ID / fingerprint)
- Widget iOS/Android (active sessions count)
- Apple Watch complication (session status)

## Architektura

```
apps/mobile/                    # Expo React Native app
├── app/                        # Expo Router (file-based routing)
│   ├── (tabs)/
│   │   ├── index.tsx           # Dashboard
│   │   ├── sessions.tsx        # Sessions list
│   │   ├── workflows.tsx       # Workflows list
│   │   └── tasks.tsx           # Tasks list
│   ├── session/[id].tsx        # Session detail
│   ├── workflow/[id].tsx       # Workflow detail
│   └── settings.tsx            # API URL, auth, preferences
├── components/
│   ├── StatusBadge.tsx
│   ├── SessionCard.tsx
│   ├── LogViewer.tsx
│   └── ...
├── lib/
│   ├── api.ts                  # API client (same endpoints as web)
│   ├── auth.ts                 # Token storage (SecureStore)
│   ├── socket.ts               # WebSocket for live updates
│   └── notifications.ts        # Expo push notifications
└── app.json                    # Expo config
```

## Auth flow

1. User otwiera app pierwszy raz
2. Wpisuje API URL (np. `https://mitshe.example.com` lub `http://192.168.1.x:3001`)
3. Login email/password → JWT token
4. Token w Expo SecureStore
5. Auto-refresh token

## Push notifications

### Backend (NestJS)
- Nowy modul `apps/api/src/modules/push/`
- Endpoint `POST /api/v1/push/register` — rejestracja Expo push token
- Event handlery emituja push notyfikacje obok WebSocket
- Expo SDK server-side do wysylania

### Mobile
- `expo-notifications` do rejestracji i obslugi
- Deep linking: klik na notification otwiera odpowiednia strone (session detail, workflow execution)

## Pliki do stworzenia

```
apps/mobile/                    # NOWY — Expo app
packages/types/                 # Juz istnieje, wspoldzielone

# Backend additions
apps/api/src/modules/push/
  push.module.ts
  push.controller.ts
  push.service.ts
  dto/register-device.dto.ts
```

## Tooling

- **Expo** — build, OTA updates, push notifications
- **Expo Router** — file-based routing (jak Next.js)
- **React Query** — cache, offline, same pattern as web
- **Expo SecureStore** — token storage
- **EAS Build** — CI/CD for iOS/Android

## Definition of Done (MVP)
- [ ] Expo app z Expo Router
- [ ] Auth flow (API URL + login)
- [ ] Dashboard z live stats
- [ ] Sessions list + detail (z logami)
- [ ] Workflows list + manual trigger
- [ ] Tasks list + status change
- [ ] Push notifications (session/workflow events)
- [ ] iOS TestFlight build
- [ ] Android APK build
