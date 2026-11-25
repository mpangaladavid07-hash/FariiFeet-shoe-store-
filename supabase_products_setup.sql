-- ===========================================================================
-- FariiFeet — product catalogue setup (one paste, safe to re-run)
-- ===========================================================================
--
-- HOW TO USE
--   1. Open https://supabase.com/dashboard/project/<project-ref>
--   2. Left sidebar -> SQL Editor -> "+ New query"
--   3. Paste this whole file, press "Run" (or Ctrl/Cmd + Enter)
--   4. Open Table Editor -> public.products: edit name / size_range /
--      available_colors / price / image_url / in_stock. The live site follows
--      within a second (Realtime) or on the next page load.
--
-- WHAT IT DOES
--   * creates public.products with human-readable columns (or upgrades the
--     older, developer-shaped table if you already ran supabase/products.sql)
--   * keeps `updated_at` accurate on every edit
--   * turns on Row Level Security: visitors can SELECT, only you (dashboard /
--     service role / a signed-in admin) can INSERT, UPDATE, DELETE
--   * publishes the table to Supabase Realtime so an open storefront updates
--     without a refresh
--   * seeds your 21 original shoes without touching rows you have edited
--     (the 30 shoes added on 23 Nov 2026 are in supabase/new-arrivals.sql)
--
-- COLUMN CHEAT SHEET (what you edit in the Table Editor)
--   id                text   URL-safe slug, e.g. 'new-balance-530'.
--                            Text (not uuid) on purpose: the id travels in the
--                            bag, in saved links and in the Instagram importer,
--                            so it must stay readable. Leave the default and
--                            you get 'shoe-a1b2c3d4'.
--   name              text   Shoe name / brand line shown on the card.
--   size_range        text   '39 - 45', '27 - 36', or '38, 39, 41'.
--                            A single number means "one size only".
--   available_colors  text   'Black, White, Navy' — comma separated.
--   price             int    Selling price in TZS, whole shillings, no commas
--                            (65000, not "65,000").
--   category          text   'sneakers' | 'heels' | 'slides' (drives the tabs).
--   image_url         text   '/shoes/new-balance.jpg' or a full https:// URL.
--   in_stock          bool   OFF = shown as sold out, cannot be added to bag.
--   updated_at        tstz   Maintained by a trigger; do not edit.
--
-- Legacy columns kept so nothing else breaks: sizes (int[]), sold_out (int[]),
-- compare_at, colorway, badge, blurb, description, details, rating, is_new,
-- is_active, sort_order, created_at.
-- ===========================================================================

create extension if not exists pgcrypto;

create table if not exists public.products (
  id               text primary key
                   default ('shoe-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  name             text not null default 'New shoe'
                   check (char_length(btrim(name)) between 1 and 140),
  size_range       text not null default '38 - 45',
  available_colors text not null default 'Black',
  price            integer not null default 0 check (price >= 0),
  category         text not null default 'sneakers',
  image_url        text not null default '',
  in_stock         boolean not null default true,
  compare_at       integer check (compare_at is null or compare_at >= 0),
  colorway         text not null default '',
  badge            text not null default '',
  blurb            text not null default '',
  description      text not null default '',
  details          text[] not null default '{}',
  sizes            integer[] not null
                   default '{36,37,38,39,40,41,42,43,44,45}',
  sold_out         integer[] not null default '{}',
  rating           numeric(2, 1) not null default 4.8
                   check (rating >= 0 and rating <= 5),
  is_new           boolean not null default false,
  is_active        boolean not null default true,
  sort_order       integer not null default 100,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Upgrade path: an older products table gets every missing column, so this
-- script works on a brand-new project *and* on one created from
-- supabase/products.sql (which has no size_range / available_colors / in_stock).
alter table public.products add column if not exists name text
  not null default 'New shoe';
alter table public.products add column if not exists size_range text
  not null default '38 - 45';
alter table public.products add column if not exists available_colors text
  not null default 'Black';
alter table public.products add column if not exists price integer
  not null default 0;
alter table public.products add column if not exists category text
  not null default 'sneakers';
alter table public.products add column if not exists image_url text
  not null default '';
alter table public.products add column if not exists in_stock boolean
  not null default true;
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
alter table public.products add column if not exists sizes integer[]
  not null default '{36,37,38,39,40,41,42,43,44,45}';
alter table public.products add column if not exists sold_out integer[]
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

-- Older tables restrict `category` to sneakers/heels/slides. Drop that limit so
-- you can type 'loafers', 'kids', 'sandals'… in the Table Editor.
alter table public.products drop constraint if exists products_category_check;

-- Only `text` ids get the friendly default; a uuid column is left alone.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products'
      and column_name = 'id' and data_type = 'text'
  ) then
    alter table public.products
      alter column id set default ('shoe-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;
end $$;

create index if not exists products_category_idx on public.products (category);
create index if not exists products_active_sort_idx
  on public.products (is_active, sort_order);

-- ---------------------------------------------------------------------------
-- 2. updated_at: refreshed on every edit, including Table Editor edits
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------
-- anon (the publishable key in the browser bundle) can only READ active rows.
-- Writes stay with the dashboard, the service role and signed-in admins, so a
-- visitor can never change a price — the browser key is public.

alter table public.products enable row level security;

drop policy if exists "products anon read" on public.products;
create policy "products anon read"
  on public.products for select
  to anon, authenticated
  using (is_active);

drop policy if exists "products admin write" on public.products;
create policy "products admin write"
  on public.products for all
  to authenticated
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Realtime: an open storefront refreshes itself when you edit a row
-- ---------------------------------------------------------------------------

alter table public.products replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.products;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Friendly column notes (shown when you hover a column header)
-- ---------------------------------------------------------------------------

comment on table public.products is
  'FariiFeet live catalogue — edit a cell here and the storefront follows.';
comment on column public.products.size_range is
  'Sizes you sell, e.g. 39 - 45 or 38, 39, 41 (EU sizes)';
comment on column public.products.available_colors is
  'Colours to show the shopper, comma separated: Black, White, Navy';
comment on column public.products.price is
  'Selling price in TZS, whole shillings — 65000, never 65,000';
comment on column public.products.in_stock is
  'OFF shows Sold out and hides Add to bag';
comment on column public.products.image_url is
  'Shoe photo: /shoes/file.jpg from this repo, or a full https:// URL';

-- ---------------------------------------------------------------------------
-- 6. Seed: the 21 shoes on the shop floor today
-- ---------------------------------------------------------------------------
-- Re-running never overwrites your edits: `on conflict (id) do nothing`.

insert into public.products (
  id, name, size_range, available_colors, price, category, image_url,
  in_stock, compare_at, badge, blurb, description, details, rating, is_new, sort_order
)
values
  ('new-balance-530', 'New Balance 530 — Silver Storm', '36 - 45', 'Silver, White, Black', 145000, 'sneakers', '/shoes/new-balance.jpg', true, 175000, 'Icon', 'The cult-favourite 530 in an icy silver finish.', 'A true street-style icon, reworked in silver mesh and leather. The chunky ABZORB sole keeps every step cushioned while the metallic panels catch the Dar es Salaam sun.', array['Mesh & leather upper', 'ABZORB cushioning', 'True to size — go half up for a roomier fit']::text[], 4.9, true, 10),
  ('tory-burch-kitten', 'Tory Burch Suede Kitten Heel', '36 - 45', 'Amethyst, Black, Camel', 98000, 'heels', '/shoes/tory-burch.jpg', true, 120000, 'Icon', 'Soft suede, a sharp point and a walkable heel.', 'An everyday heel that behaves like a flat. Buttery suede, a refined pointed toe and a 5cm kitten heel — polished enough for the office, easy enough for after-work plans.', array['Genuine suede upper', '5cm kitten heel', 'Comfort-padded footbed']::text[], 4.8, true, 20),
  ('simple-raba-suede', 'Simple Raba Suede Trainer', '36 - 45', 'Cobalt, Rose, Burgundy', 85000, 'sneakers', '/shoes/simple-raba.jpg', true, null, 'New Drop', 'Retro suede trainers in three statement shades.', 'Our most-photographed pair. A slim retro silhouette in soft brushed suede, finished with tonal laces and a gum sole. Choose the colour that matches your mood.', array['Brushed suede upper', 'Gum rubber outsole', 'Unisex-leaning fit — take your usual EU size']::text[], 4.9, true, 30),
  ('mid-heel-01', 'Aaron Fair Pointed Kitten Heel', '36 - 45', 'Emerald, Blush, Black, Tangerine, Cobalt, Wine', 65000, 'heels', '/shoes/mid-heel-01.jpg', true, null, 'New Drop', 'Six colours. One endlessly wearable point.', 'The point-toe pump, softened. A low kitten heel and stitched vamp detail make this the pair you reach for on busy mornings — with six colourways to rotate.', array['Smooth leather-look upper', '4.5cm kitten heel', 'Pointed toe with stitch detail']::text[], 4.8, true, 40),
  ('raba-retro-heritage', 'Raba Retro Runner — Heritage Trio', '36 - 45', 'Navy, White, Sand', 85000, 'sneakers', '/shoes/raba-shoes-1.jpg', true, null, 'Everyday', 'A throwback runner in three easy neutrals.', 'A 70s-inspired runner built for long days on your feet. Suede overlays, a foam wedge sole and the kind of neutral palette that goes with everything in your wardrobe.', array['Suede & mesh upper', 'Foam wedge midsole', 'Lightweight everyday wear']::text[], 4.7, false, 50),
  ('brand-impo-flat', 'Impo Buckle Ballerina', '36 - 45', 'Plum, Mocha, Black, Rose, Blush', 60000, 'heels', '/shoes/brand-impo.jpg', true, null, 'New Drop', 'Soft square-toe flats with a sculptural buckle.', 'The flat you can wear from morning meetings to evening plans. A square toe, cushioned lining and an oversized buckle that makes the simplest outfit feel considered.', array['Patent-look upper', 'Square toe with metal buckle', 'Low block heel for support']::text[], 4.7, true, 60),
  ('butterfly-slide', 'Gold Butterfly Slide', '36 - 45', 'Black, Gold crystal', 55000, 'slides', '/shoes/simple-sandal-2.jpg', true, null, 'New Drop', 'Crystal butterfly slides for the evening.', 'A flat slide with a little drama. A crystal-embellished butterfly wings across a padded leather-look band — pair with denim or a slip dress and let them do the talking.', array['Crystal butterfly embellishment', 'Padded slip-on band', 'Flat, flexible sole']::text[], 4.8, true, 70),
  ('cobalt-loafer', 'Cobalt Driving Loafer', '36 - 45', 'Cobalt blue', 75000, 'sneakers', '/shoes/casual-loafers.jpg', true, null, 'New Drop', 'A colour-pop loafer on a sporty white sole.', 'A driving loafer with extra bounce. Cobalt leather, contrast stitching and a lightweight white tread sole make it the easiest way to add colour to denim and tailoring.', array['Smooth leather-look upper', 'Chunky white tread sole', 'Gold-tone snaffle trim']::text[], 4.7, true, 80),
  ('blueberry-kitten', 'Blueberry Kitten Pump — Noir', '36 - 45', 'Black leather', 65000, 'heels', '/shoes/blueberry-shoes.jpg', true, null, 'Core', 'The little black heel that never misses.', 'A pointed kitten pump with a gentle 5cm heel and a soft leather finish. The shoe that quietly finishes every outfit — desk to dinner without a second thought.', array['Soft leather-look upper', '5cm covered kitten heel', 'Pointed toe']::text[], 4.9, false, 90),
  ('ben-bu-canvas', 'Ben Bu Low-Top — Crimson', '36 - 45', 'Crimson, White', 55000, 'sneakers', '/shoes/ben-bu.jpg', true, null, 'Everyday', 'Cherry-red canvas with a chunky gummy sole.', 'Weekend-ready canvas low-tops in a rich crimson. The padded collar and grippy sole make them ideal for errands, travel and everything in between.', array['Cotton canvas upper', 'Chunky gum rubber sole', 'Padded ankle collar']::text[], 4.6, false, 100),
  ('chachacha-sandal', 'Chachacha Woven Sandal', '36 - 45', 'Terracotta, Navy, Gold, Burgundy', 55000, 'heels', '/shoes/chachacha-sandals.jpg', true, null, 'Bestseller', 'Hand-woven caged sandals in four finishes.', 'An intricate woven upper on a flat, flexible sole. The kind of sandal that works for brunch, market runs and holidays — and looks just as good in gold as it does in leather.', array['Woven leather-look straps', 'Adjustable ankle buckle', 'Flat sole for all-day wear']::text[], 4.8, false, 110),
  ('two-tone-buckle-point', 'Two-Tone Buckle Point', '36 - 45', 'Stone, Navy, Black', 62000, 'heels', '/shoes/simple-shoes.jpg', true, null, 'New Drop', 'Colour-blocked points with a square buckle.', 'A pointed flat with a two-tone twist. The square buckle and contrast toe give a classic silhouette a modern edge — polished enough for the office, easy enough for the weekend.', array['Two-tone leather-look upper', 'Square buckle detail', 'Cushioned flat footbed']::text[], 4.7, true, 120),
  ('shef-mamie-slipon', 'Shef Mamie Slip-On — Mono', '36 - 45', 'Black, White', 60000, 'sneakers', '/shoes/shef-mamie.jpg', true, null, 'Everyday', 'The slip-on that goes with absolutely everything.', 'Clean, minimal and made for moving. A low-profile slip-on in black or white with a padded insole and a flexible sole. No laces, no effort, all comfort.', array['Smooth leather-look upper', 'Elastic side gores', 'Flexible rubber sole']::text[], 4.6, false, 130),
  ('wage-ballet', 'Wage Round-Toe Ballet', '36 - 45', 'Black, Wine, Cobalt', 58000, 'heels', '/shoes/wage-shoes.jpg', true, null, 'Core', 'The round-toe flat, refined.', 'A softly rounded ballet flat with a textured vamp band and a low wedge for support. The pair you keep by the door because it works with every single thing.', array['Leather-look upper', 'Low supportive wedge', 'Textured vamp band']::text[], 4.7, false, 140),
  ('raba-retro-white', 'Raba Retro Runner — Cloud White', '36 - 45', 'White, Black', 85000, 'sneakers', '/shoes/raba-shoes-2.jpg', true, null, 'Everyday', 'A crisp all-white runner with black stripes.', 'The cleanest pair in the edit. White suede-look panels, black side stripes and a gum-tinted sole — a fail-safe finish for denim, dresses and everything else.', array['Suede-look & mesh upper', 'Contrast side stripes', 'Cushioned foam midsole']::text[], 4.7, false, 150),
  ('mesh-buckle-ballet', 'Mesh Buckle Ballet', '36 - 45', 'Rose, Black, Mocha', 60000, 'heels', '/shoes/simple-shoes-02.jpg', true, null, 'Trending', 'Breathable mesh with a statement buckle strap.', 'The mesh flat that is suddenly everywhere. Lightweight, breathable and finished with an adjustable buckle strap — a modern take on a ballet classic.', array['Breathable mesh upper', 'Adjustable buckle strap', 'Flexible flat sole']::text[], 4.8, false, 160),
  ('tommy-bar-slide', 'Tommy Bar Slide', '36 - 45', 'Cognac, Black, White', 58000, 'slides', '/shoes/simple-sandal.jpg', true, null, 'Core', 'A clean leather slide with polished hardware.', 'The everyday slide, elevated. A wide leather-look band with a polished metal bar and a lightly padded footbed. Throw them on with denim, linen or a swimsuit cover-up.', array['Leather-look band', 'Metal bar hardware', 'Padded footbed']::text[], 4.7, false, 170),
  ('raba-retro-midnight', 'Raba Retro Runner — Midnight', '36 - 45', 'Midnight navy, Cream', 85000, 'sneakers', '/shoes/raba-shoes-3.jpg', true, null, 'Everyday', 'A deep navy runner with cream accents.', 'Navy suede-look panels, cream stripes and a sculpted sole — a retro runner that reads polished, not sporty. An easy pairing with tailored trousers or weekend denim.', array['Suede-look upper', 'Sculpted foam midsole', 'Contrast cream stripes']::text[], 4.7, false, 180),
  ('fitkids-laceup', 'FitKids Lace-Up School Shoe', '27 - 36', 'Black', 48000, 'sneakers', '/shoes/fit-kids-2.jpg', true, null, 'Kids', 'Sturdy, smart and scuff-resistant for school days.', 'A proper school shoe built to survive the playground. Durable leather-look upper, secure laces and a flexible, grippy sole for growing feet.', array['Kids EU sizing 27–36', 'Durable leather-look upper', 'Grippy school-day sole']::text[], 4.8, false, 190),
  ('fitkids-mary-jane', 'FitKids Patent Mary Jane', '27 - 36', 'Black patent', 45000, 'sneakers', '/shoes/fit-kids.jpg', true, null, 'Kids', 'A glossy Mary Jane with a comfortable ripple sole.', 'A smart black patent Mary Jane with a sweet cut-out detail and a lightweight ripple sole. Made for school, church and every special occasion in between.', array['Kids EU sizing 27–36', 'Patent-look upper', 'Lightweight ripple sole']::text[], 4.8, false, 200),
  ('crabkids-school', 'CrabKids School Mary Jane', '27 - 36', 'Black, Pink sole', 45000, 'sneakers', '/shoes/crab-shoes.jpg', true, null, 'Kids', 'Hard-wearing school shoes with a fun pink sole.', 'Built for busy school days. A durable black upper with a buckle strap, scuff-resistant toe and a bright pink tread that kids love.', array['Kids EU sizing 27–36', 'Adjustable buckle strap', 'Scuff-resistant toe']::text[], 4.7, false, 210)
on conflict (id) do nothing;

-- Optional backfill for a project that already ran supabase/seed-products.sql:
-- rows that have never been edited (updated_at = created_at) and still carry
-- the placeholder values get the friendly size range / colour list derived from
-- their existing `sizes` and `colorway` columns. Anything you have touched in
-- the Table Editor is left exactly as it is. One statement, so both columns are
-- computed from the row as it was before the update.
update public.products p
set size_range = case
      when p.size_range = '38 - 45' and array_length(p.sizes, 1) > 1
        then p.sizes[1] || ' - ' || p.sizes[array_length(p.sizes, 1)]
      else p.size_range
    end,
    available_colors = case
      when p.available_colors = 'Black' and btrim(p.colorway) <> ''
        then (
          select string_agg(btrim(colour), ', ')
          from unnest(string_to_array(replace(p.colorway, '/', ','), ',')) as colour
          where btrim(colour) <> ''
        )
      else p.available_colors
    end
where p.updated_at = p.created_at
  and (
    (p.size_range = '38 - 45' and array_length(p.sizes, 1) > 1)
    or (p.available_colors = 'Black' and btrim(p.colorway) <> '')
  );

-- Check it worked (uncomment and Run):
-- select count(*) from public.products;                                    -- 21
-- select name, size_range, available_colors, price from public.products
--   order by sort_order;


