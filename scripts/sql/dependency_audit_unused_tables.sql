-- Dependency audit for candidate drop tables.
-- Run against the linked remote database before applying 005_drop_unused_tables.sql.
-- Targets: public.chat_logs, public.social_links, public.project_likes.

-- 1) Object existence check
select
  n.nspname as schema_name,
  c.relname as object_name,
  c.relkind as object_kind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('chat_logs', 'social_links', 'project_likes')
order by c.relname;

-- 2) Foreign key dependencies pointing to target tables
select
  con.conname as constraint_name,
  src_n.nspname as source_schema,
  src.relname as source_table,
  tgt_n.nspname as target_schema,
  tgt.relname as target_table
from pg_constraint con
join pg_class src on src.oid = con.conrelid
join pg_namespace src_n on src_n.oid = src.relnamespace
join pg_class tgt on tgt.oid = con.confrelid
join pg_namespace tgt_n on tgt_n.oid = tgt.relnamespace
where con.contype = 'f'
  and tgt_n.nspname = 'public'
  and tgt.relname in ('chat_logs', 'social_links', 'project_likes')
order by tgt.relname, src.relname, con.conname;

-- 3) Functions that reference target table names in source text
select
  n.nspname as function_schema,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where pg_get_functiondef(p.oid) ilike '%chat_logs%'
   or pg_get_functiondef(p.oid) ilike '%social_links%'
   or pg_get_functiondef(p.oid) ilike '%project_likes%'
order by n.nspname, p.proname;

-- 4) Views/materialized views that reference target table names
select
  schemaname as view_schema,
  viewname
from pg_views
where definition ilike '%chat_logs%'
   or definition ilike '%social_links%'
   or definition ilike '%project_likes%'
order by schemaname, viewname;

-- 5) Trigger functions and trigger definitions that reference targets
select
  n.nspname as table_schema,
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid, true) as trigger_sql
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and (
    pg_get_triggerdef(t.oid, true) ilike '%chat_logs%'
    or pg_get_triggerdef(t.oid, true) ilike '%social_links%'
    or pg_get_triggerdef(t.oid, true) ilike '%project_likes%'
  )
order by n.nspname, c.relname, t.tgname;

-- 6) RLS policies that reference target tables
select
  schemaname as policy_schema,
  tablename as policy_table,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and (
    tablename in ('chat_logs', 'social_links', 'project_likes')
    or coalesce(qual, '') ilike '%chat_logs%'
    or coalesce(qual, '') ilike '%social_links%'
    or coalesce(qual, '') ilike '%project_likes%'
    or coalesce(with_check, '') ilike '%chat_logs%'
    or coalesce(with_check, '') ilike '%social_links%'
    or coalesce(with_check, '') ilike '%project_likes%'
  )
order by tablename, policyname;
