---
description: Docker and Docker Compose commands (DinD enabled)
---

## Docker

Docker and Docker Compose are available in this session (Docker-in-Docker).

### Containers

```bash
# Run container
docker run -d --name mydb -p 5432:5432 -e POSTGRES_PASSWORD=pass postgres:16

# List running
docker ps

# Logs
docker logs -f mydb

# Exec into container
docker exec -it mydb bash

# Stop and remove
docker stop mydb && docker rm mydb
```

### Docker Compose

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d postgres redis

# View logs
docker compose logs -f

# Stop all
docker compose down

# Rebuild
docker compose up -d --build
```

### Building images

```bash
# Build
docker build -t myapp .

# Multi-stage build (Dockerfile)
FROM node:22 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

### Common compose patterns

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ["3000:3000"]
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/app

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### Debugging

```bash
# Inspect container
docker inspect mycontainer

# Resource usage
docker stats

# Cleanup
docker system prune -f
```
