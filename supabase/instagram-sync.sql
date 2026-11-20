-- ---------------------------------------------------------------------------
-- FariiFeet — Instagram Graph API -> catalogue importer
--
-- Run once in the Supabase SQL editor (Dashboard -> SQL -> New query) AFTER
-- `supabase/products.sql` (and after `supabase/seed-products.sql`). Safe to
-- re-run: every statement is idempotent.
--
-- What it adds:
--   1. Four bookkeeping columns on `products` so an imported shoe can be traced
--      back to the exact Instagram post it came from (and never imported twice).
--   2. A public `product-images` Storage bucket. The Netlify function uploads the
--      cropped 4:5 photos there with the service role; shoppers only read.
--   3. `instagram_sync_runs`, a small audit log of every sync attempt. It has no
--      RLS policies on purpose, so only the service role (the function) can read
--      or write it — the anon key used by the storefront cannot see the log.
-- ---------------------------------------------------------------------------

alter table public.products add column if not exists source text
  not null default 'manual';
alter table public.products add column if not exists instagram_media_id text;
alter table public.products add column if not exists instagram_permalink text
  not null default '';
alter table public.products add column if not exists instagram_posted_at timestamptz;

-- One row per Instagram post. The importer checks this index before downloading
-- anything, so re-running the sync (or running it twice in one day) is harmless.
create unique index if not exists products_instagram_media_id_key
  on public.products (instagram_media_id)
  where instagram_media_id is not null;

create index if not exists products_source_idx on public.products (source);

-- ---------------------------------------------------------------------------
-- Storage bucket for the cropped photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may view a product photo (the storefront needs the public URL).
-- There is deliberately no insert/update/delete policy: uploads use the
-- service role from the Netlify function, which bypasses RLS.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'product images public read'
  ) then
    create policy "product images public read"
      on storage.objects for select
      using (bucket_id = 'product-images');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Sync audit log (service role only)
-- ---------------------------------------------------------------------------

create table if not exists public.instagram_sync_runs (
  id          bigserial primary key,
  trigger     text not null default 'manual',
  status      text not null default 'running'
              check (status in ('running', 'ok', 'partial', 'failed')),
  posts_seen  integer not null default 0,
  imported    integer not null default 0,
  skipped     integer not null default 0,
  failed      integer not null default 0,
  message     text not null default '',
  detail      jsonb not null default '[]'::jsonb,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists instagram_sync_runs_started_idx
  on public.instagram_sync_runs (started_at desc);

alter table public.instagram_sync_runs enable row level security;

-- No policies: RLS stays on and nobody but the service role can touch this log.
revoke all on public.instagram_sync_runs from anon, authenticated;
grant all on public.instagram_sync_runs to service_role;
grant usage, select on sequence public.instagram_sync_runs_id_seq to service_role;

-- Sanity checks.
-- select source, count(*) from public.products group by source;
-- select id, trigger, status, imported, skipped, message, started_at
--   from public.instagram_sync_runs order by started_at desc limit 5;
