-- Accident logs table
create table accident_logs (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars not null,
  user_id uuid references auth.users not null,
  date date not null,
  title text not null,
  description text,
  location text,
  mileage_at_accident int,
  at_fault boolean,
  third_party_involved boolean default false,
  police_report_number text,
  insurance_claim_number text,
  total_repair_cost numeric(10,2),
  insurance_covered numeric(10,2),
  out_of_pocket numeric(10,2),
  status text default 'open',
  damaged_parts text[],
  photo_urls text[],
  created_at timestamptz default now()
);

alter table accident_logs enable row level security;
create policy "own accidents" on accident_logs for all using (auth.uid() = user_id);

-- Accident photos storage bucket (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'accident-photos',
  'accident-photos',
  false,
  52428800, -- 50 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

-- RLS policies on storage.objects for accident-photos
-- Path convention: {user_id}/{car_id}/{accident_id}/{n}.{ext}
-- The first folder segment is always the user's UUID.

create policy "Users can upload their own accident photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'accident-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view their own accident photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'accident-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own accident photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'accident-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
