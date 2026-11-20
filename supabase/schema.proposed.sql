-- ===========================================================================
-- Fariifeet Shoe Store — PROPOSED orders schema (v2)
-- ---------------------------------------------------------------------------
-- STATUS: proposal only. Nothing here is applied by the app, and this file is
-- never imported by the storefront. The live definition stays in schema.sql
-- until you run this in the Supabase SQL editor.
--
-- Why v2 exists: v1 (schema.sql) already matches the app 1:1, but it has no
-- updated_at column, no integrity checks beyond the three enums, and it lets
-- the anon key insert any status (a forged "delivered") and delete rows.
--
-- Safe to re-run: every statement is idempotent. Read the notes at the bottom
-- about the anon-key read policy before going live.
-- ===========================================================================

create table if not exists public.orders (
  id              text primary key,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  status          text not null default 'pending'
                  check (status in ('pending', 'out_for_delivery', 'delivered')),
  customer_name   text not null
                  check (char_length(btrim(customer_name)) between 1 and 80),
  customer_phone  text not null
                  check (customer_phone ~ '^\+255[67][0-9]{8}$'),
  delivery_area   text not null
                  check (char_length(btrim(delivery_area)) between 1 and 80),
  region          text,
  delivery_type   text not null default 'dar'
                  check (delivery_type in ('dar', 'countrywide')),
  payment_method  text not null default 'cod'
                  check (payment_method in ('cod', 'momo', 'lipa')),
  subtotal        integer not null default 0 check (subtotal >= 0),
  delivery_fee    integer not null default 0 check (delivery_fee >= 0),
  total           integer not null default 0 check (total >= 0),
  items           jsonb not null default '[]'::jsonb,
  language        text not null default 'en'
                  check (language in ('en', 'sw')),
  notes           text
);

-- ---------------------------------------------------------------------------
-- Upgrade an existing v1 table in place (no data loss, no column renames)
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists updated_at timestamptz not null default now();

alter table public.orders drop constraint if exists orders_total_matches;
alter table public.orders add constraint orders_total_matches
  check (total = subtotal + delivery_fee);

alter table public.orders drop constraint if exists orders_items_is_array;
alter table public.orders add constraint orders_items_is_array
  check (jsonb_typeof(items) = 'array');

alter table public.orders drop constraint if exists orders_id_format;
alter table public.orders add constraint orders_id_format
  check (id ~ '^FF-[0-9]{4}-[A-Z0-9]{4}$');

-- ---------------------------------------------------------------------------
-- Indexes — the order desk reads newest-first and filters by status
-- ---------------------------------------------------------------------------
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_phone_idx on public.orders (customer_phone);

-- ---------------------------------------------------------------------------
-- updated_at is maintained by the database, so admin status changes are
-- timestamped even though the browser only sends `{ status }`.
-- ---------------------------------------------------------------------------
create or replace function public.touch_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_orders_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
--
-- The storefront is a static site: it writes with the public anon key, so the
-- policies have to allow that key to insert. They do NOT allow deleting.
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;

drop policy if exists "orders anon insert" on public.orders;
create policy "orders anon insert"
  on public.orders for insert
  to anon
  with check (status = 'pending');

drop policy if exists "orders anon read" on public.orders;
create policy "orders anon read"
  on public.orders for select
  to anon
  using (true);

drop policy if exists "orders anon update" on public.orders;
create policy "orders anon update"
  on public.orders for update
  to anon
  using (true)
  with check (status in ('pending', 'out_for_delivery', 'delivered'));

-- ---------------------------------------------------------------------------
-- Hardening (optional, do this before real launch)
--
-- The read policy above lets anyone holding the anon key list every order —
-- including customer phone numbers. The /admin PIN only hides the page; it is
-- not authentication. When you are ready, replace the read/update policies
-- with a staff login (Supabase Auth) and revoke the anon grants:
--
--   drop policy "orders anon read" on public.orders;
--   drop policy "orders anon update" on public.orders;
--   revoke select, update on public.orders from anon;
--   create policy "orders staff read" on public.orders
--     for select to authenticated using (true);
--   create policy "orders staff update" on public.orders
--     for update to authenticated using (true) with check (true);
--
-- Until then, treat the anon key as semi-public and rotate it if it leaks.
-- ---------------------------------------------------------------------------
