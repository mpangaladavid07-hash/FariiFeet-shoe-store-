-- ---------------------------------------------------------------------------
-- FariiFeet — website orders
--
-- Run once in the Supabase SQL editor (Dashboard -> SQL -> New query).
-- The storefront posts to /rest/v1/orders with the public anon key; the hidden
-- /admin page reads and updates the same table.
--
-- Security note: the policies below are open to the anon role so the shop can
-- go live with a single copy-paste. That also means anyone who learns the
-- project URL plus the anon key can read customer phone numbers. Before
-- scaling up, replace the SELECT/UPDATE policies with an authenticated staff
-- user (Supabase Auth) or proxy reads through an Edge Function.
-- ---------------------------------------------------------------------------

create table if not exists public.orders (
  id              text primary key,
  created_at      timestamptz not null default now(),
  status          text not null default 'pending'
                  check (status in ('pending', 'out_for_delivery', 'delivered')),
  customer_name   text not null,
  customer_phone  text not null,
  delivery_area   text not null,
  region          text,
  delivery_type   text not null default 'dar'
                  check (delivery_type in ('dar', 'countrywide')),
  payment_method  text not null default 'cod'
                  check (payment_method in ('cod', 'momo', 'lipa')),
  subtotal        integer not null default 0,
  delivery_fee    integer not null default 0,
  total           integer not null default 0,
  items           jsonb not null default '[]'::jsonb,
  language        text not null default 'en',
  notes           text
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

alter table public.orders enable row level security;

drop policy if exists "orders anon insert" on public.orders;
create policy "orders anon insert"
  on public.orders for insert
  to anon
  with check (true);

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
  with check (true);
