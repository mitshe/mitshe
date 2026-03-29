#!/bin/bash
#
# mitshe-light installer
# Usage: curl -fsSL https://raw.githubusercontent.com/mitshe/mitshe/main/docker/light/install.sh | bash
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}                    mitshe-light installer                        ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check Docker
echo -n "Checking Docker... "
if ! command -v docker &> /dev/null; then
    echo -e "${RED}NOT FOUND${NC}"
    echo ""
    echo -e "${RED}Docker is required but not installed.${NC}"
    echo "   Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}OK${NC}"

# Check Docker is running
echo -n "Checking Docker daemon... "
if ! docker info &> /dev/null; then
    echo -e "${RED}NOT RUNNING${NC}"
    echo ""
    echo -e "${RED}Docker daemon is not running.${NC}"
    echo "   Please start Docker and try again."
    exit 1
fi
echo -e "${GREEN}OK${NC}"

echo ""

# Pull latest image
echo -e "${BLUE}Pulling mitshe-light image...${NC}"
docker pull ghcr.io/mitshe/light:latest

echo ""
echo -e "${GREEN}Image pulled successfully!${NC}"
echo ""

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q '^mitshe$'; then
    echo -e "${YELLOW}Container 'mitshe' already exists.${NC}"
    echo ""
    read -p "Do you want to remove it and create a new one? [y/N] " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker rm -f mitshe 2>/dev/null || true
    else
        echo "Keeping existing container. Exiting."
        exit 0
    fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}                    Configuration                                 ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Choose authentication mode:"
echo ""
echo "  1) Local mode (no authentication, single user)"
echo "     - Perfect for personal use and testing"
echo "     - No setup required"
echo ""
echo "  2) Clerk mode (multi-user authentication)"
echo "     - Requires Clerk keys from https://clerk.com"
echo "     - Full organization and user management"
echo ""

read -p "Select mode [1/2] (default: 1): " AUTH_CHOICE
AUTH_CHOICE=${AUTH_CHOICE:-1}

AUTH_MODE="local"
CLERK_SECRET_KEY=""
CLERK_PUBLISHABLE_KEY=""

if [ "$AUTH_CHOICE" = "2" ]; then
    AUTH_MODE="clerk"
    echo ""
    echo "Get your Clerk keys at: https://clerk.com"
    echo ""
    read -p "Enter CLERK_SECRET_KEY (sk_...): " CLERK_SECRET_KEY
    read -p "Enter NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (pk_...): " CLERK_PUBLISHABLE_KEY

    if [ -z "$CLERK_SECRET_KEY" ] || [ -z "$CLERK_PUBLISHABLE_KEY" ]; then
        echo ""
        echo -e "${YELLOW}Clerk keys not provided. Falling back to local mode.${NC}"
        AUTH_MODE="local"
    fi
fi

echo ""
echo -e "${BLUE}Starting mitshe-light in ${AUTH_MODE} mode...${NC}"
echo ""

# Generate encryption key
ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n')

# Build docker run command
DOCKER_CMD="docker run -d \
    --name mitshe \
    --restart unless-stopped \
    -p 3000:3000 \
    -p 3001:3001 \
    -v mitshe-data:/build/data \
    -e AUTH_MODE=$AUTH_MODE \
    -e ENCRYPTION_KEY=$ENCRYPTION_KEY"

if [ "$AUTH_MODE" = "clerk" ]; then
    DOCKER_CMD="$DOCKER_CMD \
    -e CLERK_SECRET_KEY=$CLERK_SECRET_KEY \
    -e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY"
fi

DOCKER_CMD="$DOCKER_CMD ghcr.io/mitshe/light:latest"

# Start container
eval $DOCKER_CMD

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  mitshe-light is starting!                                      ${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Frontend:  http://localhost:3000"
echo "  API:       http://localhost:3001"
echo "  Mode:      $AUTH_MODE"
echo ""
echo "  Useful commands:"
echo "    docker logs -f mitshe     # View logs"
echo "    docker stop mitshe        # Stop"
echo "    docker start mitshe       # Start"
echo "    docker rm -f mitshe       # Remove"
echo ""
echo "  Data is persisted in Docker volume 'mitshe-data'"
echo ""

# Wait for startup
echo -n "Waiting for startup"
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo ""
        echo ""
        echo -e "${GREEN}mitshe is ready! Open http://localhost:3000${NC}"
        exit 0
    fi
    echo -n "."
    sleep 2
done

echo ""
echo ""
echo -e "${YELLOW}Startup is taking longer than expected.${NC}"
echo "   Check logs with: docker logs mitshe"
