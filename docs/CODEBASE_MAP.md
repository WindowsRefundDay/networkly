# Codebase Map

## Frontend (Next.js)

- `app/`
  - `app/actions/` server actions and mutation logic
  - `app/api/` API routes for chat, discovery, admin, AI, health
  - route pages (`dashboard`, `profile`, `network`, etc.)
- `components/`
  - `components/ui/` reusable UI primitives
  - feature component folders (`assistant`, `discovery`, etc.)
- `hooks/` custom hooks (state machines + client logic)
- `styles/` global and feature styles
- `types/` shared TypeScript types

## Core Libraries

- `lib/ai/` model manager, providers, retries, cost tracking
- `lib/supabase/` server/client/admin/middleware Supabase helpers
- `lib/discovery/` discovery intent and helper logic
- `lib/mock-data.ts` fallback and local data utilities

## Scraper Backend (Python)

- `ec-scraper/`
  - search/discovery scripts
  - API/server entrypoints
  - Python dependency/runtime config

## Docs

- `docs/DEPLOYMENT.md` deployment guide
- `docs/VERTEX_AI_SETUP_FRONTEND.md` Vertex AI setup
- `docs/LINUX_HOME_SERVER.md` Linux host setup
- `docs/reports/` archived analysis/fix reports

## Current Conventions

- Prefer `pnpm` for JS package management in this repo.
- Use `proxy.ts` for request interception in Next.js 16.
- Keep high-level docs in `docs/` and avoid root-level report sprawl.
