# Fariifeet Shoe Store — Retail Shoe Storefront

A retail storefront for **Fariifeet Shoe Store**, a shoe business in Kariakoo, Dar es Salaam offering different shoe designs for women and kids. Shoppers browse the shop's own product photography, pick a size and colourway, and check out straight to WhatsApp — with same-day delivery in Dar es Salaam, nationwide shipping across Tanzania, in-store pickup, bilingual English/Kiswahili copy and a PIN-protected order desk.

## Live demo
- **Website:** _Add the Netlify URL here once the site is deployed._

## Store location & contact

| | |
| --- | --- |
| **Shop** | Fariifeet Shoe Store — Kariakoo, Mtaa wa DDC (DDC Street), 1st Floor, Room No. 76, Dar es Salaam, Tanzania |
| **Business type** | Retail shoe store — different shoe designs in sneakers, heels & sandals, slides and kids' pairs |
| **WhatsApp / orders** | [+255 754 623 904](https://wa.me/255754623904) |
| **Instagram** | [@fariifeet](https://www.instagram.com/fariifeet) |

The shop address is shown in the hero, in the footer "Visit" block and in the checkout pickup note, and each mention links to Google Maps directions. The address is defined once as `STORE_ADDRESS` in `src/lib/store.js`.

## Key features

- **Retail footwear catalogue** — curated pairs across *All / Zote*, *Sneakers*, *Heels & Sandals*, *Slides* and *New Drops*, using the shop's real photos in `public/shoes/`.
- **Compact global search** — a slim search field in the top bar that sweeps the whole catalogue (name, colourway, category, description). Starting a search clears the active category tab, so matching shoes never hide behind an empty filter.
- **Size & colourway selection** — EU sizes per pair, "Add to bag" or a direct order from the product card/modal.
- **WhatsApp order handoff** — an itemised, pre-formatted order message (items, sizes, quantities, delivery, payment method, totals) opens in WhatsApp for the shop to confirm.
- **Bag & checkout** — customer name, phone, Dar area or region, delivery choice and payment choice (cash on delivery, mobile money, Lipa Namba), with a copyable order receipt.
- **In-store pickup details** — the exact Kariakoo shop address is included wherever a shopper arranges collection.
- **Bilingual (EN / SW)** — every label, validation message and order message exists in English and Kiswahili; the choice is remembered in `localStorage`.
- **Light & dark themes** — warm ivory/alabaster surfaces in light mode, espresso/near-black in dark mode, with the same dusty blush accents.
- **Admin order desk** — a hidden route at `/admin`, unlocked with a PIN, to review orders and move them through *Pending → Out for Delivery → Delivered*.
- **Catalogue you can edit yourself** — names, TZS prices, photos and categories live in the Supabase `products` table, so the shop owner changes a price in the Supabase dashboard and the storefront follows on the next page load. With no Supabase keys the built-in catalogue in `src/data/products.js` keeps the shop fully browsable.
- **Instagram drops that add themselves** — a scheduled Netlify function reads the shop's recent Instagram posts through the Graph API, pulls the name and TZS price out of each caption, crops the photo to the 4:5 product ratio, stores it in Supabase Storage and appends the pair to the catalogue. See [Instagram → catalogue](#instagram--catalogue).

## Tech stack

- **Frontend:** React 18, Vite 5, Tailwind CSS 3
- **Data:** Supabase (Postgres + RLS + Storage) when configured, with a browser `localStorage` fallback
- **Integrations:** WhatsApp `wa.me` deep links, optional FeedFusion Instagram feed, Instagram Graph API importer
- **Backend:** Netlify Functions (ESM, v2) for the scheduled Instagram import
- **Hosting:** Netlify (static build + functions)

## Project structure

```
public/
  images/fariifeet-logo.png        brand mark used in the hero, header, footer & favicon
  images/fariifeet-hero-shoes.jpg  cropped studio shot of the shop's heels (hero)
  shoes/                           the boutique's real product photography
netlify/
  functions/instagram-sync.mjs           POST/GET /api/instagram-sync (secret-protected)
  functions/instagram-sync-scheduled.mjs daily cron that imports new Instagram posts
  lib/instagram/caption.mjs              caption -> name / price / category / sizes
  lib/instagram/sync.mjs                 Graph API -> crop -> Supabase Storage -> products
src/
  App.jsx                          storefront composition, global search & bag state
  components/                      Hero, Navbar, ProductGrid, CartDrawer, AdminPage, …
  data/products.js                 built-in catalogue + offline fallback
  lib/store.js                     WhatsApp number, shop address, delivery & payment
  lib/catalogue.js                 reads the live catalogue from Supabase
  lib/orders.js                    order records, totals, receipts, admin statuses
  lib/i18n.jsx                     English ⇄ Kiswahili dictionary + provider
supabase_products_setup.sql          products + 21 seed rows + RLS + Realtime (one paste)
supabase/schema.sql                orders table + RLS, for cloud storage
supabase/products.sql              legacy two-step version of the products table
supabase/seed-products.sql         legacy one-time copy of the original 21 shoes
supabase/new-arrivals.sql          the 23 Nov 2026 arrivals (30 rows), safe to re-run
supabase/instagram-sync.sql        import columns, product-images bucket, run log
```

## Local setup

### 1. Clone the repository

```bash
git clone https://github.com/mpangaladavid07-hash/fariifeet-shoe-store.git
cd fariifeet-shoe-store
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your own values. `.env` is git-ignored — never commit it.

```env
# WhatsApp line that receives website orders (digits only, international format)
VITE_WHATSAPP_NUMBER=255754623904

# PIN for the hidden order desk at /admin
VITE_ADMIN_PIN=your_admin_pin

# Supabase (optional — leave empty to keep orders in this browser)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
# Current key name: Dashboard -> Project Settings -> API keys -> Publishable key
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
# Legacy name, still supported when the project hands out an anon JWT
# VITE_SUPABASE_ANON_KEY=eyJhbGciOi…

# FeedFusion "Seen on Instagram" feed (optional)
VITE_FEEDFUSION_URL=your_feed_url
VITE_FEEDFUSION_KEY=your_feed_key

# Instagram -> catalogue importer (SERVER ONLY — no VITE_ prefix, never inlined)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
INSTAGRAM_ACCESS_TOKEN=your_long_lived_graph_token
INSTAGRAM_USER_ID=me
INSTAGRAM_SYNC_SECRET=a_long_random_string
```

Only variables prefixed with `VITE_` are exposed to the browser. `src/lib/config.js` reads the browser key from `VITE_SUPABASE_PUBLISHABLE_KEY` and falls back to the older `VITE_SUPABASE_ANON_KEY`, exposing whichever is set as `SUPABASE_KEY`. Both are public by design (Vite inlines them into the bundle) — Row Level Security is what protects the data. A `sb_secret_…` key or a `service_role` JWT in a `VITE_` variable is refused at start-up, and `npm run deploy:env` refuses to push one. The `SUPABASE_SERVICE_ROLE_KEY` and `INSTAGRAM_*` values are read by the Netlify functions (and by `npm run instagram:sync`) and are never bundled — keep them out of `VITE_` names. The shop WhatsApp number also has a built-in fallback (`255754623904`) in `src/lib/store.js`, so the site works even with an empty `.env`.

### 4. Start the development server

```bash
npm run dev
```

- Storefront: <http://localhost:5173>
- Order desk: <http://localhost:5173/admin> (PIN `2007`; `VITE_ADMIN_PIN` overrides it)

### 5. Build for production

```bash
npm run build     # writes the static site to dist/
npm run preview   # serves dist/ at http://localhost:4173
```

## Available scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build on port 4173 |
| `npm run check:i18n` | Verifies every `t('…')` key exists in EN and SW |
| `npm run check:jsx` | Parses every JSX module for syntax errors |
| `npm run check:render` | Renders the app and key components server-side |
| `npm run check:orders` | Tests order IDs, totals, phones, statuses and WhatsApp links |
| `npm run check:catalogue` | Tests the Supabase product mapping and the offline fallback |
| `npm run check:instagram` | Tests caption parsing, photo cropping, the importer and its secret gate |
| `npm run check:supabase` | Live check: project reachable, tables/columns/bucket present (needs `.env`, uses the network) |
| `npm run instagram:sync` | Imports new Instagram posts into the catalogue (needs the server-side keys) |
| `npm run instagram:sync:dry` | Same run as a dry run — reads Instagram, uploads and writes nothing |
| `npm run products:push` | Upserts the 23 Nov 2026 arrivals into `products` (needs `SUPABASE_SERVICE_ROLE_KEY`; prunes rows whose photo is gone) |
| `npm run products:push:dry` | Prints the exact payload it would send — writes nothing |
| `npm run check` | All of the offline checks above (run `check:supabase` separately — it needs the network) |

## Admin order desk

Open `/admin` (or `#/admin`) and enter the PIN from `VITE_ADMIN_PIN`. The unlock is kept in `sessionStorage` for the tab, so it is asked again after the browser is closed. Orders arrive from the checkout as **Pending**; the desk can move them to **Out for Delivery** and **Delivered**.

## Managing products in Supabase

The storefront reads its shoes from the `products` table in Supabase, so pricing is a dashboard job — no code edits, no redeploy. The built-in list in `src/data/products.js` is only a fallback for an empty `.env` or an unreachable project.

### One-time setup

1. Create a project at <https://supabase.com> (any region close to Tanzania, e.g. *eu-central-1*).
2. Open **SQL → New query**, paste **all of `supabase_products_setup.sql`** (repo root) and run it. That one file creates `products` with human-readable columns, turns on RLS, publishes the table to Realtime and seeds the 21 shoes the shop opens with. Re-running it is safe: existing rows are skipped, so prices you edited later are never overwritten.
3. Still in **SQL → New query**, paste and run `supabase/schema.sql` so website orders have a table (and `supabase/instagram-sync.sql` if you want the Instagram importer). *Older projects created from `supabase/products.sql` + `supabase/seed-products.sql` work too — the setup file upgrades them in place.*
4. Copy the values from **Project settings → API** into `.env`:

   ```env
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
   # or, for an older project: VITE_SUPABASE_ANON_KEY=<anon public JWT>
   ```

   Use the **publishable** (or legacy **anon public**) key only. Never put the `service_role` key or an `sb_secret_…` key in a `VITE_` variable — Vite inlines it into the public bundle.
5. Run `npm run check:supabase` — it reports any missing table, column or Storage bucket against the live project. Then restart `npm run dev`. Open `/admin`: the badge should read *Shop catalogue: 21 shoes from Supabase* (51 once `supabase/new-arrivals.sql` has been run — see [Adding shoes in bulk](#adding-shoes-in-bulk)). If it says *built-in demo shoes*, the keys are missing or the SQL was not run.

### Change a price (the everyday job)

1. Supabase dashboard → **Table editor → products**.
2. Click the `price` cell of a shoe, type the new amount in whole shillings (e.g. `145000`, no commas, no `TZS`) and press Enter.
3. Look at the storefront: the card, product modal, bag and WhatsApp order message all pick the new price up within about a second (Realtime). A page refresh is only needed if the tab was in the background for a while.

The same flow works for `name`, `size_range`, `available_colors`, `image_url`, `in_stock` and `category`. Product edits do **not** need a Netlify redeploy — only changes to `VITE_*` environment variables do, because Vite bakes those into the build.

### Adding shoes in bulk (a new WhatsApp drop)

The 30 shoes that arrived on 23 November 2026 went in this way — copy it for the next batch.

1. Put the phone photos in `media/shoes/` (WhatsApp names are fine) and copy them into `public/shoes/` as kebab-case `.jpg` files named after the product id: `keyhole-mule-gold.jpg` for `keyhole-mule-gold`. Two shots of one style become `…-alt.jpg`; the shop shows one photo per shoe, so point `image_url` at the first and keep the second for a future gallery.
2. Append the products to `src/data/products.js` (`image: '/shoes/keyhole-mule-gold.jpg'`, `size_range: '36 - 45'`, `sort_order` above the current maximum). This is what the site serves when Supabase is unreachable.
3. Mirror the same rows into `supabase/new-arrivals.sql` (`insert … on conflict (id) do nothing`) so a fresh project can be seeded straight from the repo.
4. Get them into the live table — either paste `supabase/new-arrivals.sql` into **SQL → New query** in the dashboard, or run:

   ```bash
   npm run products:push:dry    # prints the payload and any missing photo, writes nothing
   npm run products:push        # upsert the rows, then verify the live table
   ```

   `products:push` reads the ids and `sort_order` from the SQL file and the rest from `products.js`, so the migration, the offline catalogue and the live table stay in sync. It needs `SUPABASE_SERVICE_ROLE_KEY` in `.env` (server-side only — never under a `VITE_` name); the publishable key cannot write, because RLS only lets signed-in admins insert.
5. `npm run check:catalogue` (it pins the built-in product count) then `npm run build`.
6. **When you delete a photo**, delete it from `public/shoes/`, from `src/data/products.js` and from `supabase/new-arrivals.sql`, then run `npm run products:push -- --prune`: it upserts first, lists the live rows whose `image_url` has no file in `public/shoes/`, and deletes exactly those (`--prune` is the only mode that deletes — without it the rows are only reported).

### What each column does

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | text | URL-safe slug and primary key, e.g. `new-balance-530`. Keep it stable — saved bags and Instagram links point at it. Leave it empty when inserting a row and the database makes `shoe-a1b2c3d4`. |
| `name` | text | Title on the card and product modal (brand + model, e.g. `New Balance 530 — Silver Storm`). |
| `size_range` | text | Sizes on sale: `39 - 45`, `27 - 36` for kids, or an explicit list such as `38, 39, 41`. A single number means one size only. This is what the size picker shows. |
| `available_colors` | text | Colours offered, comma separated: `Black, White, Navy`. Each one becomes a selectable chip on the card and in the modal, and the chosen colour is written into the WhatsApp order. |
| `price` | integer | Selling price in **TZS**, whole shillings. |
| `image_url` | text | `/shoes/new-balance.jpg` (a file in `public/shoes/`) or a full `https://…` URL, e.g. a Supabase Storage public link. |
| `category` | text | `sneakers`, `heels` or `slides` — drives the Shop tabs and the footer category links. Other words still show under **All**. |
| `in_stock` | boolean | `false` shows the pair as **Sold out** and blocks Add to bag. |
| `compare_at` | integer | Optional "was" price in TZS; fills the *Save TZS …* badge. Leave empty when there is no discount. |
| `is_new` | boolean | Shows the shoe under **New Drops**. |
| `is_active` | boolean | `false` hides the shoe from the shop without deleting the row. |
| `colorway`, `badge`, `blurb`, `description`, `details` | text / text[] | Copy shown on the card and product modal. Leave `colorway` empty — the storefront builds it from `available_colors`. `description` and `details` fall back to the original copy for seeded shoes. |
| `sizes`, `sold_out` | integer[] | Advanced/legacy: exact size list and temporarily unavailable sizes. `size_range` wins when it is filled in. Use `sold_out` to strike through just a few sizes, e.g. `{44,45}`. |
| `rating` | numeric | Star rating shown on the card (4.6–4.9 looks natural). |
| `sort_order` | integer | Grid order, lowest first; seeded shoes step by 10, so `15` slots a new pair between two others. |
| `updated_at` | timestamptz | Set automatically on every edit — handy for spotting when a price last changed. |

### Add a new shoe

**Table editor → products → Insert row**: give it a new `id` (or leave it blank), fill `name`, `size_range`, `available_colors`, `price`, `image_url` and `category`, leave `in_stock` on, then save. To use a photo that is not in the repo, upload it in **Storage**, make the bucket public and paste the public URL into `image_url`.

### Safety notes

- Shoppers can only **read** this table: the row-level-security policy grants `select` to the anon role and nothing else. Editing happens in the dashboard, which uses the service role.
- An intentionally empty table shows an empty shop (that is how you would pause the catalogue); a failed request falls back to the built-in list and logs a warning in the browser console.
- `VITE_SUPABASE_URL` plus `VITE_SUPABASE_PUBLISHABLE_KEY` (or the legacy `VITE_SUPABASE_ANON_KEY`) also switch the order desk from `localStorage` to the cloud — see `supabase/schema.sql`.

## Instagram → catalogue

New drops can add themselves. A Netlify function reads the shop's recent Instagram posts through the Instagram Graph API, works out the product name and TZS price from the caption, crops the photo to the same 4:5 ratio the product cards use, saves it in Supabase Storage and appends a row to `products`. The shoe then appears in the shop grid on the next page load — no redeploy, no manual data entry.

```
Instagram post ──► Graph API ──► caption parser ──► 4:5 crop (jimp) ──► Storage ──► products row
                                                                          │
                                                        instagram_sync_runs (audit log)
```

| Piece | Where |
| --- | --- |
| `POST/GET /api/instagram-sync` | `netlify/functions/instagram-sync.mjs` — secret-protected, for manual runs |
| Daily import at 04:00 UTC (07:00 Dar) | `netlify/functions/instagram-sync-scheduled.mjs` + `netlify.toml` |
| Caption → name / price / category / sizes | `netlify/lib/instagram/caption.mjs` |
| Pipeline (fetch, crop, upload, insert) | `netlify/lib/instagram/sync.mjs` |
| Run from this machine | `npm run instagram:sync` / `npm run instagram:sync:dry` |

### One-time setup

1. **Use a professional account.** The Graph API only exposes media for an Instagram **Business or Creator** account (switch it in the Instagram app: *Settings → Account type and tools*).

2. **Run the SQL.** In Supabase → **SQL → New query**, run `supabase/instagram-sync.sql`. It adds the import columns to `products`, creates the public `product-images` bucket with a public-read policy, and creates the `instagram_sync_runs` log (service role only).

3. **Get an access token.** Two supported routes:

   - *Instagram API with Instagram Login* (shortest path): create an app at <https://developers.facebook.com/apps>, add the **Instagram** product, open **API setup with Instagram login**, connect the @fariifeet account and generate a token. Exchange it for a 60-day token:
     ```bash
     curl "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=<app-secret>&access_token=<short-lived-token>"
     ```
     Then use `INSTAGRAM_USER_ID=me` and leave `INSTAGRAM_GRAPH_BASE` empty.

   - *Instagram Graph API via a Facebook Page*: link the Instagram account to a Facebook Page, give the app `instagram_basic`, `pages_show_list` and `pages_read_engagement`, and use the Page's long-lived user token. Set `INSTAGRAM_GRAPH_BASE=https://graph.facebook.com/v21.0` and `INSTAGRAM_USER_ID=<Instagram Business account id>`.

4. **Set the server-side variables** — in `.env` for local runs and in Netlify → **Site configuration → Environment variables** (scope **Functions**) for the deployed functions:

   | Variable | Value |
   | --- | --- |
   | `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project settings → API → **service_role** key |
   | `INSTAGRAM_ACCESS_TOKEN` | the long-lived token from step 3 |
   | `INSTAGRAM_USER_ID` | `me`, or the Instagram Business account id |
   | `INSTAGRAM_GRAPH_BASE` | leave empty for `graph.instagram.com`, or `https://graph.facebook.com/v21.0` |
   | `INSTAGRAM_SYNC_SECRET` | any long random string (`openssl rand -hex 24`); without it the HTTP endpoint stays closed |
   | `INSTAGRAM_SYNC_LIMIT` | optional, posts per run (default `6`, max `10`) |
   | `INSTAGRAM_AUTO_PUBLISH` | optional, `false` imports hidden drafts (`is_active = false`) for review |

   None of these may start with `VITE_`. Vite inlines `VITE_*` into the public bundle, and the service role key can edit the whole database.

5. **Deploy.** `npm run deploy:env -- --apply --deploy` also pushes these values (as secrets, scope *Functions*), then rebuilds. The new functions appear under **Functions** with a *Scheduled* badge on `instagram-sync-scheduled`.

6. **Try it without writing anything**:

   ```bash
   npm run instagram:sync:dry   # reads Instagram, prints what it would import
   npm run instagram:sync       # real import
   ```

   Deployed alternative (no CLI needed):

   ```bash
   curl -X POST "https://<site>/api/instagram-sync?limit=3" -H "x-sync-secret: $INSTAGRAM_SYNC_SECRET"
   curl "https://<site>/api/instagram-sync?dryRun=1" -H "x-sync-secret: $INSTAGRAM_SYNC_SECRET"
   ```

   Or press **Run now** on the scheduled function in the Netlify UI.

   The `/api/instagram-sync` route only exists where Netlify runs the functions — the deployed site, or `netlify dev` locally. Plain `npm run dev` serves the storefront only, which is why `npm run instagram:sync` reads the same `.env` directly.

### How to write the caption

Only the price is compulsory — everything else has a sensible fallback:

```
Name: Air Force 1 '07
TZS 145,000
Colour: White / Grey
Sizes: 38, 39, 40
- Leather upper
- Gum sole
#sneakers #fariifeet
```

| Field | What the parser accepts |
| --- | --- |
| **Price** | `TZS 145,000`, `Tsh 145000`, `Shs. 120,000`, `145,000/=`, `/=145,000`, `Bei: 98,000`, `@ 55,000`, `145K`, or a bare `45,000`. Phone numbers and `size 40` are never mistaken for prices. |
| **Name** | The `Name:` (or `Jina:`) line; otherwise the first line that contains real words. Prices, hashtags, `@handles` and filler like *"just landed"* are stripped. |
| **Category** | From hashtags, brands and silhouette words: *slide/slipper/sandal* → `slides`, *heel/kitten/pump/flat/mary jane* → `heels`, otherwise `sneakers`. |
| **Sizes** | `Sizes: 38, 39, 40` or `size 38-42`; kids posts default to 27–36, everything else to 36–45. |
| **Colourway** | `Colour:`/`Color:`/`Rangi:` or the first colour words found. |
| **Details** | Any bullet lines (`-`, `•`, `✔`, `1.`) become the check-list on the product page. |
| **Description** | The remaining sentences of the caption (labels and prices removed). |

A post is **skipped** — never guessed — when it has no believable TZS amount, no readable name, or no photo. Videos use their thumbnail; carousels use their first photo.

### What gets written

Each imported post becomes one `products` row, so it is instantly a normal product — searchable, filterable, orderable from the bag:

| Column | Imported value |
| --- | --- |
| `id` | slug of the name (`air-force-1-07`); a short media-id suffix is appended if that id already exists |
| `price` | the amount parsed from the caption (whole TZS) |
| `image_url` | `…/storage/v1/object/public/product-images/instagram/<id>.jpg` |
| `category`, `sizes`, `colorway`, `blurb`, `description`, `details` | parsed from the caption |
| `is_new`, `is_active` | `true` (so it lands in **New Drops**); `is_active` follows `INSTAGRAM_AUTO_PUBLISH` |
| `badge` | `Instagram`, so imported pairs are recognisable on the card |
| `sort_order` | `5` — above every hand-entered shoe (they start at `10`); edit it to reorder |
| `source`, `instagram_media_id`, `instagram_permalink`, `instagram_posted_at` | traceability — *follow the receipt* back to the exact post |

### Safety

- **Duplicates are impossible.** A unique index on `instagram_media_id` plus an `ignore-duplicates` insert means the same post can never be added twice, and a re-run can never overwrite a price or photo you edited in the dashboard.
- **Secrets stay server-side.** The service role key only exists in the function environment — never in a `VITE_` variable, never in the bundle. Shoppers still read the `products` table with the read-only anon key, and the `product-images` bucket allows public reads but only service-role writes.
- **Instagram photos expire.** Graph API image URLs are signed short-lived links, which is why every photo is copied into Storage at import time (1080 × 1350 JPEG, ~200 kB) instead of hot-linked.
- **Everything is logged.** `select * from instagram_sync_runs order by started_at desc limit 5;` shows the counts, the status and the per-post reason for anything skipped or failed. The table has no RLS policies, so only the service role (the function) can read it.
- **Tokens expire after ~60 days.** An expired token fails the run with *"the access token has expired; generate a fresh long-lived token"* in the log; refresh it with `ig_refresh_token` (or regenerate in the app dashboard) and update the variable.
- **Nothing is guessed.** A post without a price or a readable name is skipped and reported, so the catalogue never shows a TZS 0 shoe.

## Deploying to Netlify

1. Connect the GitHub repository to Netlify. `netlify.toml` already sets the build command (`npm run build`), the publish directory (`dist`), Node 20, the Instagram function directory/schedule and the SPA rewrite that lets `/admin` load when opened or refreshed directly. It also answers missing `/assets/*`, `/images/*` and `/shoes/*` files with a real `404` (the branded `public/404.html`) instead of the SPA shell, caches hashed bundles as immutable and makes `index.html` revalidate on every visit.
2. Add these under **Site configuration → Environment variables** (scope *All* so both production and deploy previews get them):

   | Variable | Value |
   | --- | --- |
   | `VITE_WHATSAPP_NUMBER` | `255754623904` |
   | `VITE_ADMIN_PIN` | the order-desk PIN — `2007` is the shop default baked into the app; set it here only to rotate the PIN without a code change |
   | `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | the project's **Publishable key** (`sb_publishable_…`) from Supabase → Project settings → API keys — or the legacy **anon public** JWT as `VITE_SUPABASE_ANON_KEY` |
   | `VITE_FEEDFUSION_URL`, `VITE_FEEDFUSION_KEY` | optional Instagram feed |

   For the Instagram importer, add the server-side values from [Instagram → catalogue](#instagram--catalogue) with scope **Functions** instead: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`, `INSTAGRAM_SYNC_SECRET` (plus the optional ones).

3. Run `supabase_products_setup.sql` (catalogue: table, 21 seed rows, RLS, Realtime), then `supabase/new-arrivals.sql` (the 30 shoes of 23 Nov 2026), `supabase/schema.sql` (orders) and — if you want the Instagram importer — `supabase/instagram-sync.sql` in the Supabase SQL editor before switching on the cloud store, then `npm run check:supabase` to confirm each table, column and the `product-images` bucket exists.
4. **Trigger a fresh deploy** — Vite inlines `VITE_*` values at build time, so existing builds keep the old settings until they are rebuilt.
5. Open `/admin` and check the status banner: *Supabase connected — orders are stored in the cloud* means the keys reached the build; *Local test mode* means they did not.
6. Replace the placeholder in the **Live demo** section above with the Netlify URL.

### If the deploy renders unstyled (giant SVGs, no layout)

The page HTML loaded but `/assets/*.css` did not apply. Check, in this order:

1. **DevTools → Network** → reload with *Disable cache*. The stylesheet must return `200` with `Content-Type: text/css`. A `200` with `Content-Type: text/html` means the request fell through to the SPA rewrite — that happens when the hash in the loaded `index.html` is not in the current deploy (stale cached HTML). `netlify.toml` now sends those requests to `404.html` instead, and sets `index.html` to `max-age=0, must-revalidate`.
2. Confirm the build really published CSS: `npm run build` then `Get-ChildItem dist\assets\*.css`. A healthy build always prints `dist/assets/index-<hash>.css` (~49 kB).
3. Confirm the deploy is the newest one (Netlify → **Deploys**): a failed build — for example a blocked secrets scan — leaves the previous deploy live.
4. A `401` on the site URL means Netlify password protection is on; log in first, otherwise every asset request is rejected as well.

### Push the local `.env` to Netlify (fastest path)

`netlify-env.mjs` copies the values from your `.env` to the Netlify site, so the live PIN and keys always match your machine. `VITE_*` values are pushed as non-secret (Vite can only inline non-secret values at build time); `SUPABASE_*` and `INSTAGRAM_*` values are pushed as **secrets** with the **Functions** scope, which is what the importer needs. It prints values masked and refuses to run without a PIN. After writing it re-reads the site, and if any variable did not stick it stops **without** triggering a deploy — so a build never runs on a half-applied `.env`.

```powershell
$env:NETLIFY_AUTH_TOKEN = Read-Host -AsSecureString | ConvertFrom-SecureString -AsPlainText
npm run deploy:env                      # dry run: shows the site + the masked variables
npm run deploy:env -- --apply --deploy  # write them, then rebuild the live site
```

The token is only read from `NETLIFY_AUTH_TOKEN` and never written to disk — delete it in Netlify → **User settings → Applications** once you are done.

### Setting the variables with the Netlify CLI

```bash
npm i -g netlify-cli
netlify login
netlify link                                     # pick the Fariifeet site
netlify env:set VITE_WHATSAPP_NUMBER 255754623904
netlify env:set VITE_ADMIN_PIN <your-order-desk-pin>
netlify env:set VITE_SUPABASE_URL https://<project-ref>.supabase.co
netlify env:set VITE_SUPABASE_PUBLISHABLE_KEY sb_publishable_…
netlify env:list
netlify deploy --prod                            # or "Trigger deploy" in the dashboard
```

## Notes

- Without Supabase keys, orders are saved in the browser's `localStorage`. The storefront and the `/admin` desk must then be opened in the same browser profile (for example, two tabs) to see the same orders.
- Product photos in `public/shoes/` and `public/images/` are the shop's own images — keep them when restyling.
- Prices are display-only Tanzania shillings (TZS); payment is confirmed with the shop on WhatsApp.
