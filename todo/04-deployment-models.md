> MOSTLY DONE

# 04 — Deployment & Webhooks

## Status
- Webhooks for Jira, GitHub, GitLab, Trello — already implemented
- Webhook URLs shown in Settings → Integrations
- For local development: user uses ngrok/cloudflare tunnel for public URL
- No "local vs server mode" needed — one version, works everywhere

## Remaining
- [ ] Add tooltip/help text next to webhook URL:
      "For local development, use ngrok: `ngrok http 3001`"
- [ ] Show webhook health: last received event, timestamp
