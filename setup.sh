#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting setup for Networkly-Frontend...${NC}"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm is not installed. Attempting to install via npm...${NC}"
    if command -v npm &> /dev/null; then
        npm install -g pnpm
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}pnpm installed successfully.${NC}"
        else
            echo -e "${RED}Failed to install pnpm. Please install it manually: npm install -g pnpm${NC}"
            exit 1
        fi
    else
        echo -e "${RED}npm is not installed. Please install Node.js and npm to proceed.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}pnpm is already installed.${NC}"
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pnpm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Dependencies installed successfully.${NC}"
else
    echo -e "${RED}Failed to install dependencies.${NC}"
    exit 1
fi

# Start the development server
echo -e "${GREEN}Starting the development server...${NC}"
echo -e "${YELLOW}The application will be available at http://localhost:3000${NC}"
pnpm dev
