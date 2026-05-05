# mitshe

> Workspace manager for AI coding agents.

[![CI](https://github.com/mitshe/mitshe/actions/workflows/ci.yml/badge.svg)](https://github.com/mitshe/mitshe/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/KE2zm6njBf)

Manage Claude Code sessions, automate workflows, and orchestrate AI coding agents — all from a single self-hosted dashboard. Each session runs in an isolated Docker container with full terminal, browser, and git access. Self-hosted, bring your own API keys.

![mitshe overview](docs/tour.gif)

## Install

```bash
curl -fsSL https://mitshe.com/install.sh | sh
```

That's it. Opens **http://localhost:3000** when ready.

<details>
<summary>Manual install</summary>

```bash
docker run -d \
  --name mitshe \
  -p 3000:3000 \
  -p 3001:3001 \
  -v mitshe-data:/build/data \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --restart unless-stopped \
  ghcr.io/mitshe/mitshe:latest
```
</details>

## Update

```bash
curl -fsSL https://mitshe.com/update.sh | sh
```

Your data is preserved in the `mitshe-data` Docker volume.

<details>
<summary>Manual update</summary>

```bash
docker pull ghcr.io/mitshe/mitshe:latest
docker stop mitshe && docker rm mitshe
docker run -d \
  --name mitshe \
  -p 3000:3000 \
  -p 3001:3001 \
  -v mitshe-data:/build/data \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --restart unless-stopped \
  ghcr.io/mitshe/mitshe:latest
```
</details>

## Desktop App

Native desktop app for macOS, Windows, and Linux. Download from [Releases](https://github.com/mitshe/mitshe/releases).

Connect to your local or remote mitshe instance. Adds native file picker for mounting local projects into sessions, tray icon, and keyboard shortcuts.

Requires a running mitshe instance (see Install above).

## Features

- **Claude Code sessions** — isolated Docker containers with terminal, browser, file editor, git
- **Browser streaming** — live Chromium preview in sessions via noVNC (Playwright E2E testing)
- **Branch management** — select branch when creating sessions, push & create PRs from session
- **Workflow engine** — visual builder with triggers, AI actions, git operations, notifications
- **Snapshots** — save a configured session state, spin up new sessions from it
- **Skills** — reusable instructions as Claude Code slash commands, import from GitHub repos
- **Integrations** — GitHub, GitLab, Jira, Slack
- **Multi-provider** — Claude, OpenAI, OpenRouter, Gemini, Groq (BYOK)
- **Self-hosted** — your data, your keys, single Docker container with SQLite

## Develop

```bash
git clone https://github.com/mitshe/mitshe.git
cd mitshe
just setup

cp .env.example .env
cp apps/api/.env.example apps/api/.env

just executor-build
just dev
```

App: http://localhost:3000 | API: http://localhost:3001 | Run `just` for all commands.

## License

MIT
