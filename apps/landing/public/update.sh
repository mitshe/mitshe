#!/bin/bash
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BOLD}  mitshe updater${NC}"
echo ""

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed.${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}Docker is not running.${NC} Start Docker Desktop and try again."
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is running"

# Pull latest image
echo "  Pulling latest image..."
docker pull ghcr.io/mitshe/mitshe:latest

# Check if container exists
if ! docker ps -a --filter name=^mitshe$ --format '{{.Names}}' | grep -q mitshe; then
    echo -e "${YELLOW}No mitshe container found.${NC} Run the installer first:"
    echo "  curl -fsSL https://mitshe.com/install.sh | sh"
    exit 1
fi

# Stop and remove old container
echo "  Stopping old container..."
docker stop mitshe 2>/dev/null || true
docker rm mitshe 2>/dev/null || true

# Get data volume info
echo "  Starting updated container..."
docker run -d \
    --name mitshe \
    -p 3000:3000 \
    -p 3001:3001 \
    -v mitshe-data:/build/data \
    -v /var/run/docker.sock:/var/run/docker.sock \
    --restart unless-stopped \
    ghcr.io/mitshe/mitshe:latest > /dev/null

# Wait for health
echo "  Waiting for mitshe to start..."
for i in $(seq 1 30); do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        break
    fi
    sleep 2
done

if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo ""
    echo -e "${GREEN}✓ mitshe updated successfully!${NC}"
    echo ""
    echo -e "  Open: ${BOLD}http://localhost:3000${NC}"
    echo "  Your data has been preserved."
    echo ""
else
    echo ""
    echo -e "${YELLOW}mitshe is starting...${NC}"
    echo "  Check logs: docker logs -f mitshe"
    echo ""
fi
