# Vertex AI Setup Guide

This guide will help you migrate from Gemini Developer API to Vertex AI Gemini API.

## Why Vertex AI?

- **Higher Quotas**: Production-ready quotas vs free-tier limits
- **IAM Authentication**: More secure than API keys
- **Better Reliability**: Enterprise-grade SLAs
- **No 429 Quota Errors**: Proper quota management for paid projects

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. A GCP project with billing enabled
3. Google Cloud CLI (gcloud) installed

## Step 1: Install Google Cloud CLI

### macOS
```bash
# Using Homebrew
brew install --cask google-cloud-sdk

# Or download from:
# https://cloud.google.com/sdk/docs/install
```

### Linux
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Windows
Download and run the installer:
https://cloud.google.com/sdk/docs/install#windows

## Step 2: Create/Select GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Either:
   - Create a new project, OR
   - Select an existing project
3. **Important**: Enable billing for your project
   - Click on "Billing" in the left sidebar
   - Link a billing account

4. Copy your **Project ID** (not the project name)
   - Find it in the project dropdown at the top
   - It looks like: `my-project-12345`

## Step 3: Enable Vertex AI API

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable aiplatform.googleapis.com
gcloud services enable generativelanguage.googleapis.com
```

Or enable via Console:
1. Go to [APIs & Services](https://console.cloud.google.com/apis/dashboard)
2. Click "Enable APIs and Services"
3. Search for "Vertex AI API"
4. Click "Enable"

## Step 4: Authenticate (Development)

For local development, use Application Default Credentials (ADC):

```bash
gcloud auth application-default login
```

This will:
1. Open your browser
2. Ask you to sign in with your Google account
3. Store credentials locally at `~/.config/gcloud/application_default_credentials.json`

## Step 5: Configure Your Project

Update `ec-scraper/.env`:

```bash
# Set to true to use Vertex AI
USE_VERTEX_AI=true

# Your GCP Project ID (from Step 2)
VERTEX_PROJECT_ID=your-project-id-here

# Location (us-central1 is recommended)
VERTEX_LOCATION=us-central1
```

## Step 6: Test Your Setup

Run a dry run to verify everything works:

```bash
cd ec-scraper
python scripts/quick_discovery.py "robotics" --dry-run
```

You should see:
- ✅ No "VERTEX_PROJECT_ID is required" errors
- ✅ No "403 Permission denied" errors
- ✅ No "429 RESOURCE_EXHAUSTED" quota errors
- ✅ Successful query generation and semantic filtering

## Production Deployment (Service Account)

For Railway or other production environments:

### 1. Create Service Account

```bash
# Create service account
gcloud iam service-accounts create vertex-ai-scraper \
    --display-name="EC Scraper Vertex AI"

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:vertex-ai-scraper@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Create and download key
gcloud iam service-accounts keys create service-account-key.json \
    --iam-account=vertex-ai-scraper@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 2. Deploy with Service Account

**Railway:**
1. Base64 encode the key:
   ```bash
   cat service-account-key.json | base64
   ```
2. In Railway dashboard, set environment variables:
   ```
   USE_VERTEX_AI=true
   VERTEX_PROJECT_ID=your-project-id
   VERTEX_LOCATION=us-central1
   GOOGLE_APPLICATION_CREDENTIALS_JSON=<base64-encoded-json>
   ```
3. Add startup script to decode and save credentials:
   ```bash
   echo $GOOGLE_APPLICATION_CREDENTIALS_JSON | base64 -d > /tmp/gcp-key.json
   export GOOGLE_APPLICATION_CREDENTIALS=/tmp/gcp-key.json
   ```

**Docker:**
```bash
docker run -p 8000:8000 \
  -e USE_VERTEX_AI=true \
  -e VERTEX_PROJECT_ID=your-project-id \
  -e VERTEX_LOCATION=us-central1 \
  -v $(pwd)/service-account-key.json:/app/gcp-key.json \
  -e GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-key.json \
  ec-scraper
```

## Troubleshooting

### "gcloud: command not found"
- Install Google Cloud CLI (see Step 1)
- Restart your terminal after installation

### "Could not load credentials"
- Run: `gcloud auth application-default login`
- Verify credentials exist: `ls ~/.config/gcloud/application_default_credentials.json`

### "403 Permission denied"
- Ensure your account has Vertex AI User role:
  ```bash
  gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
      --member="user:your-email@gmail.com" \
      --role="roles/aiplatform.user"
  ```

### "VERTEX_PROJECT_ID is required"
- Set `USE_VERTEX_AI=true` and `VERTEX_PROJECT_ID=your-project-id` in `.env`

### "Billing not enabled"
- Go to [Billing](https://console.cloud.google.com/billing)
- Enable billing for your project

### Still getting 429 errors
- Verify you're using Vertex AI mode (`USE_VERTEX_AI=true`)
- Check that billing is enabled
- Request quota increase in [Quotas page](https://console.cloud.google.com/iam-admin/quotas)

## Reverting to Gemini API (Not Recommended)

If you need to temporarily revert:

```bash
# In ec-scraper/.env
USE_VERTEX_AI=false
GOOGLE_API_KEY=your-gemini-api-key
```

Note: This will use the free-tier Developer API with lower quotas.

## Cost Information

Vertex AI pricing (as of 2024):
- **Gemini 1.5 Flash**: $0.075 per 1M input tokens, $0.30 per 1M output tokens
- **Gemini 1.5 Pro**: $1.25 per 1M input tokens, $5.00 per 1M output tokens
- **text-embedding-004**: $0.025 per 1M tokens

Typical discovery run (~20 queries):
- Query generation: ~$0.01
- Semantic filtering: ~$0.005
- Extraction: ~$0.02
- **Total**: ~$0.035 per discovery run

Much more reliable than free-tier API with its quota limits!
