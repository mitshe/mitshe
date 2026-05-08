# 04 — Deployment models: local vs server

## Problem
Not clear if mitshe should run locally or on server. Both have tradeoffs:
- **Local**: no webhooks, no public URL, but simple setup
- **Server**: webhooks work, accessible from anywhere, but needs hosting

## Solution
Support both explicitly. Make it clear in UI and docs.

### Local mode
- Docker on developer's machine
- Desktop app connects to localhost
- Polling for external services (Jira, GitHub)
- No webhooks (no public URL)
- install.sh handles everything

### Server mode
- Docker on VPS/cloud
- Accessible via public URL (https://mitshe.company.com)
- Webhooks work (Jira, GitHub, GitLab push events)
- Desktop app connects to remote URL
- HTTPS required (reverse proxy: nginx/caddy)

### What to add
- [ ] Settings page: "Deployment" section showing current mode
- [ ] If server: show webhook URLs prominently
- [ ] If local: hide webhook sections, show polling config
- [ ] Auto-detect: check if mitshe is accessible from public internet
- [ ] Documentation: separate guides for local vs server setup
