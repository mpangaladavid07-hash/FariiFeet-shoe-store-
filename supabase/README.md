# FariiFeet — Supabase setup

The storefront takes orders on-site (shopping bag → checkout → receipt), reads
its catalogue from `products`, and the owner tracks orders at the hidden
`/admin` desk. Nothing here is required to browse or test the site: without
Supabase keys every order is stored in the browser's `localStorage`, the desk
reads that same list, and the built-in catalogue in `src/data/products.js` is
shown.

The shop's live project ref is the subdomain of its project URL
(`https://<project-ref>.supabase.co`), kept in the Netlify environment variables rather than in the repo. Run these files in the SQL
editor, in this order, on a fresh project:

| File | What it creates |
| --- | --- |
| [`../supabase_products_setup.sql`](../supabase_products_setup.sql) | `products` with human-readable columns (`size_range`, `available_colors`, `in_stock`), RLS, Realtime and the 21 seeded shoes — the one file to paste day to day |
| [`schema.sql`](./schema.sql) | `orders` + RLS so the bag can save an order |
| [`instagram-sync.sql`](./instagram-sync.sql) | import columns, the public `product-images` bucket and its read policy, the `instagram_sync_runs` log |

[`products.sql`](./products.sql) + [`seed-products.sql`](./seed-products.sql) are
the original two-step version; they still work, and the setup file upgrades
their table in place (it only adds the new columns).
| [`instagram-sync.sql`](./instagram-sync.sql) | import columns, the public `product-images` bucket and its read policy, the `instagram_sync_runs` log |

Every file is idempotent, so re-running them after an edit is safe.

## 1. Create the tables

1. Open the Supabase project → **SQL** → **New query**.
2. Paste and run each file from the table above, in order.
3. Open **Project Settings → API keys** and copy the project URL, the
   **Publishable key** (`sb_publishable_…`) and — for the Instagram importer —
   the **service_role / secret** key.

[`schema.proposed.sql`](./schema.proposed.sql) is a tightened v2 of the orders
table (updated_at trigger, total/items/id checks, anon insert limited to
`pending`, indexes on phone/status). It is **not** applied automatically — read
it, then either run it after `schema.sql` or promote it into `schema.sql`.

## 2. Point the site at it

Copy `.env.example` to `.env` (git-ignored) and fill in:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
# legacy projects: VITE_SUPABASE_ANON_KEY=<anon public JWT>
VITE_ADMIN_PIN=2007
```

Then run `npm run check:supabase` — it calls the live project and lists any
missing table, column or Storage bucket. Restart `npm run dev` (Vite reads env
vars at start-up). The order desk badge switches from "Local test mode" to
"Supabase connected" once orders are coming from the cloud.

## 3. Use the order desk

- Open `http://localhost:5173/admin` (or `/admin` on the deployed domain).
  If your host does not rewrite unknown paths to `index.html`, use
  `https://your-domain.com/#/admin` instead — both are recognised.
- Enter the PIN from `VITE_ADMIN_PIN` (default `2007`).
- Each card shows the order ID, customer name, phone (tap to call), delivery
  area, payment method, sizes and total.
- Move an order through **Pending → Out for delivery → Delivered & Paid**.

## Security notes

- The PIN is checked in the browser, so `/admin` is *hidden*, not hardened.
  Change `VITE_ADMIN_PIN` before launch and treat the URL as staff-only.
- The stock policies in `schema.sql` allow the anon key to read orders so the
  desk can work without a login. Anyone with the anon key could therefore read
  customer phone numbers. For production, switch reads/updates to Supabase Auth
  (a staff user) or proxy them through an Edge Function.
- Every order is also mirrored into `localStorage`, so a sale is never lost when
  the database is unreachable — and the desk still lists it from this browser.
- The **publishable** key (`sb_publishable_…`) and the legacy **anon** key are
  both read-only; they ship in the browser bundle. Never place an `sb_secret_…`
  key or the `service_role` JWT in a `VITE_` variable — `src/lib/config.js` and
  `netlify-env.mjs` refuse one if it is pasted there by mistake.
- Shoppers can only **read** `products`: the policy in
  `supabase_products_setup.sql` grants `select` to the anon role and nothing
  else, so prices are edited in the dashboard (service role) or by the
  Instagram importer (service role).
- The `product-images` bucket is public for **reads only**; uploads happen with
  the service role from the Netlify function, so there is deliberately no
  insert/update/delete policy on `storage.objects` for that bucket.
- `instagram_sync_runs` keeps RLS on with no policies, and `anon`/`authenticated`
  have no grants — only the service role can read the sync log.
