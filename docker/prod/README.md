# Production Deployment

This directory will contain production-ready Docker Compose files.

## Coming Soon

Production deployment with:
- Separate web and api containers
- External PostgreSQL
- External Redis
- Traefik/nginx reverse proxy
- TLS/SSL configuration

## For now

Use the **Light Mode** for quick deployment:

```bash
docker run -d \
  --name mitshe \
  -p 3000:3000 \
  -p 3001:3001 \
  -v mitshe-data:/build/data \
  ghcr.io/mitshe/light:latest
```

Or with Clerk authentication:

```bash
docker run -d \
  --name mitshe \
  -p 3000:3000 \
  -p 3001:3001 \
  -v mitshe-data:/build/data \
  -e AUTH_MODE=clerk \
  -e CLERK_SECRET_KEY=sk_... \
  -e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_... \
  ghcr.io/mitshe/light:latest
```
