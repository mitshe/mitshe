#!/bin/bash
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'
REPO="mitshe/mitshe"

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
printf "  Pulling latest images...\n"
docker pull ghcr.io/mitshe/mitshe:latest
docker pull ghcr.io/mitshe/mitshe-executor:latest 2>/dev/null || true

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
    printf "\n  ${GREEN}✓ mitshe server updated!${NC}\n\n"
else
    printf "\n  ${YELLOW}mitshe is starting...${NC}\n"
    printf "  Check logs: docker logs -f mitshe\n\n"
fi

# Update desktop app
printf "  Update desktop app? [y/N] "
read -r UPDATE_DESKTOP < /dev/tty

if [[ "$UPDATE_DESKTOP" =~ ^[Yy]$ ]]; then
    printf "\n  Downloading latest desktop app...\n"

    LATEST=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null)

    if [[ "$OSTYPE" == "darwin"* ]]; then
        URL=$(echo "$LATEST" | grep -o '"browser_download_url": *"[^"]*\.dmg"' | head -1 | cut -d'"' -f4)
        if [ -n "$URL" ]; then
            TMPFILE="/tmp/mitshe-desktop.dmg"
            curl -fsSL "$URL" -o "$TMPFILE"
            # Close running app
            osascript -e 'quit app "mitshe"' 2>/dev/null || true
            sleep 1
            printf "  Installing...\n"
            hdiutil attach "$TMPFILE" -quiet
            VOLUME=$(ls /Volumes | grep -i mitshe | head -1)
            if [ -n "$VOLUME" ]; then
                rm -rf /Applications/mitshe.app 2>/dev/null || true
                cp -R "/Volumes/$VOLUME/mitshe.app" /Applications/ 2>/dev/null || cp -R "/Volumes/$VOLUME/"*.app /Applications/ 2>/dev/null
                hdiutil detach "/Volumes/$VOLUME" -quiet 2>/dev/null
                rm -f "$TMPFILE"
                printf "  ${GREEN}✓${NC} Desktop app updated!\n"
            else
                printf "  ${YELLOW}DMG downloaded to $TMPFILE — open it manually.${NC}\n"
            fi
        else
            printf "  ${YELLOW}No macOS build found.${NC} Download: https://github.com/${REPO}/releases\n"
        fi

    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        URL=$(echo "$LATEST" | grep -o '"browser_download_url": *"[^"]*\.AppImage"' | head -1 | cut -d'"' -f4)
        if [ -n "$URL" ]; then
            DEST="$HOME/.local/bin/mitshe"
            curl -fsSL "$URL" -o "$DEST"
            chmod +x "$DEST"
            printf "  ${GREEN}✓${NC} Desktop app updated!\n"
        else
            printf "  ${YELLOW}No Linux build found.${NC} Download: https://github.com/${REPO}/releases\n"
        fi
    fi
fi

printf "\n  ${GREEN}✓ All done!${NC}\n"
printf "  Open: ${BOLD}http://localhost:3000${NC}\n\n"
