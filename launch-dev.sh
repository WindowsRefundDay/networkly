#!/bin/bash

# Networkly Development Environment Launcher
# Launches all services in separate tmux panes

set -e

SESSION_NAME="networkly-dev"
PROJECT_ROOT="/Users/joelmanuel/Downloads/Networkly-Frontend"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Networkly Development Environment${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo -e "${YELLOW}tmux is not installed. Installing via homebrew...${NC}"
    brew install tmux
fi

# Kill existing session if it exists
tmux has-session -t $SESSION_NAME 2>/dev/null && {
    echo -e "${YELLOW}Killing existing session...${NC}"
    tmux kill-session -t $SESSION_NAME
}

echo -e "${GREEN}Creating new tmux session: $SESSION_NAME${NC}"

# Create new session with first window (Next.js Frontend)
tmux new-session -d -s $SESSION_NAME -n "frontend"

# Window 1: Next.js Frontend
echo -e "${GREEN}[1/4] Starting Next.js Frontend (port 3000)${NC}"
tmux send-keys -t $SESSION_NAME:0 "cd $PROJECT_ROOT" C-m
tmux send-keys -t $SESSION_NAME:0 "echo -e '\033[1;36m=== Next.js Frontend (http://localhost:3000) ===\033[0m'" C-m
tmux send-keys -t $SESSION_NAME:0 "pnpm dev" C-m

# Window 2: EC-Scraper Scheduled Discovery
echo -e "${GREEN}[2/4] Starting Scheduled Discovery (runs every 24h)${NC}"
tmux new-window -t $SESSION_NAME:1 -n "scheduled-discovery"
tmux send-keys -t $SESSION_NAME:1 "cd $PROJECT_ROOT/ec-scraper" C-m
tmux send-keys -t $SESSION_NAME:1 "echo -e '\033[1;33m=== Scheduled Discovery (Daily Batch) ===\033[0m'" C-m
tmux send-keys -t $SESSION_NAME:1 "echo 'To run manually: python3 scripts/scheduled_discovery.py --limit 100'" C-m
tmux send-keys -t $SESSION_NAME:1 "echo 'Waiting for manual trigger or cron job...'" C-m

# Window 3: EC-Scraper Personalized Discovery (API Ready)
echo -e "${GREEN}[3/4] EC-Scraper API Ready (personalized discovery)${NC}"
tmux new-window -t $SESSION_NAME:2 -n "personalized-api"
tmux send-keys -t $SESSION_NAME:2 "cd $PROJECT_ROOT/ec-scraper" C-m
tmux send-keys -t $SESSION_NAME:2 "echo -e '\033[1;32m=== Personalized Discovery API (Ready) ===\033[0m'" C-m
tmux send-keys -t $SESSION_NAME:2 "echo 'Triggered via Next.js API: /api/discovery/personalized'" C-m
tmux send-keys -t $SESSION_NAME:2 "echo 'Test command: python3 scripts/personalized_discovery.py <user_id> \"<query>\"'" C-m

# Window 4: Database Monitor (optional)
echo -e "${GREEN}[4/4] Database Monitor${NC}"
tmux new-window -t $SESSION_NAME:3 -n "database"
tmux send-keys -t $SESSION_NAME:3 "cd $PROJECT_ROOT/ec-scraper" C-m
tmux send-keys -t $SESSION_NAME:3 "echo -e '\033[1;35m=== Database Monitor ===\033[0m'" C-m
tmux send-keys -t $SESSION_NAME:3 "echo 'Run: pnpm db:studio (from main directory)'" C-m
tmux send-keys -t $SESSION_NAME:3 "echo 'Or connect directly to PostgreSQL via DATABASE_URL'" C-m

# Window 5: Logs & Debugging
echo -e "${GREEN}[5/5] Logs & Debug Terminal${NC}"
tmux new-window -t $SESSION_NAME:4 -n "debug"
tmux send-keys -t $SESSION_NAME:4 "cd $PROJECT_ROOT" C-m
tmux send-keys -t $SESSION_NAME:4 "echo -e '\033[1;34m=== Debug & Logs Terminal ===\033[0m'" C-m
tmux send-keys -t $SESSION_NAME:4 "echo 'Available commands:'" C-m
tmux send-keys -t $SESSION_NAME:4 "echo '  - tail -f logs/*.log          (watch logs)'" C-m
tmux send-keys -t $SESSION_NAME:4 "echo '  - cd ec-scraper && python3 ... (run scripts)'" C-m
tmux send-keys -t $SESSION_NAME:4 "echo '  - pnpm test                   (run tests)'" C-m

# Select first window (frontend)
tmux select-window -t $SESSION_NAME:0

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Development environment started!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Tmux Commands:${NC}"
echo "  - Attach:        tmux attach -t $SESSION_NAME"
echo "  - Switch window: Ctrl+b then 0-4"
echo "  - Detach:        Ctrl+b then d"
echo "  - Kill all:      tmux kill-session -t $SESSION_NAME"
echo ""
echo -e "${YELLOW}Services:${NC}"
echo "  [0] Frontend:      http://localhost:3000"
echo "  [1] Scheduled:     ec-scraper/scheduled_discovery.py"
echo "  [2] Personalized:  ec-scraper/personalized_discovery.py"
echo "  [3] Database:      PostgreSQL monitor"
echo "  [4] Debug:         Logs & testing"
echo ""
echo -e "${GREEN}Attaching to session...${NC}"

# Attach to session
tmux attach-session -t $SESSION_NAME
