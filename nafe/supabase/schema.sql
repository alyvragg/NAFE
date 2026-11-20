-- =============================================================================
-- NAFE — ESQUEMA COMPLETO DE BASE DE DATOS Y STORAGE EN SUPABASE
-- =============================================================================

create schema if not exists private;

-- 1. TABLA PROFILES (Comprador + Perfil de Vendedor/Productor)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Vecino',
  contact text not null default '',
  role text not null default 'comprar' check (role in ('comprar', 'vender', 'ambos', 'buyer', 'seller', 'both')),
  phone_whatsapp text,
  stall_name text,
  producer_bio text,
  default_meeting_point text,
  search_radius_km integer not null default 10,
  city_label text default 'Centro, Durango',
  last_lat double precision,
  last_lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists phone_whatsapp text;
alter table public.profiles add column if not exists stall_name text;
alter table public.profiles add column if not exists producer_bio text;
alter table public.profiles add column if not exists default_meeting_point text;
alter table public.profiles add column if not exists search_radius_km integer not null default 10;
alter table public.profiles add column if not exists last_lat double precision;
alter table public.profiles add column if not exists last_lng double precision;
alter table public.profiles add column if not exists city_label text default 'Centro, Durango';

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, contact, phone_whatsapp, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Vecino NAFE'),
    coalesce(nullif(trim(new.raw_user_meta_data->>'contact'), ''), coalesce(new.email, new.phone, '')),
    coalesce(nullif(trim(new.raw_user_meta_data->>'phone_whatsapp'), ''), nullif(trim(new.raw_user_meta_data->>'contact'), '')),
    case
      when new.raw_user_meta_data->>'role' in ('comprar', 'vender', 'ambos', 'buyer', 'seller', 'both')
        then new.raw_user_meta_data->>'role'
      else 'ambos'
    end
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        contact = excluded.contact,
        phone_whatsapp = excluded.phone_whatsapp,
        role = excluded.role,
        updated_at = now();
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

-- 2. TABLA PRODUCERS (Publicaciones geo-referenciadas del radar con fotos)
create table if not exists public.producers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  title text not null,
  producer_name text not null,
  category text not null check (category in ('comida', 'plantas', 'mineria', 'campo', 'artesania', 'textiles', 'servicios')),
  description text not null,
  public_meeting_point text not null,
  schedule_today text not null default 'Hoy de 08:30 a 18:00 hrs',
  savings_tag text not null default 'Trato directo sin comisiones',
  approx_lat double precision not null,
  approx_lng double precision not null,
  status text not null default 'confirmed_today' check (status in ('confirmed_today', 'on_demand')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  photos text[] not null default '{}',
  whatsapp text not null,
  created_at timestamptz not null default now()
);

create index if not exists producers_owner_id_idx on public.producers (owner_id);
create index if not exists producers_category_status_idx on public.producers (category, status);

alter table public.producers enable row level security;

create policy "producers_select_all" on public.producers
  for select to anon, authenticated
  using (true);

create policy "producers_insert_public" on public.producers
  for insert to anon, authenticated
  with check (owner_id is null or (select auth.uid()) = owner_id);

create policy "producers_update_own" on public.producers
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "producers_delete_own" on public.producers
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- 3. TABLA SAVED_PRODUCERS (Favoritos)
create table if not exists public.saved_producers (
  user_id uuid not null references auth.users(id) on delete cascade,
  producer_id uuid not null references public.producers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, producer_id)
);

alter table public.saved_producers enable row level security;

create policy "saved_producers_all_own" on public.saved_producers
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 4. SUPABASE STORAGE: BUCKET PÚBLICO producer-photos
insert into storage.buckets (id, name, public)
values ('producer-photos', 'producer-photos', true)
on conflict (id) do update set public = true;

create policy "producer_photos_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'producer-photos');

create policy "producer_photos_public_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'producer-photos');

create policy "producer_photos_public_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'producer-photos')
  with check (bucket_id = 'producer-photos');

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.producers to anon, authenticated;
grant all on public.saved_producers to authenticated;
