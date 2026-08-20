-- =========================================================
-- DARAZ-CLONE CORE SCHEMA
-- Run in Supabase SQL Editor (or `supabase db push`)
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- ROLES ----------
create type user_role as enum ('admin', 'staff', 'customer');

-- Profile table, 1:1 with auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- CATEGORIES ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  image_url text,
  created_at timestamptz not null default now()
);

-- ---------- PRODUCTS ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  specifications jsonb not null default '{}'::jsonb,   -- flexible spec key/value map
  attributes jsonb not null default '{}'::jsonb,        -- color, size, variant options
  tags text[] not null default '{}',
  category_id uuid references public.categories(id) on delete set null,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  currency text not null default 'BDT',
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  sku text unique,
  status text not null default 'draft' check (status in ('draft','pending_review','published','archived')),
  source text not null default 'manual' check (source in ('manual','ai_import')),
  ai_confidence numeric(4,3), -- 0..1, populated for ai_import
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_status_idx on public.products(status);
create index products_category_idx on public.products(category_id);
create index products_tags_idx on public.products using gin(tags);
create index products_search_idx on public.products
  using gin (to_tsvector('english', title || ' ' || coalesce(description, '')));

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- PAGE BUILDER ----------
-- WordPress-style drag & drop pages made of ordered JSON blocks
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  blocks jsonb not null default '[]'::jsonb, -- [{ id, type, props }]
  status text not null default 'draft' check (status in ('draft','published')),
  seo_title text,
  seo_description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- ORDERS ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id),
  status text not null default 'pending'
    check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  total numeric(12,2) not null check (total >= 0),
  shipping_address jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0)
);

-- ---------- AI IMPORT QUEUE ----------
-- Staging area: AI-extracted product drafts awaiting admin review
create table public.ai_import_drafts (
  id uuid primary key default gen_random_uuid(),
  source_image_url text not null,
  extracted jsonb not null,           -- raw structured extraction from VLM
  confidence numeric(4,3),
  status text not null default 'pending_review'
    check (status in ('pending_review','approved','rejected')),
  reviewed_by uuid references public.profiles(id),
  resulting_product_id uuid references public.products(id),
  created_at timestamptz not null default now()
);

-- ---------- AUDIT LOGS ----------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,               -- e.g. 'product.create', 'product.publish'
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
create index audit_logs_actor_idx on public.audit_logs(actor_id);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

-- ---------- updated_at trigger helper ----------
create function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at before update on public.products
  for each row execute procedure public.set_updated_at();
create trigger pages_set_updated_at before update on public.pages
  for each row execute procedure public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute procedure public.set_updated_at();
