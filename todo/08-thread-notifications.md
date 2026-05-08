# 08 — Thread notifications: know what happened without entering

## Problem
User opens thread A, gives Claude a task, switches to thread B.
Claude finishes in A but user has no idea. Must manually check each thread.

## Solution
1. **WebSocket events** — when session_agent completes, emit event
2. **Toast notification** — "Thread X: Claude finished. Review changes."
3. **Sidebar indicator** — dot/badge on thread showing pending activity
4. **Desktop notification** — native OS notification via Electron
5. **Session list** — "Claude finished" badge next to session name

## Implementation
- Backend: after session_agent exec completes, emit WebSocket event
  `session:agent_completed` with { sessionId, summary, exitCode }
- Frontend: listen for event, show toast with thread name
- Sidebar: show activity dot on threads with unread notifications
- Desktop: forward to Electron `Notification` API
- Store: keep "last seen" timestamp per thread, compare with last activity

## Thread states visible from list
- 🟢 RUNNING — active, Claude working
- 🔵 RUNNING — idle, waiting for user
- ⏸ STOPPED — can resume
- ❌ FAILED — error, needs attention
- ✅ COMPLETED — Claude finished, review needed
