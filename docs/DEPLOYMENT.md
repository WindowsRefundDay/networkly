# Networkly Deployment Guide

This guide covers the deployment of the Networkly platform, consisting of the Next.js frontend (Vercel) and the Python Scraper backend (Google Cloud Run).

## Prerequisites

1. **Google Cloud Project**:
   - Enable Vertex AI API
   - Enable Cloud Run API
   - Create a Service Account with `Vertex AI User` and `Cloud Run Invoker` roles.

2. **Supabase Project**:
   - Database URL and keys ready.
   - Run migrations from `prisma/` and `Networkly-scrape/app/db/`.

3. **Vercel Account**:
   - Connected to GitHub repository.

---

## 1. Deploying the Scraper (Google Cloud Run)

The scraper handles discovery, crawling, and embeddings.

### Configuration
1. Navigate to `Networkly-scrape/` directory.
2. Ensure `Dockerfile` is present.

### Environment Variables (Cloud Run)
Set these in the Cloud Run revision settings:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase connection string (Transaction mode recommended) |
| `SUPABASE_URL` | Supabase API URL |
| `SUPABASE_KEY` | Supabase Service Role Key |
| `GCP_PROJECT` | Your Google Cloud Project ID |
| `GCP_LOCATION` | Region (e.g., `us-central1`) |
| `DISCOVERY_API_TOKEN` | Secure token you generate (shared with frontend) |
| `CRON_SECRET` | Secure token for triggering daily jobs |

### Deployment Command
```bash
# Authenticate
gcloud auth login
gcloud config set project [YOUR_PROJECT_ID]

# Deploy
cd Networkly-scrape
gcloud run deploy networkly-scraper \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 2 \
  --memory 2Gi
```

**Note**: We allow unauthenticated ingress because the API itself enforces authentication via `DISCOVERY_API_TOKEN`.

---

## 2. Deploying the Frontend (Vercel)

### Configuration
The `vercel.json` or default Next.js settings should work out of the box.

### Environment Variables (Vercel)
Add these to your Vercel project settings:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Auth Public Key |
| `CLERK_SECRET_KEY` | Clerk Auth Secret Key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API Key (or Vertex config below) |
| `GOOGLE_VERTEX_PROJECT` | (Optional) GCP Project for Vertex AI |
| `GOOGLE_VERTEX_LOCATION` | (Optional) GCP Region |
| `SCRAPER_API_URL` | URL of deployed Cloud Run service (e.g., `https://networkly-scraper-...run.app`) |
| `DISCOVERY_API_TOKEN` | Must match the token set in Cloud Run |
| `CRON_SECRET` | Must match the token set in Cloud Run |

### Build Settings
- **Framework**: Next.js
- **Build Command**: `pnpm build`
- **Install Command**: `pnpm install`

---

## 3. Post-Deployment Verification

### 1. Verify Connectivity
Go to your deployed frontend: `https://your-app.vercel.app/events`
- Try searching for "hackathon".
- If results appear (or the loading spinner works without error), the connection is active.

### 2. Check Scraper Logs
In Google Cloud Console > Cloud Run > Logs:
- Look for `POST /api/v1/search` requests.
- Verify status 200 OK.

### 3. Test Cron Jobs
You can manually trigger the daily discovery:
```bash
curl -X POST https://your-app.vercel.app/api/discovery/daily \
  -H "Authorization: Bearer [YOUR_CRON_SECRET]"
```

---

## 4. Troubleshooting

### Common Issues

**Frontend shows "Discovery service unavailable"**
- Check `SCRAPER_API_URL` in Vercel env vars. It must NOT have a trailing slash.
- Check `DISCOVERY_API_TOKEN` matches in both services.
- Ensure Cloud Run service is running and not crashing (check logs).

**Scraper fails with "504 Gateway Timeout"**
- The scraper might be timing out on long requests.
- Increase Cloud Run timeout to 5-10 minutes.
- For long jobs, use the `/batch` endpoint which streams responses.

**Authentication Errors**
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is correct.
- Check Clerk keys.

**Python Type Errors**
- If the scraper crashes on startup, check the Cloud Run logs.
- Ensure `pydantic` settings in `config.py` match the env vars provided.
