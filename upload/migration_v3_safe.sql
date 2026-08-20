-- =========================================================
-- MIGRATION V3 SAFE — AI Product Importer Tables
-- Safe to run multiple times (idempotent)
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- =========================================================

-- Ensure set_updated_at exists (from schema.sql, recreate if missing)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- import_jobs
create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id),
  type text not null check (type in ('url','bulk','crawl','search','sitemap','api')),
  status text not null default 'pending'
    check (status in ('pending','running','paused','completed','failed','cancelled')),
  source_input jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  progress_total integer not null default 0,
  progress_done integer not null default 0,
  progress_failed integer not null default 0,
  result_summary jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- import_items
create table if not exists public.import_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  url text not null,
  status text not null default 'pending'
    check (status in ('pending','extracting','preview','approved','rejected','imported','failed','skipped')),
  raw_html_length integer,
  extracted jsonb,
  extraction_method text,
  confidence numeric(4,3),
  warnings jsonb not null default '[]'::jsonb,
  error_message text,
  resulting_product_id uuid references public.products(id),
  duration_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_items_job_idx on public.import_items(job_id);
create index if not exists import_items_status_idx on public.import_items(status);

-- import_logs
create table if not exists public.import_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.import_jobs(id) on delete cascade,
  item_id uuid references public.import_items(id) on delete cascade,
  level text not null check (level in ('info','warn','error','debug')),
  message text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists import_logs_job_idx on public.import_logs(job_id);

-- RLS
alter table public.import_jobs enable row level security;
alter table public.import_items enable row level security;
alter table public.import_logs enable row level security;

drop policy if exists "import_jobs_staff" on public.import_jobs;
drop policy if exists "import_items_staff" on public.import_items;
drop policy if exists "import_logs_staff" on public.import_logs;

create policy "import_jobs_staff" on public.import_jobs
  for all using (public.current_role() in ('admin','staff'));

create policy "import_items_staff" on public.import_items
  for all using (public.current_role() in ('admin','staff'));

create policy "import_logs_staff" on public.import_logs
  for all using (public.current_role() in ('admin','staff'));

-- updated_at triggers
drop trigger if exists import_jobs_updated on public.import_jobs;
drop trigger if exists import_items_updated on public.import_items;

create trigger import_jobs_updated
  before update on public.import_jobs
  for each row execute procedure public.set_updated_at();

create trigger import_items_updated
  before update on public.import_items
  for each row execute procedure public.set_updated_at();

select 'Migration V3 complete ✓' as result;
