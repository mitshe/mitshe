# Production Deployment

Blue-green deployment na Hetzner VPS z Cloudflare Tunnel.

## Architektura

```
┌─────────────────────────────────────────────────────┐
│  Cloudflare (darmowe)                               │
│  app.example.com ──┐                                │
│  api.example.com ──┼── Tunnel (szyfrowany) ───┐     │
└────────────────────┼──────────────────────────┼─────┘
                     │                          │
┌────────────────────▼──────────────────────────▼─────┐
│  Hetzner VPS (4-8GB RAM)                            │
│  - Brak otwartych portów (bezpieczeństwo)           │
│  - Blue-green deploy (zero downtime)                │
│                                                     │
│  ┌─────────────┐  ┌─────────────────────────┐       │
│  │ cloudflared │  │  Docker                 │       │
│  │  (tunnel)   │──│──├─ web-blue/green      │       │
│  │             │──│──├─ api-blue/green      │       │
│  └─────────────┘  │  ├─ postgres            │       │
│                   │  ├─ redis               │       │
│                   │  └─ task containers     │       │
│                   └─────────────────────────┘       │
└─────────────────────────────────────────────────────┘
```

## Szybki start

### 1. Przygotuj serwer (Hetzner)

```bash
# SSH do serwera
ssh root@your-server-ip

# Zainstaluj Docker
curl -fsSL https://get.docker.com | sh

# Zainstaluj cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb

# Utwórz katalog aplikacji
mkdir -p /opt/app/deploy
cd /opt/app/deploy
```

### 2. Skonfiguruj Cloudflare Tunnel

```bash
# Zaloguj się do Cloudflare
cloudflared tunnel login

# Utwórz tunel
cloudflared tunnel create myapp

# Skopiuj credentials.json
cp ~/.cloudflared/*.json /opt/app/deploy/cloudflared/credentials.json

# Zaktualizuj cloudflared/config.yml
# - Zmień YOUR_TUNNEL_ID na ID tunelu
# - Zmień domeny na swoje
```

### 3. Dodaj DNS w Cloudflare

W panelu Cloudflare dodaj rekordy CNAME:
- `app.mitshe.com` → `YOUR_TUNNEL_ID.cfargotunnel.com`
- `api.mitshe.com` → `YOUR_TUNNEL_ID.cfargotunnel.com`

### 4. Skonfiguruj środowisko

```bash
# Skopiuj i uzupełnij .env
cp .env.example .env
nano .env

# Utwórz pliki środowiskowe
touch .env.web .env.api

# Nadaj uprawnienia
chmod +x deploy.sh
```

### 5. Uruchom infrastrukturę

```bash
./deploy.sh infra
```

### 6. Pierwszy deploy

```bash
./deploy.sh all latest
```

## Komendy

```bash
# Deploy pojedynczego serwisu
./deploy.sh web v1.2.3
./deploy.sh api v2.0.0

# Deploy wszystkiego
./deploy.sh all latest

# Rollback
./deploy.sh rollback-web
./deploy.sh rollback-api
./deploy.sh rollback-all

# Status
./deploy.sh status

# Tylko infrastruktura
./deploy.sh infra
```

## GitHub Actions

### Wymagane secrets

W Settings → Secrets and variables → Actions:

| Secret | Opis |
|--------|------|
| `SERVER_HOST` | IP serwera |
| `SERVER_USER` | Użytkownik SSH (np. `deploy`) |
| `SERVER_SSH_KEY` | Klucz prywatny SSH |
| `API_REPO_TOKEN` | Token do repo ai-tasks-api |
| `SLACK_WEBHOOK_URL` | (opcjonalne) Webhook Slack |

### Wymagane variables

W Settings → Secrets and variables → Actions → Variables:

| Variable | Opis |
|----------|------|
| `API_URL` | `https://api.mitshe.com` |
| `CLERK_PUBLISHABLE_KEY` | Publiczny klucz Clerk |

### Automatyczny deploy

Push do `main` → automatyczny build + deploy

```bash
git push origin main  # Deploy!
```

### Manualny deploy

Actions → Build & Deploy → Run workflow → Wybierz serwis i wersję

## Monitoring

```bash
# Logi wszystkich serwisów
docker compose -f docker-compose.prod.yml logs -f

# Logi konkretnego serwisu
docker compose -f docker-compose.prod.yml logs -f api-blue

# Status kontenerów
docker compose -f docker-compose.prod.yml ps

# Zużycie zasobów
docker stats
```

## Backup bazy danych

```bash
# Backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U app app > backup.sql

# Restore
docker compose -f docker-compose.prod.yml exec -T postgres psql -U app app < backup.sql
```

## Troubleshooting

### Cloudflare Tunnel nie działa

```bash
# Sprawdź logi
docker compose -f docker-compose.prod.yml logs cloudflared

# Restart tunelu
docker compose -f docker-compose.prod.yml restart cloudflared
```

### Kontener nie przechodzi health check

```bash
# Sprawdź logi kontenera
docker compose -f docker-compose.prod.yml logs api-blue

# Sprawdź health endpoint ręcznie
docker compose -f docker-compose.prod.yml exec api-blue curl localhost:3001/health
```

### Rollback po nieudanym deploy

```bash
./deploy.sh rollback-api
# lub
./deploy.sh rollback-all
```
