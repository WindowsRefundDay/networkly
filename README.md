# Networkly

AI-powered professional networking platform built with Next.js + Supabase + Vertex AI, with a companion Python discovery scraper.

## Codebase Layout

- `app/` Next.js App Router pages, API routes, server actions
- `components/` UI and feature components
- `hooks/` client hooks
- `lib/` shared backend/frontend logic (AI, Supabase, discovery)
- `ec-scraper/` Python scraper/search backend
- `docs/` deployment, setup, and archived reports

Detailed map: `docs/CODEBASE_MAP.md`

## Quick Start (Local)

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment:

```bash
cp .env.example .env
```

Required keys for normal local flow:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `GOOGLE_VERTEX_PROJECT`
- `GOOGLE_VERTEX_LOCATION`
- `DISCOVERY_API_TOKEN`
- `SCRAPER_API_URL`

3. Start frontend:

```bash
pnpm dev
```

4. Start scraper (optional if using Cloud Run scraper):

```bash
cd ec-scraper
hatch run discover "software engineering internships"
```

## Health Checks

- Frontend: `http://localhost:3000`
- AI health: `http://localhost:3000/api/ai/health`
- Profile health: `http://localhost:3000/api/health/profile`
- Discovery health: `http://localhost:3000/api/health/discovery`

## Scripts

- `pnpm dev` run Next.js dev server
- `pnpm build` production build
- `pnpm lint` lint check
- `pnpm test:run` run tests once
- `pnpm costs` calculate AI usage costs

## Notes

- Next.js 16 uses `proxy.ts` (not `middleware.ts`).
- Root report documents were moved to `docs/reports/` to keep the workspace navigable.
