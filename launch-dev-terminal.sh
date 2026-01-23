#!/bin/bash

# Networkly Development Environment Launcher (macOS Terminal.app)
# Opens separate Terminal windows for each service

set -e

PROJECT_ROOT="/Users/joelmanuel/Downloads/Networkly-Frontend"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Networkly Development Environment${NC}"
echo -e "${BLUE}  (macOS Terminal.app Version)${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to open new terminal window with command
open_terminal_window() {
    local title=$1
    local command=$2
    
    osascript <<EOF
tell application "Terminal"
    do script "echo '=== $title ===' && cd '$PROJECT_ROOT' && $command"
    set custom title of front window to "$title"
end tell
EOF
}

echo -e "${GREEN}[1/5] Opening Next.js Frontend...${NC}"
open_terminal_window "Networkly Frontend" "pnpm dev"

sleep 1

echo -e "${GREEN}[2/5] Opening Scheduled Discovery Terminal...${NC}"
open_terminal_window "EC-Scraper: Scheduled" "cd ec-scraper && echo 'Run: python3 scripts/scheduled_discovery.py --limit 100' && bash"

sleep 1

echo -e "${GREEN}[3/5] Opening Personalized Discovery Terminal...${NC}"
open_terminal_window "EC-Scraper: Personalized" "cd ec-scraper && echo 'Run: python3 scripts/personalized_discovery.py <user_id> \"query\"' && bash"

sleep 1

echo -e "${GREEN}[4/5] Opening Database Monitor...${NC}"
open_terminal_window "Database Monitor" "echo 'Database Tools:' && echo '  - pnpm db:studio' && echo '  - Connect via DATABASE_URL' && bash"

sleep 1

echo -e "${GREEN}[5/5] Opening Debug Terminal...${NC}"
open_terminal_window "Debug & Logs" "echo 'Debug Terminal Ready' && echo 'Available:' && echo '  - cd ec-scraper' && echo '  - pnpm test' && echo '  - tail -f logs/*.log' && bash"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ All terminals opened!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Services:${NC}"
echo "  Frontend:      http://localhost:3000"
echo "  Scheduled:     Manual/Cron trigger"
echo "  Personalized:  API triggered"
echo "  Database:      PostgreSQL"
echo "  Debug:         Logs & Testing"
echo ""
echo -e "${YELLOW}Tip: Use Command+\` to switch between Terminal windows${NC}"
