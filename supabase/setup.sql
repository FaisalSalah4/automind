-- AutoMind full setup — paste this into the Supabase SQL Editor and run it.

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table if not exists cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  make text not null,
  model text not null,
  year int not null,
  license_plate text,
  current_mileage int not null,
  purchase_date date,
  created_at timestamptz default now()
);

create table if not exists maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars on delete cascade not null,
  user_id uuid references auth.users not null,
  type text not null check (type in ('oil_change','tire_rotation','inspection','repair','other')),
  title text not null,
  description text,
  mileage_at_service int not null,
  cost numeric(10,2),
  service_date date not null,
  next_service_mileage int,
  invoice_url text,
  created_at timestamptz default now()
);

create table if not exists fuel_logs (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars on delete cascade not null,
  user_id uuid references auth.users not null,
  date date not null,
  liters numeric(6,2) not null,
  cost_per_liter numeric(6,3) not null,
  total_cost numeric(8,2) not null,
  mileage int not null,
  full_tank boolean default true,
  notes text,
  created_at timestamptz default now()
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars on delete cascade not null,
  user_id uuid references auth.users not null,
  type text not null check (type in ('mileage','date')),
  title text not null,
  due_mileage int,
  due_date date,
  is_done boolean default false,
  created_at timestamptz default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table cars enable row level security;
alter table maintenance_logs enable row level security;
alter table fuel_logs enable row level security;
alter table reminders enable row level security;

create policy "own cars" on cars for all using (auth.uid() = user_id);
create policy "own maintenance" on maintenance_logs for all using (auth.uid() = user_id);
create policy "own fuel" on fuel_logs for all using (auth.uid() = user_id);
create policy "own reminders" on reminders for all using (auth.uid() = user_id);

-- ─── Storage bucket ───────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invoices',
  'invoices',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

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
