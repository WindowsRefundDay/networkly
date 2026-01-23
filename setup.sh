#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting setup for Networkly-Frontend...${NC}"

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${YELLOW}Bun is not installed. Installing...${NC}"
    curl -fsSL https://bun.sh/install | bash
    
    # Source the shell config to make bun available
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    
    if command -v bun &> /dev/null; then
        echo -e "${GREEN}Bun installed successfully.${NC}"
    else
        echo -e "${RED}Failed to install Bun. Please install it manually: curl -fsSL https://bun.sh/install | bash${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Bun is already installed: $(bun --version)${NC}"
fi

# Check for .env file
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "${YELLOW}No .env file found. Copying from .env.example...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}Please edit .env and fill in your configuration values.${NC}"
    else
        echo -e "${RED}No .env or .env.example file found. Please create a .env file.${NC}"
        exit 1
    fi
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
bun install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Dependencies installed successfully.${NC}"
else
    echo -e "${RED}Failed to install dependencies.${NC}"
    exit 1
fi

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
bun run db:generate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Prisma client generated successfully.${NC}"
else
    echo -e "${YELLOW}Warning: Prisma client generation failed. Make sure DATABASE_URL is set in .env${NC}"
fi

# Start the development server
echo -e "${GREEN}Starting the development server...${NC}"
echo -e "${YELLOW}The application will be available at http://localhost:3000${NC}"
bun dev
