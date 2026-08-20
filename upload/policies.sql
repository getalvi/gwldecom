-- =========================================================
-- ROW LEVEL SECURITY - defense in depth.
-- Every table is locked down by default; API-layer RBAC in
-- src/lib/rbac.ts is the first gate, these policies are the
-- second gate that holds even if application code has a bug.
-- =========================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.pages enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.ai_import_drafts enable row level security;
alter table public.audit_logs enable row level security;

-- Helper: current user's role, cached per-statement
create function public.current_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------- profiles ----------
create policy "profiles_select_own_or_staff" on public.profiles
  for select using (id = auth.uid() or public.current_role() in ('admin','staff'));
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());
create policy "profiles_admin_manage" on public.profiles
  for all using (public.current_role() = 'admin');

-- ---------- categories (public read, staff+ write) ----------
create policy "categories_public_read" on public.categories
  for select using (true);
create policy "categories_staff_write" on public.categories
  for insert with check (public.current_role() in ('admin','staff'));
create policy "categories_staff_update" on public.categories
  for update using (public.current_role() in ('admin','staff'));
create policy "categories_admin_delete" on public.categories
  for delete using (public.current_role() = 'admin');

-- ---------- products ----------
-- Public can only see published products.
create policy "products_public_read_published" on public.products
  for select using (status = 'published' or public.current_role() in ('admin','staff'));
create policy "products_staff_insert" on public.products
  for insert with check (public.current_role() in ('admin','staff'));
create policy "products_staff_update" on public.products
  for update using (public.current_role() in ('admin','staff'));
create policy "products_admin_delete" on public.products
  for delete using (public.current_role() = 'admin');

-- ---------- product_images (inherit product visibility) ----------
create policy "product_images_read" on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and (p.status = 'published' or public.current_role() in ('admin','staff'))
    )
  );
create policy "product_images_staff_write" on public.product_images
  for all using (public.current_role() in ('admin','staff'));

-- ---------- pages ----------
create policy "pages_public_read_published" on public.pages
  for select using (status = 'published' or public.current_role() in ('admin','staff'));
create policy "pages_staff_write" on public.pages
  for all using (public.current_role() in ('admin','staff'));

-- ---------- orders (customers see only their own) ----------
create policy "orders_customer_read_own" on public.orders
  for select using (customer_id = auth.uid() or public.current_role() in ('admin','staff'));
create policy "orders_customer_insert_own" on public.orders
  for insert with check (customer_id = auth.uid());
create policy "orders_staff_update" on public.orders
  for update using (public.current_role() in ('admin','staff'));

create policy "order_items_read" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.customer_id = auth.uid() or public.current_role() in ('admin','staff'))
    )
  );
create policy "order_items_customer_insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.customer_id = auth.uid()
    )
  );

-- ---------- ai_import_drafts (staff/admin only, never public) ----------
create policy "ai_drafts_staff_all" on public.ai_import_drafts
  for all using (public.current_role() in ('admin','staff'));

-- ---------- audit_logs (admin read-only, system inserts via service role) ----------
create policy "audit_logs_admin_read" on public.audit_logs
  for select using (public.current_role() = 'admin');
-- Note: inserts happen exclusively via the service-role key from trusted
-- server code (src/lib/audit.ts), which bypasses RLS by design.
