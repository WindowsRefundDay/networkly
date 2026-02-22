# Quick Start: Get SSE Streaming Working

**Goal:** Get the SSE streaming pipeline working for web scraping discovery.

---

## 🚀 5-Minute Quick Fix

### 1. Restart Your Dev Server
```bash
# Press Ctrl+C to stop
npm run dev
```

### 2. Test Discovery
1. Go to http://localhost:3000/opportunities
2. Click "Discover"
3. Enter "machine learning internship"
4. Click "Discover"

**What happens:**
- ✅ Fast database search works (POST method fixed)
- ✅ Pre-flight health check runs
- ⚠️ SSE stream may timeout (cold start issue)

---

## 🔧 Fix Cold Start Issues (Recommended)

The backend is healthy but may have cold starts (10-30s delay). Fix this:

```bash
gcloud run services update networkly-scraper \
  --min-instances=1 \
  --region=us-central1 \
  --project=networkly-484301
```

**What this does:**
- Keeps backend "warm" at all times
- Eliminates cold start delays
- SSE connects within 5 seconds

**Cost:** ~$15-30/month (vs. $0 for cold starts)

---

## 📊 Test Backend Status

Run the diagnostic script:
```bash
./scripts/debug-backend.sh
```

**If all tests pass:** Backend is healthy, proceed to test in browser

**If tests fail:** See `docs/BACKEND_DEBUGGING.md` for troubleshooting

---

## 🧪 Manual SSE Test

Test SSE stream directly:
```bash
curl -N -H "Authorization: Bearer Networkly_Scraper_Secure_2026" \
     -H "Accept: text/event-stream" \
     "https://networkly-scraper-267103342849.us-central1.run.app/discover/stream?query=test"
```

**Expected:** Events stream within 10-30 seconds

**If hangs:** Cold start (run gcloud command above)

---

## 📝 What Was Fixed

1. ✅ Fast search now uses POST (was GET, caused 405 errors)
2. ✅ Added pre-flight health check (fails fast if backend down)
3. ✅ Better error messages (tells user why it failed)
4. ✅ Diagnostic tools (scripts/debug-backend.sh)

---

## ❓ Still Not Working?

See detailed guides:
- **Backend issues:** `docs/BACKEND_DEBUGGING.md`
- **Complete analysis:** `DISCOVERY_ISSUES_ANALYSIS.md`
- **What was fixed:** `FIXES_APPLIED.md`
- **Full summary:** `SSE_STREAMING_FIX_SUMMARY.md`

Or check Cloud Run logs:
```bash
gcloud run services logs read networkly-scraper \
  --project=networkly-484301 \
  --region=us-central1 \
  --limit=50
```

---

## ✅ Success Checklist

SSE streaming is working when you see:

- [ ] Discovery starts within 1 second
- [ ] Database results appear (if database has data)
- [ ] Progress bar shows layer transitions
- [ ] Opportunities stream in progressively
- [ ] Discovery completes in 30-60 seconds
- [ ] No timeout errors in console

---

**TL;DR:** Restart dev server, test discovery. If it times out, run the `gcloud` command to prevent cold starts.
