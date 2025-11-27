#!/bin/bash
set -e

# Qu-Zing! - Choose your deployment: Docker Compose or Kubernetes
# Docker: Redis, 3 servers, Nginx LB, Cloudflare tunnel
# K8s: Minikube local cluster with ingress

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
MODE=""
DEBUG=false

for arg in "$@"; do
    case "$arg" in
        --debug|debug)
            DEBUG=true
            ;;
        docker|compose|hot|k8s)
            MODE="$arg"
            ;;
    esac
done

# Default mode
MODE=${MODE:-k8s}
export DEBUG

if [ "$DEBUG" = true ]; then
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║             Qu-Zing! - Development Launcher               ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
fi

# Helper for conditional output
log() {
    if [ "$DEBUG" = true ]; then
        echo -e "$@"
    fi
}

if [ "$MODE" == "docker" ] || [ "$MODE" == "compose" ]; then
    log "${CYAN}Mode: Docker Compose${NC}"
    log ""
    
    # Check Docker dependencies
    command -v docker >/dev/null 2>&1 || { echo -e "${RED}✗ Docker required${NC}"; exit 1; }
    command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}✗ Docker Compose required${NC}"; exit 1; }
    
    exec "$0-docker"
elif [ "$MODE" == "hot" ]; then
    exec "$0-hot"
else
    log "${MAGENTA}Mode: Kubernetes (Minikube)${NC}"
    log "${YELLOW}Tip: Run './dev.sh docker' for Docker Compose, './dev.sh hot' for local hot reload${NC}"
    log ""
    
    # Check K8s dependencies
    command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}✗ kubectl required (sudo pacman -S kubectl)${NC}"; exit 1; }
    command -v minikube >/dev/null 2>&1 || { echo -e "${RED}✗ minikube required (sudo pacman -S minikube)${NC}"; exit 1; }
    command -v cloudflared >/dev/null 2>&1 || { echo -e "${RED}✗ cloudflared required (sudo pacman -S cloudflared)${NC}"; exit 1; }
    
    exec "$0-k8s"
fi


