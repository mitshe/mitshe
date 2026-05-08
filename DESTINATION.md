# DESTINATION — Where mitshe is going

## One sentence

mitshe is where developers manage their work threads — isolated AI-powered workspaces per task, with everything needed to go from Jira ticket to merged PR.

## The problem we solve

Developer has 5 Jira tasks, a code review, a hotfix. One terminal. `git stash`, `git checkout`, context lost, branches mixed up, files overwritten. Chaos.

## The solution

Every task = a thread (session). Each thread is an isolated container with its own branch, terminal, browser, and Claude Code. Switch between threads like tabs. Nothing bleeds into anything else.

## Core flow (this is what must be perfect)

```
1. TASK arrives (Jira/GitHub/manual)
2. THREAD opens from snapshot (pre-configured environment)
3. CLAUDE CODE works (implements, tests, reviews)
4. USER watches & collaborates (terminal + browser stream)
5. PR created, thread can be archived or reused
```

## Key concepts

- **Thread** = Session = isolated Docker container per task/epic
- **Snapshot** = saved environment state (tools, repos, configs) — reusable base
- **Workflow** = automation that creates threads, runs Claude, notifies you
- **Browser** = live Chrome inside threads, for testing and browsing

## What makes mitshe irreplaceable

1. **Isolation per task** — no more git stash, no branch switching
2. **AI starts before you** — workflow creates thread, Claude begins, you arrive to review
3. **See what AI does** — browser stream shows Playwright tests in real-time
4. **Snapshots** — set up environment once, reuse forever
5. **One place** — tasks, sessions, workflows, integrations — not 5 different tools

## Non-goals

- We are NOT an IDE (use VS Code/Cursor alongside)
- We are NOT n8n (we don't do 400 API connectors)
- We are NOT trying to replace Claude Code CLI (we manage it)

## Deployment models

1. **Local** — Docker container on your machine, desktop app wrapper
2. **Server** — Docker on a server with public URL (webhooks work)
3. Both models must work seamlessly. User chooses.

## Naming

- "Session" → consider renaming to "Thread" in UI (clearer mental model)
- "Snapshot" → stays (good name, clear purpose)
- "Workflow" → stays (automation, triggers, pipelines)
- "Task" → imported from Jira/GitHub, the reason a thread exists
