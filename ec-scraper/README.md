# EC Scraper Discovery API

AI-powered extracurricular opportunity discovery service. Containerized FastAPI application for deployment on Railway or other container platforms.

## Features

- **Quick Discovery**: On-demand search for opportunities based on a query
- **Daily Discovery**: Batch discovery from curated sources, sitemaps, and AI search
- **Token Authentication**: Secured public API endpoints
- **Railway-Ready**: Optimized Dockerfile for Railway deployment

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/discover/quick` | POST | Yes | On-demand discovery for a query |
| `/discover/daily` | POST | Yes | Batch discovery from all sources |

### Quick Discovery

```bash
curl -X POST https://your-service.railway.app/discover/quick \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "neuroscience research high school"}'
```

**Request Body:**
```json
{
  "query": "neuroscience research high school",
  "userProfileId": "optional-user-id",
  "profile": "quick"
}
```

### Daily Discovery

```bash
curl -X POST https://your-service.railway.app/discover/daily \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Request Body:**
```json
{
  "focusAreas": ["STEM competitions", "internships", "summer programs"],
  "limit": 100,
  "sources": ["curated", "sitemaps", "search", "recheck"]
}
```

## Local Development

### Prerequisites

- Python 3.11+
- Docker (optional, for containerized testing)

### Setup

```bash
cd ec-scraper

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # or `.venv\Scripts\activate` on Windows

# Install dependencies
pip install -e .

# Copy environment file
cp .env.example .env
# Edit .env with your API keys
```

### Run Locally

```bash
# Set required environment variables
export DISCOVERY_API_TOKEN=your-secret-token
export DATABASE_URL=postgresql://...
export GOOGLE_API_KEY=your-gemini-api-key

# Run the server
uvicorn src.api.server:app --reload --port 8000
```

### Test Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Quick discovery
curl -X POST http://localhost:8000/discover/quick \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"query": "robotics"}'
```

### Bootstrap Curated Seed (First-Time DB Fill)

Use curated sources only to quickly seed the database without full daily search.

```bash
# All curated categories (default: daily profile)
python scripts/bootstrap_curated.py --limit 100

# Only competitions
python scripts/bootstrap_curated.py --category competitions --limit 50
```

## Docker

### Build

```bash
docker build -t ec-scraper .
```

### Run

```bash
docker run -p 8000:8000 \
  -e PORT=8000 \
  -e DISCOVERY_API_TOKEN=your-secret-token \
  -e DATABASE_URL=postgresql://... \
  -e GOOGLE_API_KEY=your-gemini-key \
  ec-scraper
```

## Railway Deployment

### 1. Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init
```

### 2. Configure Environment Variables

In Railway dashboard, set these environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCOVERY_API_TOKEN` | Yes | API authentication token |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GOOGLE_API_KEY` | Yes | Google Gemini API key |
| `GROQ_API_KEY` | No | Groq API key (optional) |
| `SEARXNG_URL` | No | SearXNG instance URL |

### 3. Deploy

Railway will automatically detect the Dockerfile and deploy.

```bash
# Deploy from ec-scraper directory
railway up
```

Or configure in Railway dashboard:
- **Root Directory**: `ec-scraper` (if in monorepo)
- **Builder**: Dockerfile
- **Start Command**: (auto-detected from Dockerfile)

### 4. Configure Networking

- Railway auto-assigns a `PORT` environment variable
- Generate a public domain in Railway settings
- Your API will be available at `https://your-service.up.railway.app`

## Integration with Next.js

Update your Next.js app to call the API instead of spawning Python:

```typescript
// app/api/discovery/stream/route.ts
const EC_SCRAPER_URL = process.env.EC_SCRAPER_URL // e.g., https://ec-scraper.up.railway.app
const EC_SCRAPER_TOKEN = process.env.EC_SCRAPER_TOKEN

const response = await fetch(`${EC_SCRAPER_URL}/discover/quick`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${EC_SCRAPER_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query, userProfileId }),
})

const result = await response.json()
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 8000 | Server port (Railway sets this) |
| `DISCOVERY_API_TOKEN` | Yes | - | API authentication token |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `GOOGLE_API_KEY` | Yes | - | Google Gemini API key |
| `GROQ_API_KEY` | No | - | Groq API key (alternative) |
| `API_MODE` | No | gemini | API mode: "gemini" or "groq" |
| `SEARXNG_URL` | No | http://localhost:8080 | SearXNG instance URL |
| `MAX_CONCURRENT_SCRAPES` | No | 5 | Max concurrent crawls |
| `SCRAPE_TIMEOUT_SECONDS` | No | 30 | Crawl timeout |

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Next.js App   │ ──────> │  EC Scraper API  │
│   (Vercel)      │  HTTP   │  (Railway)       │
└─────────────────┘         └────────┬─────────┘
                                     │
                                     ▼
                            ┌────────────────┐
                            │   PostgreSQL   │
                            │   (Neon/etc)   │
                            └────────────────┘
```

## License

MIT
