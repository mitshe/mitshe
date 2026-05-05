#!/bin/bash
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'
REPO="mitshe/mitshe"

printf "\n"
printf "  ${BOLD}mitshe installer${NC}\n"
printf "  Workspace manager for AI coding agents\n"
printf "\n"

# Check Docker
if ! command -v docker &> /dev/null; then
    printf "  ${RED}Docker is not installed.${NC}\n\n"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        printf "  Install Docker Desktop: https://docker.com/products/docker-desktop\n"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        printf "  Install Docker: curl -fsSL https://get.docker.com | sh\n"
    fi
    printf "\n"
    exit 1
fi

if ! docker info &> /dev/null; then
    printf "  ${RED}Docker is not running.${NC} Start Docker Desktop and try again.\n"
    exit 1
fi

printf "  ${GREEN}✓${NC} Docker is running\n"

# Check if already running
if docker ps --filter name=^mitshe$ --format '{{.Names}}' | grep -q mitshe; then
    printf "  ${YELLOW}mitshe is already running.${NC}\n\n"
    printf "  Open: ${BOLD}http://localhost:3000${NC}\n\n"
    printf "  To update:  curl -fsSL https://mitshe.com/update.sh | sh\n"
    printf "  To stop:    docker stop mitshe\n\n"
    exit 0
fi

# Remove stopped container if exists
if docker ps -a --filter name=^mitshe$ --format '{{.Names}}' | grep -q mitshe; then
    printf "  Removing old container...\n"
    docker rm mitshe &> /dev/null
fi

# Pull latest image
printf "  Pulling latest image...\n"
docker pull ghcr.io/mitshe/mitshe:latest

# Run
printf "  Starting mitshe...\n"
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
    printf "\n  ${GREEN}✓ mitshe is running!${NC}\n\n"
    printf "  Open: ${BOLD}http://localhost:3000${NC}\n"
    printf "  Create your admin account on first visit.\n\n"
else
    printf "\n  ${YELLOW}mitshe is starting but not ready yet.${NC}\n"
    printf "  Check logs: docker logs -f mitshe\n"
    printf "  Open when ready: http://localhost:3000\n\n"
fi

# Ask about desktop app
printf "  Install desktop app? [y/N] "
read -r INSTALL_DESKTOP < /dev/tty

if [[ "$INSTALL_DESKTOP" =~ ^[Yy]$ ]]; then
    printf "\n  Downloading desktop app...\n"

    LATEST=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null)

    if [[ "$OSTYPE" == "darwin"* ]]; then
        URL=$(echo "$LATEST" | grep -o '"browser_download_url": *"[^"]*\.dmg"' | head -1 | cut -d'"' -f4)
        if [ -n "$URL" ]; then
            TMPFILE="/tmp/mitshe-desktop.dmg"
            curl -fsSL "$URL" -o "$TMPFILE"
            printf "  Mounting installer...\n"
            hdiutil attach "$TMPFILE" -quiet
            VOLUME=$(ls /Volumes | grep -i mitshe | head -1)
            if [ -n "$VOLUME" ]; then
                cp -R "/Volumes/$VOLUME/mitshe.app" /Applications/ 2>/dev/null || cp -R "/Volumes/$VOLUME/"*.app /Applications/ 2>/dev/null
                hdiutil detach "/Volumes/$VOLUME" -quiet 2>/dev/null
                rm -f "$TMPFILE"
                printf "  ${GREEN}✓${NC} Desktop app installed to /Applications\n\n"
                printf "  Open ${BOLD}mitshe${NC} from Applications or Spotlight.\n"
            else
                printf "  ${YELLOW}DMG downloaded to $TMPFILE — open it manually.${NC}\n"
            fi
        else
            printf "  ${YELLOW}No macOS build found in latest release.${NC}\n"
            printf "  Download manually: https://github.com/${REPO}/releases\n"
        fi

    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        URL=$(echo "$LATEST" | grep -o '"browser_download_url": *"[^"]*\.AppImage"' | head -1 | cut -d'"' -f4)
        if [ -n "$URL" ]; then
            DEST="$HOME/.local/bin/mitshe"
            mkdir -p "$HOME/.local/bin"
            curl -fsSL "$URL" -o "$DEST"
            chmod +x "$DEST"
            printf "  ${GREEN}✓${NC} Desktop app installed to $DEST\n\n"
            printf "  Run: ${BOLD}mitshe${NC}\n"
        else
            printf "  ${YELLOW}No Linux build found in latest release.${NC}\n"
            printf "  Download manually: https://github.com/${REPO}/releases\n"
        fi

    else
        printf "  ${YELLOW}Auto-install not supported on this platform.${NC}\n"
        printf "  Download manually: https://github.com/${REPO}/releases\n"
    fi
fi

printf "\n  ${BOLD}Commands:${NC}\n"
printf "    curl -fsSL https://mitshe.com/update.sh | sh   # Update\n"
printf "    docker logs -f mitshe                           # Logs\n"
printf "    docker stop mitshe                              # Stop\n\n"

# Open in browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000 2>/dev/null || true
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 2>/dev/null || true
fi
