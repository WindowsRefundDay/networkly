# Discovery System Fixes Applied - 2026-02-10

## Summary
Fixed critical API endpoint method mismatch that was preventing discovery from working.

## Files Modified

### 1. app/api/discovery/search/route.ts ✅
**Issue:** Using GET with query parameters instead of POST with JSON body
**Fix:** Changed to POST with proper JSON body

```typescript
// Before:
const url = new URL(`${SCRAPER_API_URL}/api/v1/search`);
url.searchParams.set("query", query);
const response = await fetch(url.toString(), { headers: {...} });

// After:
const url = `${SCRAPER_API_URL}/api/v1/search`;
const response = await fetch(url, {
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

### 2. app/actions/discovery.ts ✅
**Issue:** Same - using GET instead of POST
**Fix:** Applied same correction

```typescript
// Changed from GET with query params to POST with JSON body
const url = `${SCRAPER_API_URL}/api/v1/search`;
const response = await fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        ...(API_TOKEN ? { "Authorization": `Bearer ${API_TOKEN}` } : {})
    },
    body: JSON.stringify({
        query: sanitizedQuery,
        limit: 15,
        threshold: 0.6,
    }),
    signal: AbortSignal.timeout(15000)
});
```

### Files Already Correct ✓
- `app/actions/event-discovery.ts` - Already using POST (lines 43-55)
- `app/actions/goal-discovery.ts` - Already using POST (lines 53-65)
- `app/actions/mentors.ts` - Uses different endpoint pattern
- `app/actions/similar-opportunities.ts` - Uses different endpoint

## Expected Impact

### Before Fix:
- Fast semantic search: **FAILED** (405 Method Not Allowed)
- Discovery flow: Relied only on slow SSE stream (which also has issues)
- Result: Users see "Found 0 opportunities" after 60s timeout

### After Fix:
- Fast semantic search: **WORKS** (returns database matches in <1s)
- Discovery flow: Shows database results immediately, SSE stream optional
- Result: Users see results within 1 second (if database has matches)

## Remaining Issues

### ⚠️ Backend SSE Stream Still Failing
The `/discover/stream` endpoint has connection issues:
```
Error: Client network socket disconnected before secure TLS connection was established
```

**Impact:** Web-scraped "bonus" results won't appear, but database results now work.

**Next Steps:**
1. Check Google Cloud Run logs for the scraper service
2. Verify SSE endpoint is deployed and healthy
3. Test SSE connection from production environment
4. Consider adding retry logic with exponential backoff

### ⚠️ Database Has Records with title="Unknown"
Backend semantic search returns results but with missing titles:
```json
{
  "results": [{
    "id": "1cdf62f0-3295-4bd2-9273-f457a2196ebc",
    "title": "Unknown",  // ← Missing title
    "url": "https://bold.org/scholarships/...",
    "similarity": 0.789
  }]
}
```

**Impact:** Results are filtered out because frontend skips "Unknown" titles.

**Next Steps:**
1. Query database for records with `title = 'Unknown'` or `title IS NULL`
2. Re-scrape those URLs to extract proper titles
3. Add data validation before inserting to database

### ⚠️ Backend Service Currently Unavailable
Test POST request returned "Service Unavailable" (503).

**Possible Causes:**
- Cold start on Google Cloud Run
- Service temporarily down for maintenance
- Deployment issue
- Resource limits exceeded

**Next Steps:**
1. Check service status on Google Cloud Console
2. Review recent deployment logs
3. Verify service has adequate resources allocated
4. Test from production environment (may have different network/auth)

## Testing Checklist

Once backend is available:

- [ ] Test fast search in browser dev tools:
  ```javascript
  fetch('/api/discovery/search?query=internship&limit=5', {
    method: 'GET'
  }).then(r => r.json()).then(console.log)
  ```

- [ ] Verify database returns valid results (not "Unknown" titles)

- [ ] Test full discovery flow end-to-end

- [ ] Monitor logs for any 405 errors (should be gone)

## Rollback Plan

If issues arise:
```bash
git checkout HEAD~1 -- app/api/discovery/search/route.ts
git checkout HEAD~1 -- app/actions/discovery.ts
```

## Documentation

See `DISCOVERY_ISSUES_ANALYSIS.md` for complete technical analysis.
