-- =========================================================
-- MIGRATION V2 — Run in Supabase SQL Editor AFTER schema.sql
-- Adds all missing tables for full ecommerce feature set
-- =========================================================

-- Add missing columns to orders
alter table public.orders 
  add column if not exists payment_method text not null default 'cod' 
    check (payment_method in ('cod','sslcommerz','bkash','nagad','rocket')),
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','refunded'));

-- Add missing column to profiles
alter table public.profiles
  add column if not exists phone text,
  add column if not exists email text;

-- Sync email from auth.users into profiles (run once)
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Keep email in sync on new signups
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    'customer',
    new.email
  )
  on conflict (id) do update set email = new.email;
  return new;
end;
$$;

-- ---------- BRANDS ----------
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now()
);

alter table public.products
  add column if not exists brand_id uuid references public.brands(id) on delete set null;

-- ---------- BANNERS ----------
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  link_url text,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- COUPONS ----------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percentage','fixed')),
  value numeric(12,2) not null check (value > 0),
  min_order_amount numeric(12,2),
  max_uses integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- WISHLIST ----------
create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

-- ---------- REVIEWS ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  created_at timestamptz not null default now(),
  unique(product_id, user_id)
);

-- ---------- ADDRESSES ----------
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  address_line1 text not null,
  city text not null,
  district text not null,
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- RLS for new tables ----------
alter table public.brands enable row level security;
alter table public.banners enable row level security;
alter table public.coupons enable row level security;
alter table public.wishlist enable row level security;
alter table public.reviews enable row level security;
alter table public.addresses enable row level security;

-- brands: public read, staff write
create policy "brands_public_read" on public.brands for select using (true);
create policy "brands_staff_write" on public.brands for all using (public.current_role() in ('admin','staff'));

-- banners: public read active, staff manage
create policy "banners_public_read" on public.banners for select using (active = true or public.current_role() in ('admin','staff'));
create policy "banners_staff_write" on public.banners for all using (public.current_role() in ('admin','staff'));

-- coupons: staff manage, customers can read active to validate
create policy "coupons_staff_all" on public.coupons for all using (public.current_role() in ('admin','staff'));
create policy "coupons_customer_read" on public.coupons for select using (active = true);

-- wishlist: own only
create policy "wishlist_own" on public.wishlist for all using (user_id = auth.uid());

-- reviews: public read, own write
create policy "reviews_public_read" on public.reviews for select using (true);
create policy "reviews_own_write" on public.reviews for insert with check (user_id = auth.uid());
create policy "reviews_own_update" on public.reviews for update using (user_id = auth.uid());
create policy "reviews_admin_delete" on public.reviews for delete using (public.current_role() = 'admin');

-- addresses: own only
create policy "addresses_own" on public.addresses for all using (user_id = auth.uid());

-- ---------- Atomic stock decrement RPC ----------
create or replace function public.decrement_stock(p_id uuid, qty integer)
returns void
language plpgsql
security definer
as $$
begin
  update public.products
  set stock_quantity = stock_quantity - qty
  where id = p_id and stock_quantity >= qty;
  
  if not found then
    raise exception 'Insufficient stock for product %', p_id;
  end if;
end;
$$;
