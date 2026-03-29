#!/bin/bash
set -euo pipefail

#######################################
# Blue-Green Deployment Script
#
# Usage:
#   ./deploy.sh [web|api|all] [version]
#
# Examples:
#   ./deploy.sh web v1.2.3      # Deploy web only
#   ./deploy.sh api v2.0.0      # Deploy api only
#   ./deploy.sh all latest      # Deploy both
#######################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
STATE_FILE=".deploy-state"
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=2

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[$(date +'%H:%M:%S')] ✓${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠${NC} $1"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ✗${NC} $1"; exit 1; }

# Get current active color (blue or green)
get_active_color() {
    local service=$1
    if [[ -f "$STATE_FILE" ]]; then
        grep "^${service}=" "$STATE_FILE" 2>/dev/null | cut -d= -f2 || echo "blue"
    else
        echo "blue"
    fi
}

# Set active color
set_active_color() {
    local service=$1
    local color=$2

    if [[ -f "$STATE_FILE" ]]; then
        # Update existing entry or add new
        if grep -q "^${service}=" "$STATE_FILE"; then
            sed -i "s/^${service}=.*/${service}=${color}/" "$STATE_FILE"
        else
            echo "${service}=${color}" >> "$STATE_FILE"
        fi
    else
        echo "${service}=${color}" > "$STATE_FILE"
    fi
}

# Get inactive color
get_inactive_color() {
    local active=$(get_active_color "$1")
    [[ "$active" == "blue" ]] && echo "green" || echo "blue"
}

# Health check - wait for Docker health status
health_check() {
    local service=$1
    local port=$2
    local retries=$HEALTH_CHECK_RETRIES

    log "Waiting for $service to be healthy..."

    while [[ $retries -gt 0 ]]; do
        local status=$(docker compose -f "$COMPOSE_FILE" ps "$service" --format json 2>/dev/null | jq -r '.[0].Health // "none"' 2>/dev/null || echo "starting")

        if [[ "$status" == "healthy" ]]; then
            success "$service is healthy"
            return 0
        fi

        # Fallback: check if container is running and port responds
        if docker compose -f "$COMPOSE_FILE" exec -T "$service" node -e "fetch('http://localhost:${port}').then(() => process.exit(0)).catch(() => process.exit(1))" 2>/dev/null; then
            success "$service is healthy (port check)"
            return 0
        fi

        retries=$((retries - 1))
        sleep $HEALTH_CHECK_INTERVAL
    done

    error "$service failed health check after $HEALTH_CHECK_RETRIES attempts"
}

# Update Cloudflare tunnel config
update_tunnel_config() {
    local web_target=$1
    local api_target=$2

    log "Updating Cloudflare tunnel config..."

    # Update ingress rules
    sed -i "s/http:\/\/web-\(blue\|green\):3000/http:\/\/${web_target}:3000/g" cloudflared/config.yml
    sed -i "s/http:\/\/api-\(blue\|green\):3001/http:\/\/${api_target}:3001/g" cloudflared/config.yml

    # Restart cloudflared to pick up changes
    docker compose -f "$COMPOSE_FILE" restart cloudflared

    success "Tunnel config updated"
}

# Deploy service
deploy_service() {
    local service=$1  # web or api
    local version=$2
    local port=$([[ "$service" == "web" ]] && echo "3000" || echo "3001")

    local active=$(get_active_color "$service")
    local inactive=$(get_inactive_color "$service")
    local new_container="${service}-${inactive}"
    local old_container="${service}-${active}"

    log "Deploying $service version $version"
    log "Current: $old_container → New: $new_container"

    # Export version for docker-compose
    if [[ "$service" == "web" ]]; then
        export WEB_VERSION="$version"
    else
        export API_VERSION="$version"
    fi

    # Pull new image
    log "Pulling new image..."
    docker compose -f "$COMPOSE_FILE" --profile "$inactive" pull "$new_container"

    # Start new container
    log "Starting $new_container..."
    docker compose -f "$COMPOSE_FILE" --profile "$inactive" up -d "$new_container"

    # Health check
    health_check "$new_container" "$port"

    # Update tunnel to point to new container
    local web_target=$([[ "$service" == "web" ]] && echo "$new_container" || echo "web-$(get_active_color web)")
    local api_target=$([[ "$service" == "api" ]] && echo "$new_container" || echo "api-$(get_active_color api)")
    update_tunnel_config "$web_target" "$api_target"

    # Wait for traffic to drain
    log "Waiting for traffic to drain from $old_container..."
    sleep 5

    # Stop old container
    log "Stopping $old_container..."
    docker compose -f "$COMPOSE_FILE" --profile "$active" stop "$old_container"

    # Update state
    set_active_color "$service" "$inactive"

    success "Deployed $service $version (now running on $new_container)"
}

# Rollback service
rollback_service() {
    local service=$1
    local active=$(get_active_color "$service")
    local inactive=$(get_inactive_color "$service")
    local current="${service}-${active}"
    local previous="${service}-${inactive}"

    warn "Rolling back $service from $current to $previous..."

    # Check if previous container exists
    if ! docker compose -f "$COMPOSE_FILE" ps "$previous" --quiet 2>/dev/null; then
        error "No previous version to rollback to"
    fi

    # Start previous container
    docker compose -f "$COMPOSE_FILE" --profile "$inactive" start "$previous"

    # Update tunnel
    local web_target=$([[ "$service" == "web" ]] && echo "$previous" || echo "web-$(get_active_color web)")
    local api_target=$([[ "$service" == "api" ]] && echo "$previous" || echo "api-$(get_active_color api)")
    update_tunnel_config "$web_target" "$api_target"

    # Stop current
    docker compose -f "$COMPOSE_FILE" --profile "$active" stop "$current"

    # Update state
    set_active_color "$service" "$inactive"

    success "Rolled back $service to $previous"
}

# Main
main() {
    local command=${1:-help}
    local version=${2:-latest}

    case "$command" in
        web)
            deploy_service "web" "$version"
            ;;
        api)
            deploy_service "api" "$version"
            ;;
        all)
            deploy_service "api" "$version"
            deploy_service "web" "$version"
            ;;
        rollback-web)
            rollback_service "web"
            ;;
        rollback-api)
            rollback_service "api"
            ;;
        rollback-all)
            rollback_service "api"
            rollback_service "web"
            ;;
        status)
            echo "Web: $(get_active_color web)"
            echo "API: $(get_active_color api)"
            docker compose -f "$COMPOSE_FILE" ps
            ;;
        infra)
            log "Starting infrastructure (postgres, redis, cloudflared)..."
            docker compose -f "$COMPOSE_FILE" up -d postgres redis cloudflared
            success "Infrastructure started"
            ;;
        help|*)
            echo "Usage: $0 <command> [version]"
            echo ""
            echo "Commands:"
            echo "  web <version>      Deploy web (Next.js)"
            echo "  api <version>      Deploy API (NestJS)"
            echo "  all <version>      Deploy both"
            echo "  rollback-web       Rollback web to previous"
            echo "  rollback-api       Rollback API to previous"
            echo "  rollback-all       Rollback both"
            echo "  status             Show current state"
            echo "  infra              Start infrastructure only"
            echo ""
            echo "Examples:"
            echo "  $0 web v1.2.3"
            echo "  $0 all latest"
            echo "  $0 rollback-api"
            ;;
    esac
}

main "$@"
