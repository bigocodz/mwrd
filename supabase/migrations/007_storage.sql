-- Phase 6: Storage buckets and RLS policies.

-- ============================================================
-- Buckets
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images',  'product-images',  true,  10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('kyc-documents',   'kyc-documents',   false, 20971520, array['application/pdf','image/jpeg','image/png']),
  ('org-assets',      'org-assets',      false, 5242880,  array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- ============================================================
-- product-images: public read, supplier write own bucket path
-- Path convention: {supplier_profile_id}/{product_id}/{filename}
-- ============================================================

create policy "product-images: public read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product-images: supplier upload"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = (
      select id::text from public.profiles
      where user_id = auth.uid()
        and role in ('SUPPLIER', 'ADMIN')
      limit 1
    )
  );

create policy "product-images: supplier update own"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (
      select id::text from public.profiles
      where user_id = auth.uid()
      limit 1
    )
  );

create policy "product-images: supplier delete own"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (
      select id::text from public.profiles
      where user_id = auth.uid()
      limit 1
    )
  );

-- ============================================================
-- kyc-documents: org members read own, admins read all
-- Path convention: {org_profile_id}/{document_type}/{filename}
-- ============================================================

create policy "kyc-documents: org member read own"
  on storage.objects for select
  using (
    bucket_id = 'kyc-documents'
    and auth.role() = 'authenticated'
    and (
      -- direct org member
      (storage.foldername(name))[1] = (
        select coalesce(p.parent_client_id::text, p.id::text)
        from public.profiles p
        where p.user_id = auth.uid()
        limit 1
      )
      -- or admin
      or exists (
        select 1 from public.profiles
        where user_id = auth.uid() and role = 'ADMIN'
      )
    )
  );

create policy "kyc-documents: org member upload"
  on storage.objects for insert
  with check (
    bucket_id = 'kyc-documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = (
      select coalesce(p.parent_client_id::text, p.id::text)
      from public.profiles p
      where p.user_id = auth.uid()
      limit 1
    )
  );

create policy "kyc-documents: org member delete own"
  on storage.objects for delete
  using (
    bucket_id = 'kyc-documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = (
      select coalesce(p.parent_client_id::text, p.id::text)
      from public.profiles p
      where p.user_id = auth.uid()
      limit 1
    )
  );

-- ============================================================
-- org-assets: org members read own (stamps, signatures, logos)
-- Path convention: {org_profile_id}/{asset_type}/{filename}
-- ============================================================

create policy "org-assets: org member read own"
  on storage.objects for select
  using (
    bucket_id = 'org-assets'
    and auth.role() = 'authenticated'
    and (
      (storage.foldername(name))[1] = (
        select coalesce(p.parent_client_id::text, p.id::text)
        from public.profiles p
        where p.user_id = auth.uid()
        limit 1
      )
      or exists (
        select 1 from public.profiles
        where user_id = auth.uid() and role = 'ADMIN'
      )
    )
  );

create policy "org-assets: org member upload"
  on storage.objects for insert
  with check (
    bucket_id = 'org-assets'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = (
      select coalesce(p.parent_client_id::text, p.id::text)
      from public.profiles p
      where p.user_id = auth.uid()
      limit 1
    )
  );

create policy "org-assets: org member delete own"
  on storage.objects for delete
  using (
    bucket_id = 'org-assets'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = (
      select coalesce(p.parent_client_id::text, p.id::text)
      from public.profiles p
      where p.user_id = auth.uid()
      limit 1
    )
  );
