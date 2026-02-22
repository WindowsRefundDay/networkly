# Backend Discovery Service Debugging Guide

This guide helps you diagnose and fix issues with the SSE streaming pipeline that connects to the Google Cloud Run backend scraper service.

---

## Quick Diagnosis

Run the automated diagnostic script:

```bash
./scripts/debug-backend.sh
```

This will test all backend endpoints and report which components are failing.

---

## Understanding the Problem

### Symptoms
- Discovery shows "Found 0 opportunities" after timeout
- Only database results appear (no web-scraped results)
- EventSource `onerror` fires in browser console
- SSE stream never connects

### Root Cause
The backend scraper service at `https://networkly-scraper-267103342849.us-central1.run.app` is either:
1. Not deployed or offline
2. Experiencing cold starts that exceed timeout
3. Out of memory or resources
4. Misconfigured (wrong env vars, API token)

---

## Step-by-Step Debugging

### Step 1: Verify Backend Health

```bash
curl https://networkly-scraper-267103342849.us-central1.run.app/health
```

**Expected:** `{"status":"healthy"}`

**If fails:**
- Backend service is down
- Proceed to Step 2 (Check Cloud Run Status)

**If succeeds:**
- Backend is running
- Proceed to Step 3 (Test API endpoints)

---

### Step 2: Check Google Cloud Run Status

**Prerequisites:**
- Google Cloud Console access
- Project: `networkly-484301`
- Permissions: `roles/run.viewer` or higher

**Navigate to Cloud Run:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `networkly-484301`
3. Navigate to: Cloud Run → Services
4. Find service: `networkly-scraper`

**Check Service Status:**
- **Active (green)**: Service is running
- **Inactive (gray)**: No traffic or service stopped
- **Error (red)**: Deployment failed

**If service doesn't exist:**
→ Backend was never deployed. See "Deploying Backend" section below.

**If service exists but inactive:**
→ Cold starts may be causing issues. See "Fix Cold Start Issues" below.

---

### Step 3: Review Cloud Run Logs

```bash
gcloud run services logs read networkly-scraper \
  --project=networkly-484301 \
  --region=us-central1 \
  --limit=100 \
  --format="table(timestamp, severity, textPayload)"
```

**Look for:**
- `ERROR` severity messages
- SSE endpoint errors (`/discover/stream`)
- Authentication failures (401, 403)
- Timeout messages
- Memory exhaustion (OOM killed)
- Database connection errors

**Common error patterns:**

| Error Message | Cause | Fix |
|---------------|-------|-----|
| `ModuleNotFoundError` | Missing Python dependencies | Redeploy with correct requirements.txt |
| `Database connection failed` | Invalid DATABASE_URL | Check env vars (Step 4) |
| `Authentication failed` | API token mismatch | Update DISCOVERY_API_TOKEN (Step 4) |
| `Memory limit exceeded` | Insufficient resources | Increase memory allocation (Step 5) |
| `Request timeout` | Slow AI processing | Increase timeout (Step 5) |

---

### Step 4: Verify Environment Variables

```bash
gcloud run services describe networkly-scraper \
  --project=networkly-484301 \
  --region=us-central1 \
  --format="yaml(spec.template.spec.containers[0].env)"
```

**Required environment variables:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `DISCOVERY_API_TOKEN` | `Networkly_Scraper_Secure_2026` | API authentication |
| `DATABASE_URL` | `postgresql://...` or `postgres://...` | Supabase connection |
| `USE_VERTEX_AI` | `true` | Enable Gemini AI extraction |
| `GOOGLE_VERTEX_PROJECT` | `networkly-484301` | Google Cloud project for Vertex AI |
| `GOOGLE_VERTEX_LOCATION` | `us-central1` | Vertex AI region |

**If DISCOVERY_API_TOKEN doesn't match `.env.local`:**

```bash
gcloud run services update networkly-scraper \
  --update-env-vars DISCOVERY_API_TOKEN=Networkly_Scraper_Secure_2026 \
  --region=us-central1 \
  --project=networkly-484301
```

**If DATABASE_URL is missing:**

```bash
# Get URL from Supabase dashboard: Project Settings → Database → Connection String
gcloud run services update networkly-scraper \
  --update-env-vars DATABASE_URL="postgresql://postgres:[PASSWORD]@db.syfukclbwllqfdhhabey.supabase.co:5432/postgres" \
  --region=us-central1 \
  --project=networkly-484301
```

---

### Step 5: Check Resource Configuration

```bash
gcloud run services describe networkly-scraper \
  --project=networkly-484301 \
  --region=us-central1 \
  --format="yaml(spec.template.spec.containers[0].resources)"
```

**Recommended settings for discovery service:**

| Setting | Recommended Value | Why |
|---------|-------------------|-----|
| Memory | `2Gi` or `4Gi` | AI extraction is memory-intensive |
| Timeout | `300s` (5 min) | Discovery can take 30-60s per query |
| Max Instances | `10` | Handle concurrent requests |
| Min Instances | `1` | Prevent cold starts |
| CPU | `2` | Parallel web scraping benefits from CPU |
| Concurrency | `5-10` | Balance throughput vs. resource usage |

**Update resources if needed:**

```bash
gcloud run services update networkly-scraper \
  --memory=2Gi \
  --timeout=300s \
  --min-instances=1 \
  --max-instances=10 \
  --cpu=2 \
  --concurrency=10 \
  --region=us-central1 \
  --project=networkly-484301
```

**Cost consideration:**
- `min-instances=1` keeps the service warm but costs ~$15-30/month
- `min-instances=0` is free when idle but has cold starts (10-30s delay)

---

## Common Fixes

### Fix 1: Cold Start Timeouts

**Problem:** First request after inactivity takes >30s, causing timeout

**Solution:** Set minimum instances to keep service warm

```bash
gcloud run services update networkly-scraper \
  --min-instances=1 \
  --region=us-central1 \
  --project=networkly-484301
```

**Alternative:** Increase proxy timeout in frontend
- Edit `app/api/discovery/stream/route.ts`
- Change `READ_TIMEOUT_MS` from 30000 to 60000

---

### Fix 2: Service Not Deployed

**Problem:** Service doesn't exist in Cloud Run

**Solution:** Deploy backend from source

**Prerequisites:**
- Backend source code (`ec-scraper` directory)
- `gcloud` CLI installed and authenticated

**Steps:**

```bash
# Navigate to backend directory
cd path/to/ec-scraper

# Deploy to Cloud Run
gcloud run deploy networkly-scraper \
  --source . \
  --region=us-central1 \
  --project=networkly-484301 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=2Gi \
  --timeout=300s \
  --min-instances=1 \
  --set-env-vars="DISCOVERY_API_TOKEN=Networkly_Scraper_Secure_2026,USE_VERTEX_AI=true,GOOGLE_VERTEX_PROJECT=networkly-484301,GOOGLE_VERTEX_LOCATION=us-central1"
```

**Set DATABASE_URL separately (contains sensitive data):**

```bash
gcloud run services update networkly-scraper \
  --update-env-vars DATABASE_URL="your-database-url-here" \
  --region=us-central1 \
  --project=networkly-484301
```

---

### Fix 3: Memory Exhaustion

**Problem:** Logs show "Memory limit exceeded" or "OOM killed"

**Solution:** Increase memory allocation

```bash
gcloud run services update networkly-scraper \
  --memory=4Gi \
  --region=us-central1 \
  --project=networkly-484301
```

**If still failing:**
- Review AI extraction code for memory leaks
- Reduce concurrency (fewer parallel requests)
- Implement pagination for large result sets

---

### Fix 4: API Token Mismatch

**Problem:** Frontend gets 401 Unauthorized errors

**Solution:** Ensure tokens match between frontend and backend

**Check frontend token:**
```bash
grep DISCOVERY_API_TOKEN .env.local
# Should show: DISCOVERY_API_TOKEN="Networkly_Scraper_Secure_2026"
```

**Update backend token:**
```bash
gcloud run services update networkly-scraper \
  --update-env-vars DISCOVERY_API_TOKEN=Networkly_Scraper_Secure_2026 \
  --region=us-central1 \
  --project=networkly-484301
```

---

## Local Backend Testing

If Cloud Run is difficult to debug, test backend locally:

### Step 1: Run Backend Locally

```bash
# Navigate to backend directory
cd path/to/ec-scraper

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DISCOVERY_API_TOKEN="Networkly_Scraper_Secure_2026"
export DATABASE_URL="your-supabase-url"
export USE_VERTEX_AI="true"
export GOOGLE_VERTEX_PROJECT="networkly-484301"
export GOOGLE_VERTEX_LOCATION="us-central1"

# Run server
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### Step 2: Update Frontend to Use Local Backend

```bash
# Edit .env.local
SCRAPER_API_URL="http://localhost:8000"
```

### Step 3: Test SSE Locally

```bash
curl -N -H "Authorization: Bearer Networkly_Scraper_Secure_2026" \
     -H "Accept: text/event-stream" \
     "http://localhost:8000/discover/stream?query=test"
```

**Expected:** Events stream within 5-10 seconds

**If succeeds locally but fails on Cloud Run:**
→ Cloud Run configuration issue (env vars, resources, or network)

---

## Frontend Improvements (While Backend is Down)

While debugging backend, improve frontend error handling:

### Add Pre-flight Health Check

Edit `app/api/discovery/stream/route.ts`:

```typescript
// Add before line 42 (before establishing SSE connection)
try {
    const healthCheck = await fetch(`${SCRAPER_API_URL}/health`, {
        signal: AbortSignal.timeout(5000)
    });

    if (!healthCheck.ok) {
        console.error(`[Discovery] Backend health check failed: ${healthCheck.status}`);
        return new NextResponse(
            sseErrorStream("Discovery service is temporarily unavailable. Please try again in a few minutes."),
            { headers: SSE_HEADERS }
        );
    }
} catch (error) {
    console.error(`[Discovery] Cannot reach backend:`, error);
    return new NextResponse(
        sseErrorStream("Cannot connect to discovery service. Please check your internet connection."),
        { headers: SSE_HEADERS }
    );
}
```

### Improve Error Messages

Edit `hooks/use-discovery-layers.ts` around line 641:

```typescript
es.onerror = () => {
    console.log('[Discovery] EventSource onerror fired. readyState:', es.readyState)
    es.close()

    // Distinguish between connection errors and stream errors
    const errorMessage = es.readyState === EventSource.CONNECTING
        ? 'Unable to connect to discovery service. The backend may be temporarily down.'
        : 'Discovery stream was interrupted. Please try again.';

    processEvent({
        type: 'error',
        message: errorMessage
    });

    setTimeout(() => {
        finishDiscovery()
    }, 300)
}
```

---

## Testing & Verification

After applying fixes, verify the SSE pipeline works:

### 1. Test with Diagnostic Script

```bash
./scripts/debug-backend.sh
```

All tests should pass ✓

### 2. Test in Browser

Open DevTools console and run:

```javascript
const es = new EventSource('/api/discovery/stream?query=internship');

es.addEventListener('layer_start', e => {
    console.log('Layer started:', JSON.parse(e.data));
});

es.addEventListener('opportunity_found', e => {
    console.log('Opportunity found:', JSON.parse(e.data));
});

es.addEventListener('complete', e => {
    console.log('Discovery complete:', JSON.parse(e.data));
    es.close();
});

es.onerror = (e) => {
    console.error('EventSource error:', e, 'readyState:', es.readyState);
};
```

**Expected behavior:**
- `layer_start` events within 2-5 seconds
- `opportunity_found` events within 10-30 seconds
- `complete` event within 30-60 seconds
- No `onerror` fires

### 3. Test Full Discovery Flow

1. Navigate to http://localhost:3000/opportunities
2. Click "Discover" or "Can't find what you're looking for?"
3. Enter query: "machine learning internship"
4. Click "Discover" button

**Expected:**
- Fast database results appear within 1 second
- Progress bar shows layer progression
- Web-scraped results stream in progressively
- Total count increases as opportunities are found
- Discovery completes within 30-60 seconds

---

## Troubleshooting FAQ

**Q: Health endpoint works but SSE stream hangs**
A: Cold start issue. Set `min-instances=1` to keep service warm.

**Q: Backend works locally but fails on Cloud Run**
A: Check Cloud Run env vars match local. Verify DATABASE_URL and API tokens.

**Q: Getting 401 errors**
A: API token mismatch. Update Cloud Run `DISCOVERY_API_TOKEN` to match frontend.

**Q: Getting 503 errors**
A: Service down or overloaded. Check Cloud Run logs and increase resources.

**Q: SSE connects but no events received**
A: Backend processing may be slow. Check logs for errors in AI extraction or web scraping.

**Q: Events received but frontend shows 0 results**
A: Results may have `title: "Unknown"` and get filtered out. Fix database records.

**Q: Discovery times out after 60 seconds**
A: Backend processing is too slow. Increase backend timeout or reduce query scope.

---

## Support & Escalation

If issues persist:

1. **Check Cloud Run Dashboard:** https://console.cloud.google.com/run?project=networkly-484301
2. **Review recent deployments:** Cloud Run → Revisions tab
3. **Monitor metrics:** Cloud Run → Metrics tab (CPU, memory, request count, errors)
4. **Check billing:** Ensure project hasn't hit quota limits
5. **Contact backend team:** Provide logs and error messages from this guide

**Useful commands for backend team:**

```bash
# Stream logs in real-time
gcloud run services logs tail networkly-scraper \
  --project=networkly-484301 \
  --region=us-central1

# Get full service configuration
gcloud run services describe networkly-scraper \
  --project=networkly-484301 \
  --region=us-central1 \
  --format=yaml > service-config.yaml

# Check recent revisions
gcloud run revisions list \
  --service=networkly-scraper \
  --project=networkly-484301 \
  --region=us-central1
```
