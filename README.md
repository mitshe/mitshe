# mitshe

> Chat-first AI development platform — automate workflows, manage sessions, and ship code through conversation.

[![CI](https://github.com/mitshe/mitshe/actions/workflows/ci.yml/badge.svg)](https://github.com/mitshe/mitshe/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Talk to mitshe like you'd talk to a colleague. Connect GitHub, describe what you need, and it handles the rest — creates branches, writes code with Claude Code, runs tests, opens PRs. Each task runs in an isolated Docker container. Self-hosted, bring your own API keys.

<!-- TODO: Add demo GIF here -->
<!-- ![mitshe demo](docs/demo.gif) -->

## What it does

**Chat with AI that actually does things:**
```
You: "Connect my GitHub, here's my token: ghp_xxx"
AI:  ✓ GitHub connected. Synced 12 repositories.

You: "Take the login bug from Jira and fix it"
AI:  → Creates session → Claude Code analyzes the code → fixes bug → creates PR
```

**Workflows that run on autopilot:**
- Jira issue created → AI reviews → code changes → PR → Slack notification
- Manual trigger → clone repo → AI generates code → commit → push

**Interactive AI sessions:**
- Claude Code in isolated Docker containers
- Full terminal, file editor, git access
- Snapshot sessions to reuse later

## Quick start

```bash
docker run -d \
  --name mitshe \
  -p 3000:3000 \
  -p 3001:3001 \
  -v mitshe-data:/build/data \
  -v /var/run/docker.sock:/var/run/docker.sock \
  ghcr.io/mitshe/mitshe:latest
```

Open **http://localhost:3000**. Create your account. Add an AI provider key. Start chatting.

## Features

- **AI Chat** — natural language interface to manage everything (workflows, sessions, tasks, integrations)
- **40+ MCP tools** — AI can create sessions, run workflows, connect GitHub, manage tasks, all through conversation
- **Claude Code sessions** — interactive terminals with Claude Code in isolated Docker containers
- **Workflow engine** — visual builder + 150+ node types (triggers, AI actions, git, notifications)
- **Snapshots** — freeze a configured session, reuse it for new tasks
- **Skills** — reusable CLAUDE.md instructions for Claude Code
- **Multi-provider** — Claude, OpenAI, OpenRouter, Gemini, Groq (BYOK)
- **Self-hosted** — your data, your keys, your infrastructure
- **Light mode** — single Docker container with SQLite, no external dependencies

## Screenshots

| | |
|---|---|
| ![Chat](docs/dashboard.png) | ![Sessions](docs/session.png) |
| Chat — AI assistant that manages your dev workflow | Sessions — Claude Code in isolated containers |
| ![Workflows](docs/workflows.png) | ![Executions](docs/executions.png) |
| Workflows — automated pipelines with triggers | Executions — real-time terminal output |

## Update

```bash
docker stop mitshe && docker rm mitshe
docker pull ghcr.io/mitshe/mitshe:latest
docker run -d \
  --name mitshe \
  -p 3000:3000 \
  -p 3001:3001 \
  -v mitshe-data:/build/data \
  -v /var/run/docker.sock:/var/run/docker.sock \
  ghcr.io/mitshe/mitshe:latest
```

Data persists in the `mitshe-data` volume.

## Develop

```bash
# Prerequisites: Node.js 20+, pnpm 9+, Docker, just
git clone https://github.com/mitshe/mitshe.git
cd mitshe
just setup

# Configure
cp .env.example .env
cp apps/api/.env.example apps/api/.env

# Build executor image (required for sessions and workflows)
just executor-build

# Start
just dev
```

Frontend: http://localhost:3000 | API: http://localhost:3001

Run `just` to see all commands.

## Stack

Next.js 16 + NestJS 11 + TypeScript + Prisma + PostgreSQL/SQLite + Redis + BullMQ + React Flow + shadcn/ui + Tailwind CSS 4

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
