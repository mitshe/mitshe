#!/bin/bash
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'
REPO="mitshe/mitshe"

echo ""
echo -e "${BOLD}  mitshe installer${NC}"
echo -e "  Workspace manager for AI coding agents"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed.${NC}"
    echo ""
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "  Install Docker Desktop: https://docker.com/products/docker-desktop"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "  Install Docker: curl -fsSL https://get.docker.com | sh"
    fi
    echo ""
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}Docker is not running.${NC} Start Docker Desktop and try again."
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is running"

# Check if already running
if docker ps --filter name=^mitshe$ --format '{{.Names}}' | grep -q mitshe; then
    echo -e "${YELLOW}mitshe is already running.${NC}"
    echo ""
    echo -e "  Open: ${BOLD}http://localhost:3000${NC}"
    echo ""
    echo "  To update:  curl -fsSL https://mitshe.com/update.sh | sh"
    echo "  To stop:    docker stop mitshe"
    echo ""
    exit 0
fi

# Remove stopped container if exists
if docker ps -a --filter name=^mitshe$ --format '{{.Names}}' | grep -q mitshe; then
    echo "  Removing old container..."
    docker rm mitshe &> /dev/null
fi

# Pull latest image
echo "  Pulling latest image..."
docker pull ghcr.io/mitshe/mitshe:latest

# Run
echo "  Starting mitshe..."
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
    echo -e "${GREEN}✓ mitshe is running!${NC}"
    echo ""
    echo -e "  Open: ${BOLD}http://localhost:3000${NC}"
    echo ""
    echo "  Create your admin account on first visit."
    echo ""
else
    echo ""
    echo -e "${YELLOW}mitshe is starting but not ready yet.${NC}"
    echo "  Check logs: docker logs -f mitshe"
    echo "  Open when ready: http://localhost:3000"
    echo ""
fi

# Ask about desktop app
echo ""
echo -ne "  Install desktop app? [y/N] "
read -r INSTALL_DESKTOP

if [[ "$INSTALL_DESKTOP" =~ ^[Yy]$ ]]; then
    echo ""
    echo "  Downloading desktop app..."

    # Get latest release URL
    LATEST=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null)

    if [[ "$OSTYPE" == "darwin"* ]]; then
        URL=$(echo "$LATEST" | grep -o '"browser_download_url": *"[^"]*\.dmg"' | head -1 | cut -d'"' -f4)
        if [ -n "$URL" ]; then
            TMPFILE="/tmp/mitshe-desktop.dmg"
            curl -fsSL "$URL" -o "$TMPFILE"
            echo "  Mounting installer..."
            hdiutil attach "$TMPFILE" -quiet
            VOLUME=$(ls /Volumes | grep -i mitshe | head -1)
            if [ -n "$VOLUME" ]; then
                cp -R "/Volumes/$VOLUME/mitshe.app" /Applications/ 2>/dev/null || cp -R "/Volumes/$VOLUME/"*.app /Applications/ 2>/dev/null
                hdiutil detach "/Volumes/$VOLUME" -quiet 2>/dev/null
                rm -f "$TMPFILE"
                echo -e "  ${GREEN}✓${NC} Desktop app installed to /Applications"
                echo ""
                echo -e "  Open ${BOLD}mitshe${NC} from Applications or Spotlight."
            else
                echo -e "  ${YELLOW}DMG downloaded to $TMPFILE — open it manually.${NC}"
            fi
        else
            echo -e "  ${YELLOW}No macOS build found in latest release.${NC}"
            echo "  Download manually: https://github.com/${REPO}/releases"
        fi

    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        URL=$(echo "$LATEST" | grep -o '"browser_download_url": *"[^"]*\.AppImage"' | head -1 | cut -d'"' -f4)
        if [ -n "$URL" ]; then
            DEST="$HOME/.local/bin/mitshe"
            mkdir -p "$HOME/.local/bin"
            curl -fsSL "$URL" -o "$DEST"
            chmod +x "$DEST"
            echo -e "  ${GREEN}✓${NC} Desktop app installed to $DEST"
            echo ""
            echo -e "  Run: ${BOLD}mitshe${NC}"
        else
            echo -e "  ${YELLOW}No Linux build found in latest release.${NC}"
            echo "  Download manually: https://github.com/${REPO}/releases"
        fi

    else
        echo -e "  ${YELLOW}Auto-install not supported on this platform.${NC}"
        echo "  Download manually: https://github.com/${REPO}/releases"
    fi
fi

echo ""
echo -e "  ${BOLD}Commands:${NC}"
echo "    curl -fsSL https://mitshe.com/update.sh | sh   # Update"
echo "    docker logs -f mitshe                           # Logs"
echo "    docker stop mitshe                              # Stop"
echo ""

# Open in browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000 2>/dev/null || true
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 2>/dev/null || true
fi
