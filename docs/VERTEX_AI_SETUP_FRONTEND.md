# Vertex AI Setup Guide - Frontend (Next.js)

**Last Updated:** January 27, 2026

---

## Overview

This guide covers setting up Google Cloud Vertex AI for the Networkly frontend AI assistant. Vertex AI provides enterprise-grade reliability, higher quotas, and better security compared to the free Gemini Developer API.

## Why Migrate to Vertex AI?

| Aspect | Gemini Developer API | Vertex AI |
|--------|---------------------|-----------|
| **Quotas** | 15 RPM (free tier) | Configurable, scales with billing |
| **Authentication** | API Key (exposed in code) | IAM Service Accounts (secure) |
| **Reliability** | Free tier limits | Production-grade SLA |
| **Cost** | Free (with limits) | Pay-as-you-go (~$0.075/1M tokens) |
| **Best For** | Local development, prototypes | Production deployments |

**Bottom line**: Use Vertex AI for Vercel production deployment, API key mode for quick local testing.

---

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed (for local development)
3. **Node.js 18+** and **Bun** installed
4. **Vercel Account** (for deployment)

---

## Part 1: Google Cloud Setup

### Step 1: Create or Select a GCP Project

```bash
# Install gcloud CLI (macOS)
brew install --cask google-cloud-sdk

# Initialize gcloud
gcloud init

# Create a new project (optional)
gcloud projects create networkly-ai-prod --name="Networkly AI Production"

# Set active project
gcloud config set project networkly-ai-prod
```

### Step 2: Enable Vertex AI API

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Verify it's enabled
gcloud services list --enabled | grep aiplatform
```

### Step 3: Set Up Billing

1. Go to [Google Cloud Console - Billing](https://console.cloud.google.com/billing)
2. Link a billing account to your project
3. (Recommended) Set up budget alerts:
   - Go to **Billing** → **Budgets & alerts**
   - Create alert for $10, $50, $100 thresholds

---

## Part 2: Authentication Setup

### Option A: Local Development (Recommended)

Use **Application Default Credentials (ADC)** for seamless local authentication:

```bash
# Authenticate with your Google account
gcloud auth application-default login

# This creates credentials at:
# ~/.config/gcloud/application_default_credentials.json
```

**Environment variables for local `.env.local`:**

```env
USE_VERTEX_AI=true
GOOGLE_VERTEX_PROJECT=networkly-ai-prod
GOOGLE_VERTEX_LOCATION=us-central1
# No need for GOOGLE_APPLICATION_CREDENTIALS - ADC handles it automatically
```

**Test your local setup:**

```bash
bun dev
# Navigate to http://localhost:3000/assistant
# Send a message - check logs for: [AIManager] Initialized with Gemini (Vertex AI)
```

---

### Option B: Service Account (For Vercel Deployment)

#### 1. Create a Service Account

```bash
# Create service account
gcloud iam service-accounts create networkly-ai-sa \
    --display-name="Networkly AI Service Account"

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding networkly-ai-prod \
    --member="serviceAccount:networkly-ai-sa@networkly-ai-prod.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"
```

#### 2. Generate JSON Key

```bash
# Generate and download key
gcloud iam service-accounts keys create ~/networkly-vertex-key.json \
    --iam-account=networkly-ai-sa@networkly-ai-prod.iam.gserviceaccount.com

# ⚠️ IMPORTANT: Keep this file secure! Don't commit to git!
```

#### 3. Configure Vercel Environment Variables

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add the following variables for **Production, Preview, and Development**:

   ```
   USE_VERTEX_AI=true
   GOOGLE_VERTEX_PROJECT=networkly-ai-prod
   GOOGLE_VERTEX_LOCATION=us-central1
   ```

3. Add service account credentials:
   
   **Option 1**: Full JSON as single environment variable (recommended)
   
   ```
   GOOGLE_APPLICATION_CREDENTIALS_JSON=<paste entire JSON file content>
   ```
   
   Copy the entire contents of `~/networkly-vertex-key.json` and paste as the value.
   
   **Option 2**: Individual credentials
   
   Extract `client_email` and `private_key` from the JSON and set separately (not recommended, more error-prone).

4. Click **Save** and **redeploy** your application.

---

## Part 3: Testing & Verification

### Local Testing

```bash
# 1. Start dev server
bun dev

# 2. Check server logs for initialization message
# Expected: [AIManager] Initialized with Gemini (Vertex AI) - Project: networkly-ai-prod

# 3. Navigate to http://localhost:3000/assistant

# 4. Send test messages:
#    - "Hello!"
#    - "Find me robotics opportunities"
#    - "What are my skills?"

# 5. Verify no quota errors (no "429 RESOURCE_EXHAUSTED")
```

### Vercel Deployment Testing

```bash
# 1. Deploy to Vercel
git push origin main

# 2. Wait for deployment to complete

# 3. Visit your Vercel URL + /assistant

# 4. Send test messages

# 5. Check Vercel function logs:
#    - Go to Vercel Dashboard → Deployments → View Function Logs
#    - Look for: [AIManager] Initialized with Gemini (Vertex AI)
#    - Verify no authentication errors
```

### API Key Fallback Testing

To test the API key fallback mode (useful for local quick tests):

```bash
# In .env.local
USE_VERTEX_AI=false
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# Restart server
bun dev

# Expected log: [AIManager] Initialized with Gemini (API Key mode)
```

---

## Troubleshooting

### Error: "GOOGLE_VERTEX_PROJECT is required"

**Cause**: Missing `GOOGLE_VERTEX_PROJECT` environment variable.

**Fix**:
- Local: Add to `.env.local`
- Vercel: Add in project settings environment variables

### Error: "Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON"

**Cause**: Malformed JSON in environment variable.

**Fix**:
1. Ensure you copied the **entire** JSON file content
2. Check for any extra quotes or brackets
3. Use a JSON validator: https://jsonlint.com

### Error: "Permission denied on resource project"

**Cause**: Service account lacks necessary permissions.

**Fix**:
```bash
# Grant Vertex AI User role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:YOUR_SERVICE_ACCOUNT_EMAIL" \
    --role="roles/aiplatform.user"
```

### Error: "API aiplatform.googleapis.com is not enabled"

**Cause**: Vertex AI API not enabled for project.

**Fix**:
```bash
gcloud services enable aiplatform.googleapis.com --project=YOUR_PROJECT_ID
```

### Warning: "429 RESOURCE_EXHAUSTED" (even with Vertex AI)

**Causes**:
1. Billing not enabled on GCP project
2. Exceeded quota limits (unlikely with default quotas)
3. Still using API key mode instead of Vertex AI

**Fix**:
1. Verify billing is enabled: https://console.cloud.google.com/billing
2. Check logs for: `[AIManager] Initialized with Gemini (Vertex AI)`
3. If seeing API Key mode, verify environment variables are set correctly

### Local Development: "User not authenticated"

**Cause**: ADC not configured.

**Fix**:
```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

---

## Cost Monitoring

### Setting Up Billing Alerts

1. Go to [Google Cloud Console - Budgets](https://console.cloud.google.com/billing/budgets)
2. Click **Create Budget**
3. Set thresholds:
   - Alert at 50% ($5 if $10 budget)
   - Alert at 100% ($10)
   - Alert at 200% ($20)
4. Add email notifications

### Estimating Costs

**Approximate usage** (based on Networkly AI assistant):
- Average message: ~500 input tokens, ~200 output tokens
- Cost per interaction: ~$0.0001 (with gemini-2.5-flash-lite)
- 10,000 messages/month: ~$1.00

**Models pricing** (as of Jan 2026):

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| gemini-2.5-flash-lite | $0.075 | $0.30 |
| gemini-2.5-flash | $0.15 | $0.60 |
| gemini-2.5-pro | $1.25 | $10.00 |

**Recommendation**: Start with `gemini-2.5-flash-lite` (default). It's 50% cheaper than flash and suitable for most tasks.

---

## Security Best Practices

1. **Never commit service account keys to git**
   - Add `*.json` to `.gitignore`
   - Use environment variables in Vercel

2. **Rotate service account keys regularly**
   ```bash
   # Generate new key
   gcloud iam service-accounts keys create new-key.json \
       --iam-account=YOUR_SERVICE_ACCOUNT_EMAIL
   
   # Update Vercel env var
   # Delete old key
   gcloud iam service-accounts keys delete KEY_ID \
       --iam-account=YOUR_SERVICE_ACCOUNT_EMAIL
   ```

3. **Use principle of least privilege**
   - Service account only needs `roles/aiplatform.user`
   - Don't use owner/editor roles

4. **Monitor usage**
   - Set up billing alerts
   - Review Cloud Audit Logs periodically

---

## Migration from API Key to Vertex AI

If you're currently using API key mode in production:

1. Set up Vertex AI as documented above
2. Add Vertex AI environment variables to Vercel (keep API key as backup)
3. Deploy
4. Test thoroughly
5. Once stable, optionally remove API key environment variables

**Rollback plan**:
```env
# In Vercel, set:
USE_VERTEX_AI=false
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key
# Redeploy
```

---

## Additional Resources

- [Google Cloud Vertex AI Docs](https://cloud.google.com/vertex-ai/docs)
- [Vercel AI SDK - Google Vertex Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/google-vertex)
- [Gemini API Pricing](https://ai.google.dev/pricing)
- [IAM Service Accounts](https://cloud.google.com/iam/docs/service-accounts)

---

## Support

- **Vertex AI Issues**: [Google Cloud Support](https://cloud.google.com/support)
- **Vercel Deployment**: [Vercel Support](https://vercel.com/help)
- **Code Issues**: Open an issue in the repository

---

**Setup complete! Your AI assistant should now be running on Vertex AI with production-grade reliability.** 🎉
