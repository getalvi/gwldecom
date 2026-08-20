-- =========================================================
-- STORAGE: product-images bucket
-- Run after schema.sql and policies.sql
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 10485760, array['image/webp','image/jpeg','image/png'])
on conflict (id) do nothing;

-- Public read (product photos must be publicly viewable on the storefront)
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

-- Only admin/staff can upload/delete. Uses the same profiles.role check as
-- the rest of the app (see supabase/policies.sql: public.current_role()).
create policy "product_images_staff_upload" on storage.objects
  for insert with check (
    bucket_id = 'product-images' and public.current_role() in ('admin','staff')
  );

create policy "product_images_staff_delete" on storage.objects
  for delete using (
    bucket_id = 'product-images' and public.current_role() in ('admin','staff')
  );
