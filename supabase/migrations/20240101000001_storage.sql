-- AutoMind invoices storage bucket

-- Create the private invoices bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invoices',
  'invoices',
  false,
  52428800, -- 50 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- RLS policies on storage.objects
-- Path convention: {user_id}/{car_id}/{timestamp}.{ext}
-- The first folder segment is always the user's UUID.

create policy "Users can upload their own invoices"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'invoices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view their own invoices"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'invoices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own invoices"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'invoices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
