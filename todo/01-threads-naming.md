> DONE

# 01 — Threads: rename sessions to threads in UI

## Why
"Session" sounds technical. "Thread" matches mental model — each task is a thread of work, like threads in a conversation. Epics can have multiple threads (stories).

## What
- Rename "Sessions" → "Threads" in sidebar, pages, breadcrumbs, dialogs
- Keep API/DB as "session" (no migration needed, just UI labels)
- Thread can belong to a task (linked) or be standalone
- Thread list should show: name, branch, status, linked task, last active

## Files to change
- Sidebar labels
- Page titles and descriptions
- Session create dialog → "New Thread"
- Command palette shortcuts
- Dashboard recent sections

## NOT changing
- API endpoints (stay as /sessions)
- Database schema (stay as AgentSession)
- Desktop app code (uses web UI)
