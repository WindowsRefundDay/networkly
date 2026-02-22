-- Production cleanup migration (guarded immediate-drop scope)
-- Drops only confirmed-unused tables in the app/runtime path.
-- Explicitly preserved (do NOT drop): url_cache, pending_urls, opportunity_embeddings, project_likes.

BEGIN;

DROP TABLE IF EXISTS public.chat_logs CASCADE;
DROP TABLE IF EXISTS public.social_links CASCADE;

COMMIT;
