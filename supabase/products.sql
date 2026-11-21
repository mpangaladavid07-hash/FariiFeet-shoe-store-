-- ---------------------------------------------------------------------------
-- FariiFeet — product catalogue
--
-- Run once in the Supabase SQL editor (Dashboard -> SQL -> New query), after
-- `supabase/schema.sql`. Then run `supabase/seed-products.sql` to load the
-- current eleven shoes so the shop looks exactly as it does today.
--
-- Prefer a single paste? Run `supabase_products_setup.sql` (repo root) instead:
-- it creates this table with the shop-owner columns size_range /
-- available_colors / in_stock, turns on Realtime and seeds the same 21 shoes.
--
-- After that the storefront reads this table instead of `src/data/products.js`:
-- edit `price`, `image_url`, `category`, `is_new` or `is_active` in the
-- Supabase Table Editor and the live site follows on the next page load.
--
-- Columns the storefront needs, in shop-owner language:
--   id          URL-safe slug, e.g. 'new-balance-530' (primary key)
--   name        title shown on the card and product page
--   price       selling price in TZS, whole shillings, no commas
--   image_url   '/shoes/new-balance.jpg' or a full https:// URL
--   category    'sneakers' | 'heels' | 'slides' (drives the Shop tabs)
--   sizes       EU sizes that exist for this shoe (int array)
--   sold_out    EU sizes that are currently unavailable
--   compare_at  optional "was" price in TZS, shows the Save badge
--   is_new      true puts the shoe in the "New Drops" tab
--   is_active   false hides the shoe from the shop without deleting it
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id           text primary key,
  name         text not null check (char_length(btrim(name)) between 1 and 120),
  price        integer not null check (price >= 0),
  image_url    text not null default '',
  category     text not null default 'sneakers'
               check (category in ('sneakers', 'heels', 'slides')),
  sizes        integer[] not null default '{36,37,38,39,40,41,42,43,44,45}',
  sold_out     integer[] not null default '{}',
  compare_at   integer check (compare_at is null or compare_at >= 0),
  colorway     text not null default '',
  badge        text not null default '',
  blurb        text not null default '',
  description  text not null default '',
  details      text[] not null default '{}',
  rating       numeric(2, 1) not null default 4.8
               check (rating >= 0 and rating <= 5),
  is_new       boolean not null default false,
  is_active    boolean not null default true,
  sort_order   integer not null default 100,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Re-running this file on a project created from an older copy must not fail.
alter table public.products add column if not exists sizes integer[]
  not null default '{36,37,38,39,40,41,42,43,44,45}';
alter table public.products add column if not exists sold_out integer[]
  not null default '{}';
alter table public.products add column if not exists compare_at integer;
alter table public.products add column if not exists colorway text
  not null default '';
alter table public.products add column if not exists badge text
  not null default '';
alter table public.products add column if not exists blurb text
  not null default '';
alter table public.products add column if not exists description text
  not null default '';
alter table public.products add column if not exists details text[]
  not null default '{}';
alter table public.products add column if not exists rating numeric(2, 1)
  not null default 4.8;
alter table public.products add column if not exists is_new boolean
  not null default false;
alter table public.products add column if not exists is_active boolean
  not null default true;
alter table public.products add column if not exists sort_order integer
  not null default 100;
alter table public.products add column if not exists created_at timestamptz
  not null default now();
alter table public.products add column if not exists updated_at timestamptz
  not null default now();

create index if not exists products_category_idx on public.products (category);
create index if not exists products_active_sort_idx
  on public.products (is_active, sort_order);

-- Keep `updated_at` honest when prices are edited in the dashboard.
create or replace function public.touch_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_products_updated_at();

alter table public.products enable row level security;

-- Shoppers may read the catalogue; they can never write to it. The Table
-- Editor and the SQL editor use the service role, so pricing stays editable
-- from the dashboard even though the anon key is read-only here.
drop policy if exists "products anon read" on public.products;
create policy "products anon read"
  on public.products for select
  to anon
  using (is_active);

grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
