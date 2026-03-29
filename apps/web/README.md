<p align="center">
  <h1 align="center">mitshe</h1>
  <p align="center">
    Open-source AI-powered workflow automation for development teams
  </p>
</p>

<p align="center">
  <a href="https://github.com/mitshe/web/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
  </a>
  <a href="https://github.com/mitshe/web">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
  </a>
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue" alt="TypeScript" />
</p>

---

## What is mitshe?

**mitshe** is an open-source workflow automation platform designed for development teams. Connect your tools, create powerful automations, and let AI handle repetitive tasks.

### Key Features

- **Visual Workflow Builder** - Drag-and-drop interface to create complex automations
- **AI-Powered Processing** - Use Claude, OpenAI, or other providers with your own API keys (BYOK)
- **Integrations** - Connect JIRA, GitLab, GitHub, Slack, and more
- **Real-time Updates** - Live status updates via WebSocket
- **Multi-tenant** - Organizations with role-based access control
- **Self-hostable** - Run on your own infrastructure

## Screenshots

<!-- Add your screenshots here -->
<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="Dashboard" width="800" />
</p>

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Clerk (Organizations + RBAC) |
| State | TanStack Query |
| Real-time | Socket.io |
| Database | PostgreSQL + Prisma |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Clerk account (for authentication)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/mitshe/web.git
   cd web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Configure the following:
   ```bash
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
   CLERK_SECRET_KEY=sk_...

   # Database
   DATABASE_URL=postgresql://...

   # API Connection (if using separate backend)
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_WS_URL=ws://localhost:3001
   ```

4. **Run database migrations**
   ```bash
   npx prisma migrate dev
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Docker

```bash
docker-compose up -d
```

### mitshe-light (Recommended for Testing)

**One command to try mitshe locally:**

```bash
curl -fsSL https://raw.githubusercontent.com/mitshe/web/main/docker/light/install.sh | bash
```

Or manually:

```bash
docker run -d \
  --name mitshe \
  -p 3000:3000 \
  -p 3001:3001 \
  -v mitshe-data:/app/data \
  -e CLERK_SECRET_KEY=your_clerk_secret \
  -e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key \
  ghcr.io/mitshe/light:latest
```

**mitshe-light** is a single container with:
- Frontend + Backend
- SQLite database
- Redis (embedded)
- Everything you need to try mitshe

Open http://localhost:3000 after starting.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (sign-in, sign-up)
│   ├── (dashboard)/       # Main app (authenticated)
│   │   ├── dashboard/     # Dashboard overview
│   │   ├── tasks/         # Task management
│   │   ├── workflows/     # Workflow builder
│   │   ├── projects/      # Project management
│   │   └── settings/      # Settings & integrations
│   └── (marketing)/       # Landing page, legal
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── app/               # App-specific components
│   ├── landing/           # Marketing components
│   ├── layout/            # Layout components
│   └── workflow-editor/   # Visual workflow builder
└── lib/
    ├── api/               # API client & hooks
    ├── socket/            # WebSocket client
    └── utils.ts           # Utilities
```

## Integrations

| Integration | Status | Description |
|-------------|--------|-------------|
| JIRA | Supported | Sync issues, update status |
| GitLab | Supported | Repositories, MRs, pipelines |
| GitHub | Supported | Repositories, PRs, issues |
| Slack | Supported | Notifications, commands |
| YouTrack | Supported | Issue tracking |
| Linear | Planned | Issue tracking |

## AI Providers (BYOK)

mitshe uses a **Bring Your Own Key** model for AI providers:

- **Anthropic Claude** - Claude 3.5 Sonnet, Claude 3 Opus
- **OpenAI** - GPT-4, GPT-4 Turbo
- **Custom** - Any OpenAI-compatible API

Your API keys are:
- Encrypted at rest (AES-256-GCM)
- Never logged or stored in plain text
- Decrypted only at the moment of use

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXT_PUBLIC_API_URL` | Backend API URL | No |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | No |
| `ENCRYPTION_KEY` | AES-256 key for API key encryption | Yes |

See `.env.example` for all available options.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Build for production
npm run build

# Run tests
npm run test
```

## Self-Hosting

mitshe can be self-hosted on any platform that supports Node.js or Docker:

- **Vercel** - Recommended for the frontend
- **Railway** - Full-stack deployment
- **Docker** - Any container platform
- **VPS** - Manual deployment

See [Self-Hosting Guide](docs/self-hosting.md) for detailed instructions.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] Linear integration
- [ ] Microsoft Teams integration
- [ ] Workflow templates marketplace
- [ ] Advanced analytics dashboard
- [ ] Mobile app

## Support

- [Documentation](https://mitshe.dev/docs)
- [GitHub Issues](https://github.com/mitshe/web/issues)
- [Twitter/X](https://x.com/t0tty3)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with AI by <a href="https://github.com/3uba">@3uba</a>
</p>
