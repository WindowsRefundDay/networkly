# Scraper Deployment & Verification

## TL;DR

> **Quick Summary**: Push the new database schema to Supabase and deploy the updated FastAPI scraper to Google Cloud Run using the existing deployment script.
> 
> **Deliverables**:
> - Live Supabase schema with 5 new columns and constraints.
> - Updated `networkly-scraper` service on GCP.
> - Verified "High Cost" flagging in production.
> 
> **Estimated Effort**: Short
> **Parallel Execution**: NO (sequential: DB -> App -> Verify)
> **Critical Path**: Supabase Push -> GCP Deploy -> Discovery Test

---

## Context

### Original Request
The user wants to "push everything" using the CLIs for both Supabase and Google Cloud.

### Deployment Background
- **Supabase**: We created a migration file `20260128000000_add_scraper_fields.sql`. This must be pushed before the app code to avoid "column not found" errors.
- **GCP**: The project uses `deploy.sh` in `Networkly-scrape/`, which builds a Docker image and deploys to Cloud Run. It also manages SearXNG.
- **Environment**: `.env` in `Networkly-scrape/` contains the necessary credentials for the deployment script.

---

## Work Objectives

### Core Objective
Synchronize the production environment with the recently implemented architectural enhancements (Classification levels, Cost flagging, Meta extraction).

### Concrete Deliverables
- [ ] Database schema updated in Supabase.
- [ ] Container image built and deployed to Cloud Run.
- [ ] SearXNG instance verified/updated.

### Definition of Done
- [ ] `supabase db push` returns success.
- [ ] `deploy.sh` finishes with "🎉 Deployment Successful!"
- [ ] A discovery run confirms `is_high_cost` and `difficulty_level` are being saved to DB.

### Must Have
- `supabase` CLI logged in and project linked.
- `gcloud` CLI authenticated with correct project.
- `.env` file present with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

---

## Verification Strategy (MANDATORY)

### Automated Verification
1. **DB Check**: Run `supabase db lint` or a sample query to verify columns.
2. **Health Check**: `curl $SCRAPER_URL/health`
3. **End-to-End Test**: Trigger `/discover/stream` for a known high-cost program (e.g. "Wharton Summer Program") and check if `is_high_cost` is True in the DB.

---

## TODOs

- [x] 1. Push Database Migration to Supabase

  **What to do**:
  - `cd Networkly-scrape`
  - `supabase db push`
  - Verify success

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Acceptance Criteria**:
  - [ ] Command output shows "Remote database is up to date."

---

- [x] 2. Deploy Scraper Service to Google Cloud Run

  **What to do**:
  - `cd Networkly-scrape`
  - `chmod +x deploy.sh` (if not already)
  - `./deploy.sh`
  - Capture the final URLs

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Deployment involves multi-step Cloud Build and Service deployment.
  - **Skills**: []

  **Acceptance Criteria**:
  - [ ] Script outputs "🎉 Deployment Successful!"
  - [ ] Scraper URL is reachable.

---

- [x] 3. Production Verification

  **What to do**:
  - Trigger a scrape for a high-cost program.
  - Check the Supabase database (via `supabase db query` or `db_cleanup.py`) for the new fields.

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Acceptance Criteria**:
  - [ ] New entries have `is_high_cost`, `difficulty_level`, and `selectivity` populated.

---

## Success Criteria

### Verification Commands
```bash
# Check Scraper Health
curl -s https://networkly-scraper-networkly-484301.a.run.app/health | jq .

# Check DB columns (Remote)
supabase db query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'opportunities' AND column_name = 'is_high_cost';"
```
