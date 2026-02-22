#!/bin/bash

# Backend Discovery Service Diagnostic Script
# This script tests all backend endpoints to diagnose SSE streaming issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="https://networkly-scraper-267103342849.us-central1.run.app"
API_TOKEN="Networkly_Scraper_Secure_2026"

echo "=================================================="
echo "Backend Discovery Service Diagnostic"
echo "=================================================="
echo ""
echo "Backend URL: $BACKEND_URL"
echo "Testing started at: $(date)"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check Endpoint"
echo "================================"
echo "Testing: GET $BACKEND_URL/health"
echo ""

HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BACKEND_URL/health" 2>&1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Health check successful"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ FAIL${NC} - Health check failed with HTTP $HTTP_CODE"
    echo "Response: $BODY"
    echo ""
    echo -e "${YELLOW}⚠ Backend service appears to be down or unreachable${NC}"
    echo "This is likely why SSE streaming is not working."
fi
echo ""

# Test 2: Semantic Search (POST)
echo "Test 2: Semantic Search Endpoint (POST /api/v1/search)"
echo "=========================================================="
echo "Testing: POST $BACKEND_URL/api/v1/search"
echo ""

SEARCH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "$BACKEND_URL/api/v1/search" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"machine learning internship","limit":3,"threshold":0.6}' 2>&1)

HTTP_CODE=$(echo "$SEARCH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$SEARCH_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Semantic search successful"
    echo "Response preview:"
    echo "$BODY" | head -c 500
    echo "..."

    # Check if results have valid titles
    UNKNOWN_COUNT=$(echo "$BODY" | grep -o '"title":"Unknown"' | wc -l)
    if [ "$UNKNOWN_COUNT" -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}⚠ WARNING${NC} - Found $UNKNOWN_COUNT results with title='Unknown'"
        echo "Database records may have missing titles. These get filtered out by frontend."
    fi
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${RED}✗ FAIL${NC} - Authentication failed (HTTP 401)"
    echo "API token mismatch. Check DISCOVERY_API_TOKEN in .env.local and Cloud Run."
elif [ "$HTTP_CODE" = "503" ]; then
    echo -e "${RED}✗ FAIL${NC} - Service Unavailable (HTTP 503)"
    echo "Backend service is down or overloaded."
else
    echo -e "${RED}✗ FAIL${NC} - Request failed with HTTP $HTTP_CODE"
    echo "Response: $BODY"
fi
echo ""

# Test 3: SSE Stream Connection (with timeout)
echo "Test 3: SSE Streaming Endpoint (GET /discover/stream)"
echo "========================================================"
echo "Testing: GET $BACKEND_URL/discover/stream?query=test"
echo "Note: Will timeout after 10 seconds to prevent hanging..."
echo ""

# Use timeout command (gtimeout on macOS, timeout on Linux)
TIMEOUT_CMD="timeout"
if command -v gtimeout &> /dev/null; then
    TIMEOUT_CMD="gtimeout"
fi

if command -v $TIMEOUT_CMD &> /dev/null; then
    SSE_OUTPUT=$($TIMEOUT_CMD 10s curl -N -s \
      -H "Authorization: Bearer $API_TOKEN" \
      -H "Accept: text/event-stream" \
      "$BACKEND_URL/discover/stream?query=test" 2>&1 || echo "TIMEOUT_OR_ERROR")

    if echo "$SSE_OUTPUT" | grep -q "event:"; then
        echo -e "${GREEN}✓ PASS${NC} - SSE stream connected and sending events"
        echo "Events received:"
        echo "$SSE_OUTPUT" | head -20
        echo "..."
    elif echo "$SSE_OUTPUT" | grep -q "TIMEOUT_OR_ERROR"; then
        echo -e "${YELLOW}⚠ TIMEOUT${NC} - No events received within 10 seconds"
        echo "Possible causes:"
        echo "  - Backend cold start (first request takes >10s)"
        echo "  - Backend is processing but slow"
        echo "  - Connection hangs before TLS handshake"
    else
        echo -e "${RED}✗ FAIL${NC} - SSE connection failed"
        echo "Output: $SSE_OUTPUT"
    fi
else
    echo -e "${YELLOW}⚠ SKIP${NC} - timeout command not available"
    echo "Install coreutils (brew install coreutils on macOS) to test SSE"
fi
echo ""

# Summary
echo "=================================================="
echo "Diagnostic Summary"
echo "=================================================="
echo ""
echo "If all tests passed:"
echo "  → Backend is healthy. Issue may be in frontend or network."
echo ""
echo "If health check failed:"
echo "  → Backend service is down. Check Google Cloud Run deployment."
echo ""
echo "If semantic search failed with 401:"
echo "  → API token mismatch. Update Cloud Run env vars."
echo ""
echo "If semantic search failed with 503:"
echo "  → Service unavailable. Check Cloud Run logs and resources."
echo ""
echo "If SSE stream timeout:"
echo "  → Cold start issue. Set min-instances=1 on Cloud Run."
echo ""
echo "Next steps:"
echo "  1. Review docs/BACKEND_DEBUGGING.md for detailed troubleshooting"
echo "  2. Check Google Cloud Run logs:"
echo "     gcloud run services logs read networkly-scraper \\"
echo "       --project=networkly-484301 --region=us-central1 --limit=50"
echo "  3. Verify Cloud Run service configuration (memory, timeout, min instances)"
echo ""
echo "Diagnostic completed at: $(date)"
