-- =============================================================================
-- NAFE — ESQUEMA DEFINITIVO DE BASE DE DATOS, TRIGGERS, STORAGE Y REALTIME
-- =============================================================================

create schema if not exists private;

-- 1. TABLA PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Vecino',
  avatar_url text,
  contact text not null default '',
  role text not null default 'comprar' check (role in ('comprar', 'vender', 'ambos', 'buyer', 'seller', 'both')),
  phone_whatsapp text,
  stall_name text,
  producer_bio text,
  default_meeting_point text,
  is_verified boolean not null default false,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'pending', 'verified')),
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro', 'coop')),
  subscription_expires_at timestamptz,
  search_radius_km integer not null default 10,
  last_lat double precision,
  last_lng double precision,
  city_label text default 'Centro, Durango',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists verification_status text not null default 'unverified';
alter table public.profiles add column if not exists subscription_tier text not null default 'free';
alter table public.profiles add column if not exists subscription_expires_at timestamptz;

alter table public.profiles enable row level security;

-- 2. TABLA BUSINESSES (Negocios y puestos reales del radar)
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  producer_name text not null default 'Productor Local',
  category text not null check (category in ('comida', 'plantas', 'mineria', 'campo', 'artesania', 'textiles', 'servicios')),
  description text not null,
  public_meeting_point text not null,
  schedule_today text not null default 'Hoy de 08:30 a 18:00 hrs',
  approx_lat double precision not null,
  approx_lng double precision not null,
  whatsapp text not null,
  is_in_stock boolean not null default true,
  stock_updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  photos text[] not null default '{}',
  avg_rating numeric(2,1) not null default 0.0,
  reviews_count integer not null default 0,
  completed_sales_count integer not null default 0,
  verified_sales_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.businesses
  add column if not exists completed_sales_count integer not null default 0,
  add column if not exists verified_sales_count integer not null default 0;

create index if not exists businesses_owner_id_idx on public.businesses (owner_id);
create index if not exists businesses_category_stock_idx on public.businesses (category, is_in_stock);

alter table public.businesses enable row level security;

create policy "businesses_select_all" on public.businesses
  for select to anon, authenticated
  using (true);

create policy "businesses_insert_owner" on public.businesses
  for insert to anon, authenticated
  with check (owner_id is null or (select auth.uid()) = owner_id);

create policy "businesses_update_owner" on public.businesses
  for update to anon, authenticated
  using (owner_id is null or (select auth.uid()) = owner_id)
  with check (owner_id is null or (select auth.uid()) = owner_id);

create policy "businesses_delete_owner" on public.businesses
  for delete to anon, authenticated
  using (owner_id is null or (select auth.uid()) = owner_id);

-- Trigger: enforce_business_limit (1 gratis, 5 en Plan Cosecha 'pro', ilimitados en 'coop')
create or replace function private.enforce_business_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tier text;
  v_count integer;
begin
  if new.owner_id is null then
    return new;
  end if;

  select coalesce(subscription_tier, 'free')
    into v_tier
    from public.profiles
   where id = new.owner_id;

  select count(*)
    into v_count
    from public.businesses
   where owner_id = new.owner_id;

  if v_tier = 'free' and v_count >= 1 then
    raise exception 'SUBSCRIPTION_REQUIRED: El plan gratuito permite 1 negocio. Mejora a Plan Cosecha ($99 MXN/mes) para registrar más.';
  elsif v_tier = 'pro' and v_count >= 5 then
    raise exception 'SUBSCRIPTION_REQUIRED: El Plan Cosecha permite hasta 5 negocios. Mejora a Plan Cooperativa ($249 MXN/mes) para negocios ilimitados.';
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_business_limit() from public, anon, authenticated;

create trigger trg_enforce_business_limit
  before insert on public.businesses
  for each row execute function private.enforce_business_limit();

-- 3. TABLA VERIFICATION_REQUESTS
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stall_name text not null,
  craft_description text not null,
  public_point text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists verification_requests_user_id_idx on public.verification_requests (user_id);

alter table public.verification_requests enable row level security;

create policy "verification_requests_select_own" on public.verification_requests
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "verification_requests_insert_own" on public.verification_requests
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create or replace function private.sync_profile_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' then
    update public.profiles
       set is_verified = true,
           verification_status = 'verified',
           updated_at = now()
     where id = new.user_id;
  elsif new.status = 'pending' then
    update public.profiles
       set verification_status = 'pending',
           updated_at = now()
     where id = new.user_id;
  end if;
  return new;
end;
$$;

revoke execute on function private.sync_profile_verification() from public, anon, authenticated;

create trigger trg_sync_profile_verification
  after insert or update on public.verification_requests
  for each row execute function private.sync_profile_verification();

-- 4. TABLA REVIEWS (Calificaciones de 1 a 5 estrellas)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_name text not null default 'Vecino',
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (business_id, reviewer_id)
);

create index if not exists reviews_business_id_idx on public.reviews (business_id);

alter table public.reviews enable row level security;

create policy "reviews_select_all" on public.reviews
  for select to anon, authenticated
  using (true);

create policy "reviews_insert_all" on public.reviews
  for insert to anon, authenticated
  with check (reviewer_id is null or (select auth.uid()) = reviewer_id);

create policy "reviews_update_own" on public.reviews
  for update to authenticated
  using ((select auth.uid()) = reviewer_id)
  with check ((select auth.uid()) = reviewer_id);

create or replace function private.recalculate_business_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_biz uuid;
begin
  v_biz := coalesce(new.business_id, old.business_id);

  update public.businesses
     set avg_rating = coalesce(
           (select round(avg(rating)::numeric, 1) from public.reviews where business_id = v_biz),
           0.0
         ),
         reviews_count = (select count(*) from public.reviews where business_id = v_biz)
   where id = v_biz;

  return coalesce(new, old);
end;
$$;

revoke execute on function private.recalculate_business_rating() from public, anon, authenticated;

create trigger trg_recalculate_business_rating
  after insert or update or delete on public.reviews
  for each row execute function private.recalculate_business_rating();

-- 5. TABLA FAVORITES
create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

create index if not exists favorites_business_id_idx on public.favorites (business_id);

alter table public.favorites enable row level security;

create policy "favorites_all_own" on public.favorites
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 6. TABLA NOTIFICATIONS + TRIGGER notify_favorites_on_stock
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id, is_read);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function private.notify_favorites_on_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_in_stock = true and (old.is_in_stock = false or new.stock_updated_at > old.stock_updated_at) then
    insert into public.notifications (user_id, business_id, title, body)
    select f.user_id,
           new.id,
           '¡Lote disponible cerca de ti!',
           new.producer_name || ' acaba de confirmar stock de "' || new.name || '" en ' || new.public_meeting_point
      from public.favorites f
     where f.business_id = new.id;
  end if;
  return new;
end;
$$;

revoke execute on function private.notify_favorites_on_stock() from public, anon, authenticated;

create trigger trg_notify_favorites_on_stock
  after update on public.businesses
  for each row execute function private.notify_favorites_on_stock();

-- 7. TABLAS CONVERSATIONS Y MESSAGES (Chats en tiempo real)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  business_name text not null,
  producer_name text not null default 'Productor Local',
  buyer_id uuid references public.profiles(id) on delete set null,
  seller_id uuid references public.profiles(id) on delete set null,
  last_message text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists conversations_business_id_idx on public.conversations (business_id);

alter table public.conversations enable row level security;

create policy "conversations_select_all" on public.conversations
  for select to anon, authenticated
  using (true);

create policy "conversations_insert_all" on public.conversations
  for insert to anon, authenticated
  with check (true);

create policy "conversations_update_all" on public.conversations
  for update to anon, authenticated
  using (true)
  with check (true);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_name text not null default 'Vecino',
  is_from_seller boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy "messages_select_all" on public.messages
  for select to anon, authenticated
  using (true);

create policy "messages_insert_all" on public.messages
  for insert to anon, authenticated
  with check (true);

create or replace function private.update_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set last_message = new.body,
         last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

revoke execute on function private.update_conversation_last_message() from public, anon, authenticated;

create trigger trg_update_conversation_last_message
  after insert on public.messages
  for each row execute function private.update_conversation_last_message();

-- 8. TABLA SALES (Registro de ventas del vendedor + historial público verificado)
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid references public.profiles(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  item_summary text not null,
  quantity integer not null default 1 check (quantity > 0),
  amount_mxn numeric(10,2),
  buyer_confirmed boolean not null default false,
  buyer_confirmed_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create index if not exists sales_business_id_created_idx on public.sales (business_id, created_at desc);
create index if not exists sales_seller_id_created_idx on public.sales (seller_id, created_at desc);
create index if not exists sales_buyer_id_idx on public.sales (buyer_id);
create index if not exists sales_conversation_id_idx on public.sales (conversation_id);

alter table public.sales enable row level security;

create policy "sales_select_seller_or_buyer" on public.sales
  for select to authenticated
  using ((select auth.uid()) = seller_id or (select auth.uid()) = buyer_id);

create policy "sales_insert_seller" on public.sales
  for insert to authenticated
  with check (
    (select auth.uid()) = seller_id
    and exists (
      select 1 from public.businesses b
       where b.id = business_id
         and (b.owner_id = (select auth.uid()) or b.owner_id is null)
    )
  );

create policy "sales_update_seller" on public.sales
  for update to authenticated
  using ((select auth.uid()) = seller_id)
  with check ((select auth.uid()) = seller_id);

create policy "sales_update_buyer_confirm" on public.sales
  for update to authenticated
  using ((select auth.uid()) = buyer_id)
  with check ((select auth.uid()) = buyer_id and buyer_confirmed = true);

create policy "sales_delete_seller" on public.sales
  for delete to authenticated
  using (
    (select auth.uid()) = seller_id
    and exists (
      select 1 from public.businesses b
       where b.id = business_id
         and (b.owner_id = (select auth.uid()) or b.owner_id is null)
    )
  );

create or replace function private.protect_sale_fields_on_buyer_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) = old.buyer_id and (select auth.uid()) is distinct from old.seller_id then
    new.business_id := old.business_id;
    new.seller_id := old.seller_id;
    new.buyer_id := old.buyer_id;
    new.conversation_id := old.conversation_id;
    new.item_summary := old.item_summary;
    new.quantity := old.quantity;
    new.amount_mxn := old.amount_mxn;
    new.notes := old.notes;
    new.created_at := old.created_at;
    new.buyer_confirmed := true;
    new.buyer_confirmed_at := coalesce(new.buyer_confirmed_at, now());
  end if;
  return new;
end;
$$;

revoke execute on function private.protect_sale_fields_on_buyer_update() from public, anon, authenticated;

create trigger trg_protect_sale_fields_on_buyer_update
  before update on public.sales
  for each row execute function private.protect_sale_fields_on_buyer_update();

create or replace function private.recalculate_business_sales()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_biz uuid;
begin
  v_biz := coalesce(new.business_id, old.business_id);

  update public.businesses
     set completed_sales_count = (
           select count(*)
             from public.sales
            where business_id = v_biz
         ),
         verified_sales_count = (
           select count(*)
             from public.sales
            where business_id = v_biz
              and buyer_confirmed = true
         )
   where id = v_biz;

  return coalesce(new, old);
end;
$$;

revoke execute on function private.recalculate_business_sales() from public, anon, authenticated;

create trigger trg_recalculate_business_sales
  after insert or update or delete on public.sales
  for each row execute function private.recalculate_business_sales();

create or replace function private.notify_buyer_on_sale_logged()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_name text;
begin
  if new.buyer_id is not null and new.buyer_confirmed = false then
    select coalesce(name, producer_name, 'El productor')
      into v_business_name
      from public.businesses
     where id = new.business_id;

    insert into public.notifications (user_id, business_id, title, body)
    values (
      new.buyer_id,
      new.business_id,
      'Confirma tu entrega',
      coalesce(v_business_name, 'El productor') || ' marcó una entrega de ' || new.item_summary || '. Toca para confirmar.'
    );
  end if;
  return new;
end;
$$;

revoke execute on function private.notify_buyer_on_sale_logged() from public, anon, authenticated;

create trigger trg_notify_buyer_on_sale_logged
  after insert on public.sales
  for each row execute function private.notify_buyer_on_sale_logged();

-- Vista pública segura public.public_business_sales (excluye amount_mxn y notes)
create or replace view public.public_business_sales
with (security_invoker = false)
as
select
  s.id,
  s.business_id,
  s.item_summary,
  s.quantity,
  s.buyer_confirmed,
  s.buyer_confirmed_at,
  s.created_at,
  case
    when s.buyer_confirmed then 'Confirmada por vecino'
    else 'Registrada en puesto'
  end as verification_label
from public.sales s;

-- Función RPC segura get_public_business_sales
create or replace function public.get_public_business_sales(
  p_business_id uuid,
  p_limit integer default 15
)
returns table (
  id uuid,
  business_id uuid,
  item_summary text,
  quantity integer,
  buyer_confirmed boolean,
  buyer_confirmed_at timestamptz,
  created_at timestamptz,
  verification_label text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.business_id,
    s.item_summary,
    s.quantity,
    s.buyer_confirmed,
    s.buyer_confirmed_at,
    s.created_at,
    case
      when s.buyer_confirmed then 'Confirmada por vecino'
      else 'Registrada en puesto'
    end as verification_label
  from public.sales s
  where s.business_id = p_business_id
  order by s.created_at desc
  limit greatest(1, least(coalesce(p_limit, 15), 50));
$$;

-- 9. STORAGE BUCKETS: avatars y product-photos
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('product-photos', 'product-photos', true)
on conflict (id) do update set public = true;

create policy "avatars_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

create policy "avatars_public_write" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'avatars');

create policy "avatars_public_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

create policy "product_photos_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-photos');

create policy "product_photos_public_write" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'product-photos');

create policy "product_photos_public_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'product-photos')
  with check (bucket_id = 'product-photos');

-- Permisos Data API
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.businesses to anon, authenticated;
grant select, insert on public.verification_requests to authenticated;
grant select, insert, update on public.reviews to anon, authenticated;
grant all on public.favorites to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, update on public.conversations to anon, authenticated;
grant select, insert on public.messages to anon, authenticated;
grant select, insert, update, delete on public.sales to authenticated;
grant select on public.public_business_sales to anon, authenticated;
grant execute on function public.get_public_business_sales(uuid, integer) to anon, authenticated;

-- 10. CDN DE IMÁGENES (public.media_assets) Y VERIFICACIÓN OTP REAL (public.otp_verifications)
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  bucket text not null check (bucket in ('avatars', 'product-photos')),
  object_path text not null unique,
  public_url text not null,
  mime_type text not null default 'image/webp',
  size_bytes integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.media_assets enable row level security;

create table if not exists public.otp_verifications (
  id uuid primary key default gen_random_uuid(),
  contact_normalized text not null unique,
  code text not null,
  verified boolean not null default false,
  attempts integer not null default 0,
  consumed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  created_at timestamptz not null default now()
);

alter table public.otp_verifications add column if not exists attempts integer not null default 0;
alter table public.otp_verifications add column if not exists consumed_at timestamptz;
delete from public.otp_verifications older
using public.otp_verifications newer
where older.contact_normalized = newer.contact_normalized
  and (older.created_at < newer.created_at
    or (older.created_at = newer.created_at and older.id < newer.id));
create unique index if not exists otp_verifications_contact_normalized_uidx
  on public.otp_verifications (contact_normalized);

alter table public.otp_verifications enable row level security;

grant select, insert, delete on public.media_assets to anon, authenticated;
