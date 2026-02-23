#!/usr/bin/env bash

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo -e "${GREEN}Starting setup for Networkly...${NC}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo -e "${YELLOW}pnpm was not found. Enabling via corepack...${NC}"
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@latest --activate
  else
    echo -e "${RED}corepack is not available. Install pnpm and re-run setup.${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}Using pnpm $(pnpm --version)${NC}"

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo -e "${YELLOW}No .env found. Copying .env.example -> .env${NC}"
    cp .env.example .env
    echo -e "${YELLOW}Update .env values before using production APIs.${NC}"
  else
    echo -e "${RED}No .env or .env.example found.${NC}"
    exit 1
  fi
fi

echo -e "${YELLOW}Installing dependencies...${NC}"
if ! pnpm install --frozen-lockfile; then
  echo -e "${YELLOW}Frozen lockfile install failed; retrying with a regular install.${NC}"
  pnpm install
fi

if grep -q "\"db:generate\"" package.json; then
  echo -e "${YELLOW}Generating Prisma client...${NC}"
  if ! pnpm db:generate; then
    echo -e "${YELLOW}Prisma generate failed (likely missing DATABASE_URL). Continuing.${NC}"
  fi
fi

echo -e "${YELLOW}Running production build sanity check...${NC}"
pnpm build

echo -e "${GREEN}Setup complete.${NC}"
echo -e "${YELLOW}Starting development server...${NC}"
"$PROJECT_ROOT/scripts/start-dev.sh"
