# 09 — Minimal terminal version of mitshe

## Idea
CLI-only mitshe. No web UI, no browser. Pure terminal.
`mitshe thread new "Fix auth bug" --repo my-app --snapshot dev-env`

## Why
- Developers live in terminals
- Faster than opening browser
- Works over SSH
- Complements web UI (not replaces)
- Good for CI/CD integration

## Commands
```bash
mitshe thread list                    # list all threads
mitshe thread new "name" [--repo X]   # create thread
mitshe thread open <id>               # attach terminal to thread
mitshe thread stop <id>               # stop thread

mitshe snapshot list                  # list snapshots
mitshe snapshot create <thread-id>    # snapshot from thread

mitshe task list                      # imported tasks
mitshe task import --jira             # import from Jira
mitshe task open <id>                 # create thread from task

mitshe workflow run <id>              # trigger workflow
mitshe status                         # overview: threads, tasks, workflows
```

## Implementation
- Thin CLI that calls mitshe API (same endpoints as web)
- Written in Node.js or Go
- Published as npm package: `npx mitshe` or `npm install -g mitshe-cli`
- Auth: API key or JWT token from login
- Terminal attachment: WebSocket to session terminal

## Priority
Low — web UI and desktop app first. But keep API design CLI-friendly.
