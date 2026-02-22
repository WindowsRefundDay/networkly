#!/bin/bash

# TypeScript Error Fixer Helper Script
# This script helps systematically fix TypeScript errors

set -e

echo "=== Networkly TypeScript Error Fixer ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Count current errors
count_errors() {
    npx tsc --noEmit 2>&1 | grep "error TS" | wc -l | tr -d ' '
}

echo "Counting current TypeScript errors..."
INITIAL_ERRORS=$(count_errors)
echo -e "${RED}Current errors: $INITIAL_ERRORS${NC}"
echo ""

# Function to show progress
show_progress() {
    local current=$(count_errors)
    local fixed=$((INITIAL_ERRORS - current))
    echo ""
    echo "================================="
    echo -e "${GREEN}Fixed: $fixed errors${NC}"
    echo -e "${YELLOW}Remaining: $current errors${NC}"
    echo "================================="
    echo ""
}

# Check if files exist
echo "Checking quick wins..."

# 1. Check image types
if [ ! -f "types/images.d.ts" ]; then
    echo -e "${YELLOW}Creating image type declarations...${NC}"
    mkdir -p types
    cat > types/images.d.ts << 'EOF'
declare module '*.png' {
  const value: string
  export default value
}

declare module '*.jpg' {
  const value: string
  export default value
}

declare module '*.jpeg' {
  const value: string
  export default value
}

declare module '*.svg' {
  const value: string
  export default value
}

declare module '*.webp' {
  const value: string
  export default value
}

declare module '*.gif' {
  const value: string
  export default value
}
EOF
    echo -e "${GREEN}✓ Created image type declarations${NC}"
else
    echo -e "${GREEN}✓ Image types already exist${NC}"
fi

# 2. Check GlassCard component
if [ ! -f "components/ui/glass-card.tsx" ]; then
    echo -e "${YELLOW}Creating GlassCard component...${NC}"
    cat > components/ui/glass-card.tsx << 'EOF'
import React from "react"
import { cn } from "@/lib/utils"

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-background/50 backdrop-blur-md border border-border/50 shadow-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
EOF
    echo -e "${GREEN}✓ Created GlassCard component${NC}"
else
    echo -e "${GREEN}✓ GlassCard component already exists${NC}"
fi

# 3. Check lib/types.ts
if [ ! -f "lib/types.ts" ]; then
    echo -e "${YELLOW}lib/types.ts not found. Please create it manually using FIX_GUIDE.md${NC}"
else
    echo -e "${GREEN}✓ lib/types.ts exists${NC}"
fi

show_progress

# Get list of files with most errors
echo "Files with most TypeScript errors:"
echo "===================================="
npx tsc --noEmit 2>&1 | grep "error TS" | cut -d'(' -f1 | sort | uniq -c | sort -rn | head -20
echo ""

# Create error summary
echo "Creating detailed error summary in typescript-errors-summary.txt..."
npx tsc --noEmit 2>&1 > typescript-errors-summary.txt
echo -e "${GREEN}✓ Error summary created${NC}"

# Group errors by type
echo ""
echo "Error types distribution:"
echo "========================="
grep "error TS" typescript-errors-summary.txt | sed 's/.*error /error /' | cut -d':' -f1 | sort | uniq -c | sort -rn | head -10
echo ""

echo "Next steps:"
echo "==========="
echo "1. Review FIX_GUIDE.md for detailed fixing strategies"
echo "2. Check typescript-errors-summary.txt for full error list"
echo "3. Fix high-impact files first (shown above)"
echo "4. Run 'npm run lint -- --fix' to auto-fix some issues"
echo "5. Re-run this script to track progress"
echo ""
echo -e "${YELLOW}Tip: Focus on fixing one file at a time, starting with server actions in app/actions/${NC}"
