default:
    @just --list

dev: infra
    pnpm run dev

infra:
    docker compose -f docker/dev/docker-compose.yml up -d
    @echo "Waiting for databases to be ready..."
    @sleep 3
    @echo "Infrastructure ready!"
    @echo "  PostgreSQL: localhost:5432"
    @echo "  Redis:      localhost:6379"

infra-down:
    docker compose -f docker/dev/docker-compose.yml down

infra-logs:
    docker compose -f docker/dev/docker-compose.yml logs -f

run:
    docker run -d --name mitshe -p 3000:3000 -p 3001:3001 -v mitshe-data:/build/data -v /var/run/docker.sock:/var/run/docker.sock ghcr.io/mitshe/mitshe:latest
    @echo "mitshe is starting..."
    @echo "  Frontend: http://localhost:3000"
    @echo "  API:      http://localhost:3001"

stop:
    docker stop mitshe && docker rm mitshe

executor-build:
    docker build -t ghcr.io/mitshe/mitshe-executor:latest -f apps/api/docker/executor/Dockerfile apps/api/docker/executor/

light-build:
    docker build -t ghcr.io/mitshe/mitshe:latest -f docker/light/Dockerfile .

light:
    docker compose -f docker/light/docker-compose.yml up

light-up:
    docker compose -f docker/light/docker-compose.yml up -d

light-down:
    docker compose -f docker/light/docker-compose.yml down

light-logs:
    docker logs -f mitshe

prod:
    docker compose -f docker/prod/docker-compose.yml --env-file .env up -d --build

prod-up:
    docker compose -f docker/prod/docker-compose.yml --env-file .env up -d

prod-down:
    docker compose -f docker/prod/docker-compose.yml --env-file .env down

prod-logs:
    docker compose -f docker/prod/docker-compose.yml logs -f --tail 50

prod-restart:
    docker compose -f docker/prod/docker-compose.yml --env-file .env restart

install:
    pnpm install

build:
    pnpm run build

build-api:
    pnpm --filter @mitshe/api run build

build-web:
    pnpm --filter @mitshe/web run build

build-types:
    pnpm --filter @mitshe/types run build

clean:
    rm -rf apps/web/.next apps/api/dist packages/types/dist node_modules/.cache

db-generate:
    pnpm --filter @mitshe/api run db:generate

db-migrate:
    pnpm --filter @mitshe/api run db:migrate

db-migrate-deploy:
    pnpm --filter @mitshe/api run db:migrate:deploy

db-push:
    pnpm --filter @mitshe/api run db:push

db-reset:
    pnpm --filter @mitshe/api run db:reset

db-studio:
    pnpm --filter @mitshe/api run db:studio

test:
    pnpm test

test-api:
    pnpm --filter @mitshe/api test

test-web:
    pnpm --filter @mitshe/web test

lint:
    pnpm run lint

typecheck:
    pnpm run typecheck

check: lint typecheck test

setup: install db-generate
    @echo "Setup complete! Run 'just dev' to start."

env-setup:
    @if [ ! -f .env ]; then cp .env.example .env && echo "Created .env"; fi
