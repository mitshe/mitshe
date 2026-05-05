#!/bin/bash
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

printf "\n"
printf "  ${BOLD}mitshe updater${NC}\n\n"

if ! command -v docker &> /dev/null; then
    printf "  ${RED}Docker is not installed.${NC}\n"
    exit 1
fi

if ! docker info &> /dev/null; then
    printf "  ${RED}Docker is not running.${NC} Start Docker Desktop and try again.\n"
    exit 1
fi

printf "  ${GREEN}✓${NC} Docker is running\n"

# Pull latest image
printf "  Pulling latest image...\n"
docker pull ghcr.io/mitshe/mitshe:latest

# Check if container exists
if ! docker ps -a --filter name=^mitshe$ --format '{{.Names}}' | grep -q mitshe; then
    printf "  ${YELLOW}No mitshe container found.${NC} Run the installer first:\n"
    printf "  curl -fsSL https://mitshe.com/install.sh | sh\n"
    exit 1
fi

# Stop and remove old container
printf "  Stopping old container...\n"
docker stop mitshe 2>/dev/null || true
docker rm mitshe 2>/dev/null || true

# Start updated container
printf "  Starting updated container...\n"
docker run -d \
    --name mitshe \
    -p 3000:3000 \
    -p 3001:3001 \
    -v mitshe-data:/build/data \
    -v /var/run/docker.sock:/var/run/docker.sock \
    --restart unless-stopped \
    ghcr.io/mitshe/mitshe:latest > /dev/null

# Wait for health
printf "  Waiting for mitshe to start...\n"
for i in $(seq 1 30); do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        break
    fi
    sleep 2
done

if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    printf "\n  ${GREEN}✓ mitshe updated successfully!${NC}\n\n"
    printf "  Open: ${BOLD}http://localhost:3000${NC}\n"
    printf "  Your data has been preserved.\n\n"
else
    printf "\n  ${YELLOW}mitshe is starting...${NC}\n"
    printf "  Check logs: docker logs -f mitshe\n\n"
fi
