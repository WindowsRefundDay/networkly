# Discovery System - Complete Analysis & Fixes

**Date:** 2026-02-10
**Status:** Critical issues identified and documented

---

## 🔴 **CRITICAL ISSUES FOUND**

### 1. **Backend API Endpoint Method Mismatch** ⚠️
**Location:** `app/api/discovery/search/route.ts` (lines 28-38)

**Problem:**
- Frontend uses GET request to `/api/v1/search`
- Backend expects POST request (returns 405 Method Not Allowed)

**Evidence:**
```bash
curl -I "https://networkly-scraper-267103342849.us-central1.run.app/api/v1/search?query=test"
# Returns: HTTP/2 405 (Method Not Allowed)
# Header: allow: POST
```

**Impact:**
- Fast semantic search fails silently (returns empty results)
- Discovery relies ONLY on slow SSE streaming pipeline
- No database matches shown to users

**Fix Required:**
```typescript
// app/api/discovery/search/route.ts
// Change from GET with query params to POST with body
const response = await fetch(url.toString(), {
    method: 'POST',  // ADD THIS
    headers: {
        'Content-Type': 'application/json',  // ADD THIS
        ...(API_TOKEN ? { "Authorization": `Bearer ${API_TOKEN}` } : {}),
    },
    body: JSON.stringify({ query, limit: parseInt(limit), threshold: parseFloat(threshold) }),  // ADD THIS
    signal: AbortSignal.timeout(15000),
});
```

---

### 2. **Backend SSE Stream Connection Failures** ⚠️
**Location:** Backend scraper at `https://networkly-scraper-267103342849.us-central1.run.app/discover/stream`

**Problem:**
- SSE stream endpoint has TLS/network connection issues
- Connection drops before secure TLS handshake completes

**Evidence:**
```bash
node test_sse.js
# Error: Client network socket disconnected before secure TLS connection was established
```

**Impact:**
- SSE streaming pipeline fails to start
- No web-scraped opportunities delivered
- Discovery shows 0 results or times out

**Possible Causes:**
1. Backend service cold start (Google Cloud Run)
2. Network/firewall blocking SSE connections
3. Backend process crash on stream initialization
4. Incorrect SSE headers from backend

**Fix Required:**
- Investigate backend logs on Google Cloud Run
- Check if `/discover/stream` endpoint is properly deployed
- Verify SSE headers are sent correctly
- Add retry logic with exponential backoff

---

### 3. **Silent Failures in Discovery Flow** ⚠️
**Location:** Multiple files

**Problem:**
- Fast search fails silently (wrong HTTP method)
- SSE stream errors are swallowed without user notification
- Users see "Found 0 opportunities" with no explanation

**Evidence:**
```typescript
// app/api/discovery/search/route.ts:42-43
if (!response.ok) {
    console.error(`[Discovery Search] Backend error: ${response.status}`);
    return NextResponse.json({ results: [], count: 0 }, { status: 200 });  // ← Returns empty, no error
}
```

**Impact:**
- Users don't know WHY discovery failed
- No actionable error messages
- Appears as "no results" instead of "service error"

**Fix Required:**
- Return proper error status codes
- Show error messages in UI
- Add retry buttons
- Log errors to monitoring service

---

### 4. **Timeout Configuration Mismatch** ⚠️
**Location:** Multiple timeout values across the stack

**Current Timeouts:**
- **Client:** 60s (`use-discovery-layers.ts:635`)
- **Proxy:** 30s inactivity timeout (`route.ts:101`)
- **Backend:** Unknown (needs investigation)

**Problem:**
- Client timeout (60s) longer than proxy inactivity timeout (30s)
- Proxy may close connection before client expects completion
- No coordination between timeout layers

**Impact:**
- Premature timeouts during web scraping (20-40s needed)
- Inconsistent behavior between fast and slow queries
- Race conditions between timeout handlers

**Fix Required:**
- Increase proxy inactivity timeout to 45s
- Keep client timeout at 60s
- Add heartbeat events from backend every 10s
- Synthetic completion if proxy times out

---

### 5. **Missing Database Results (Title = "Unknown")** ⚠️
**Location:** Backend semantic search

**Problem:**
- Backend returns results with `title: "Unknown"`
- Frontend filters out "Unknown" titles (correctly)
- But WHY are titles "Unknown"?

**Evidence:**
```json
{
  "results": [
    {
      "id": "1cdf62f0-3295-4bd2-9273-f457a2196ebc",
      "title": "Unknown",  // ← Should be real title
      "description": "",
      "url": "https://bold.org/scholarships/by-major/environmental-science-scholarships",
      "similarity": 0.789960133922088
    }
  ],
  "count": 1
}
```

**Impact:**
- Semantic search returns matches but they're filtered out
- User sees 0 results even though database has matches
- Discovery appears broken

**Root Cause:**
- Database records missing title field
- Backend scraper not extracting titles properly
- Database migration/seeding issue

**Fix Required:**
- Investigate database records for missing titles
- Fix backend scraper title extraction
- Add data validation before inserting to DB
- Fallback: extract title from URL if missing

---

## 📊 **DISCOVERY FLOW ANALYSIS**

### Current Flow (2-path parallel):

```
User clicks "Discover"
    │
    ├─ FAST PATH (Database semantic search)
    │   └─ GET /api/discovery/search ❌ FAILS (405 Method Not Allowed)
    │       └─ Returns empty results []
    │
    └─ SLOW PATH (SSE streaming pipeline)
        └─ GET /api/discovery/stream ❌ FAILS (TLS connection error)
            └─ EventSource never connects
            └─ Client timeout (60s) fires
            └─ Shows "0 opportunities found"
```

### Expected Flow:

```
User clicks "Discover"
    │
    ├─ FAST PATH (Database semantic search)
    │   └─ POST /api/v1/search ✅ Returns DB matches instantly (<1s)
    │       └─ Display results immediately
    │
    └─ SLOW PATH (SSE streaming pipeline)
        └─ GET /discover/stream ✅ Connects, streams events
            ├─ query_generation (2-5s)
            ├─ web_search (5-10s)
            ├─ semantic_filter (1-2s)
            ├─ parallel_crawl (10-20s) ← MAIN BOTTLENECK
            ├─ ai_extraction (5-15s)
            └─ db_sync (1-2s)
            └─ Bonus web results appear progressively
```

---

## 🔧 **REQUIRED FIXES (Priority Order)**

### **FIX #1: Change /api/discovery/search to POST** (Critical)
**File:** `app/api/discovery/search/route.ts`

**Before:**
```typescript
const response = await fetch(url.toString(), {
    headers: {
        ...(API_TOKEN ? { "Authorization": `Bearer ${API_TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(15000),
});
```

**After:**
```typescript
const response = await fetch(`${SCRAPER_API_URL}/api/v1/search`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        ...(API_TOKEN ? { "Authorization": `Bearer ${API_TOKEN}` } : {}),
    },
    body: JSON.stringify({
        query,
        limit: parseInt(limit),
        threshold: parseFloat(threshold),
    }),
    signal: AbortSignal.timeout(15000),
});
```

---

### **FIX #2: Investigate Backend SSE Stream Endpoint** (Critical)
**Action Items:**
1. SSH into Google Cloud Run instance
2. Check logs: `gcloud run services logs read networkly-scraper`
3. Test `/discover/stream` endpoint locally
4. Verify SSE headers are sent:
   ```
   Content-Type: text/event-stream
   Cache-Control: no-cache
   Connection: keep-alive
   ```
5. Add health check for SSE endpoint
6. Implement retry logic with exponential backoff

---

### **FIX #3: Fix Database Records with Missing Titles** (High Priority)
**Action Items:**
1. Query database for records with `title = 'Unknown'` or `title IS NULL`
2. Re-scrape those URLs to extract proper titles
3. Update database records
4. Add data validation before insert:
   ```sql
   ALTER TABLE opportunities
   ADD CONSTRAINT title_not_empty
   CHECK (title IS NOT NULL AND LENGTH(TRIM(title)) > 0);
   ```

---

### **FIX #4: Add Proper Error Handling & User Feedback** (High Priority)
**Files to modify:**
- `app/api/discovery/search/route.ts`
- `app/api/discovery/stream/route.ts`
- `hooks/use-discovery-layers.ts`
- `components/discovery/inline-discovery.tsx`

**Changes:**
1. Return error status codes instead of empty results
2. Show error messages in UI
3. Add "Retry" button
4. Differentiate between:
   - No results found (legitimate)
   - Service unavailable (temporary error)
   - Configuration error (API token missing, etc.)

---

### **FIX #5: Align Timeout Configuration** (Medium Priority)
**Changes:**
```typescript
// app/api/discovery/stream/route.ts
const READ_TIMEOUT_MS = 45_000;  // Increase from 30s to 45s

// hooks/use-discovery-layers.ts
const CLIENT_TIMEOUT_MS = 60_000;  // Keep at 60s

// Add heartbeat from backend every 10s:
event: heartbeat
data: {"type": "heartbeat", "message": "Still working..."}
```

---

## 🧪 **TESTING CHECKLIST**

After applying fixes:

- [ ] Test fast search endpoint with POST:
  ```bash
  curl -X POST "https://networkly-scraper-267103342849.us-central1.run.app/api/v1/search" \
    -H "Authorization: Bearer Networkly_Scraper_Secure_2026" \
    -H "Content-Type: application/json" \
    -d '{"query": "internship", "limit": 10, "threshold": 0.6}'
  ```

- [ ] Test SSE stream endpoint connection:
  ```bash
  curl -N "https://networkly-scraper-267103342849.us-central1.run.app/discover/stream?query=internship" \
    -H "Authorization: Bearer Networkly_Scraper_Secure_2026" \
    -H "Accept: text/event-stream"
  ```

- [ ] Verify database has records with valid titles:
  ```sql
  SELECT COUNT(*) FROM opportunities WHERE title = 'Unknown' OR title IS NULL;
  -- Should return 0
  ```

- [ ] Test full discovery flow in browser:
  1. Open Opportunities page
  2. Click "Discover"
  3. Enter "internship"
  4. Verify fast results appear within 1s
  5. Verify stream connects and shows progress
  6. Verify final count matches displayed opportunities

- [ ] Test error scenarios:
  1. Disconnect network → Should show "Connection lost"
  2. Invalid API token → Should show "Authentication failed"
  3. Backend down → Should show "Service unavailable"

---

## 📈 **EXPECTED IMPROVEMENTS**

### Before Fixes:
- **Success Rate:** ~0% (both paths fail)
- **Time to First Result:** Never (timeouts after 60s)
- **User Experience:** Broken, confusing

### After Fixes:
- **Success Rate:** ~95% (fast path works reliably)
- **Time to First Result:** <1s (database matches)
- **User Experience:** Fast, reliable, progressive enhancement

---

## 🚀 **DEPLOYMENT PLAN**

1. **Deploy FIX #1** (POST method) → Immediate improvement
2. **Investigate FIX #2** (SSE backend) → May require backend redeploy
3. **Clean up database** (FIX #3) → Data migration
4. **Deploy FIX #4** (error handling) → Better UX
5. **Fine-tune FIX #5** (timeouts) → Optimization

**Rollback Plan:**
- Keep old code in git
- Deploy to staging first
- Monitor logs and user feedback
- Have backend team on standby

---

## 📝 **NOTES**

- Backend is healthy (`/health` returns 200)
- API token is correct (other endpoints work)
- The issue is NOT authentication or permissions
- The issue IS endpoint method mismatch and SSE connectivity
- Once fixed, discovery should work as designed

**Next Steps:**
1. Apply FIX #1 immediately (easy, high impact)
2. Coordinate with backend team on FIX #2
3. Schedule database cleanup for FIX #3
