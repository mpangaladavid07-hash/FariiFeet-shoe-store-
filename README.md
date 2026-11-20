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

## Tech stack

- **Frontend:** React 18, Vite 5, Tailwind CSS 3
- **Data:** Supabase (Postgres + RLS) when configured, with a browser `localStorage` fallback
- **Integrations:** WhatsApp `wa.me` deep links, optional FeedFusion Instagram feed
- **Hosting:** Netlify (static build)

## Project structure

```
public/
  images/fariifeet-logo.png        brand mark used in the hero, header, footer & favicon
  images/fariifeet-hero-shoes.jpg  cropped studio shot of the shop's heels (hero)
  shoes/                           the boutique's real product photography
src/
  App.jsx                          storefront composition, global search & bag state
  components/                      Hero, Navbar, ProductGrid, CartDrawer, AdminPage, …
  data/products.js                 built-in catalogue + offline fallback
  lib/store.js                     WhatsApp number, shop address, delivery & payment
  lib/catalogue.js                 reads the live catalogue from Supabase
  lib/orders.js                    order records, totals, receipts, admin statuses
  lib/i18n.jsx                     English ⇄ Kiswahili dictionary + provider
supabase/schema.sql                orders table + RLS, for cloud storage
supabase/products.sql              products table + RLS, editable in the dashboard
supabase/seed-products.sql         one-time copy of the current 21 shoes
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

Copy `.env.example` to `.env` (or `.env.local`) and fill in your own values. `.env` is git-ignored — never commit it.

```env
# WhatsApp line that receives website orders (digits only, international format)
VITE_WHATSAPP_NUMBER=255754623904

# PIN for the hidden order desk at /admin
VITE_ADMIN_PIN=your_admin_pin

# Supabase (optional — leave empty to keep orders in this browser)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# FeedFusion "Seen on Instagram" feed (optional)
VITE_FEEDFUSION_URL=your_feed_url
VITE_FEEDFUSION_KEY=your_feed_key
```

Only variables prefixed with `VITE_` are exposed to the browser. The shop WhatsApp number also has a built-in fallback (`255754623904`) in `src/lib/store.js`, so the site works even with an empty `.env`.

### 4. Start the development server

```bash
npm run dev
```

- Storefront: <http://localhost:5173>
- Order desk: <http://localhost:5173/admin> (PIN from `VITE_ADMIN_PIN`; if the variable is missing the desk falls back to `1234`, so set it before going live)

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
| `npm run check` | All of the checks above |

## Admin order desk

Open `/admin` (or `#/admin`) and enter the PIN from `VITE_ADMIN_PIN`. The unlock is kept in `sessionStorage` for the tab, so it is asked again after the browser is closed. Orders arrive from the checkout as **Pending**; the desk can move them to **Out for Delivery** and **Delivered**.

## Managing products in Supabase

The storefront reads its shoes from the `products` table in Supabase, so pricing is a dashboard job — no code edits, no redeploy. The built-in list in `src/data/products.js` is only a fallback for an empty `.env` or an unreachable project.

### One-time setup

1. Create a project at <https://supabase.com> (any region close to Tanzania, e.g. *eu-central-1*).
2. Open **SQL → New query**, paste all of `supabase/products.sql` and run it. That creates the table, its indexes and a read-only policy for the anon key.
3. Paste and run `supabase/seed-products.sql` — a one-time copy of the 21 shoes currently in the shop, so the site looks identical on the first load. Re-running it is safe: rows that already exist are skipped, so prices you edited later are never overwritten.
4. Copy the values from **Project settings → API** into `.env`:

   ```env
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon public key>
   ```

   Use the **anon public** key only. Never put the `service_role` key in a `VITE_` variable — Vite inlines it into the public bundle.
5. Restart `npm run dev`. Open `/admin`: the badge should read *Shop catalogue: 21 shoes from Supabase*. If it says *built-in demo shoes*, the keys are missing or the SQL was not run.

### Change a price (the everyday job)

1. Supabase dashboard → **Table editor → products**.
2. Click the `price` cell of a shoe, type the new amount in whole shillings (e.g. `145000`, no commas, no `TZS`) and press Enter.
3. Refresh the storefront. The card, product page, bag and checkout all use the new price.

Product edits do **not** need a Netlify redeploy — only changes to `VITE_*` environment variables do, because Vite bakes those into the build.

### What each column does

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | text | URL-safe slug and primary key, e.g. `new-balance-530`. Keep it stable — saved bags and Instagram links point at it. |
| `name` | text | Title on the card and product page. |
| `price` | integer | Selling price in **TZS**, whole shillings. |
| `image_url` | text | `/shoes/new-balance.jpg` (a file in `public/shoes/`) or a full `https://…` URL, e.g. a Supabase Storage public link. |
| `category` | text | `sneakers`, `heels` or `slides` — drives the Shop tabs and the footer category links. |
| `sizes` | integer[] | EU sizes stocked, e.g. `{36,37,38,39,40}`. |
| `sold_out` | integer[] | Sizes that are temporarily unavailable (struck through in the size picker). |
| `compare_at` | integer | Optional "was" price in TZS; fills the *Save TZS …* badge. Leave empty when there is no discount. |
| `is_new` | boolean | Shows the shoe under **New Drops**. |
| `is_active` | boolean | `false` hides the shoe from the shop without deleting the row. |
| `colorway`, `badge`, `blurb`, `description`, `details` | text / text[] | Copy shown on the card and product page. `description` and `details` fall back to the original copy for seeded shoes. |
| `rating` | numeric | Star rating shown on the card (4.6–4.9 looks natural). |
| `sort_order` | integer | Grid order, lowest first; seeded shoes step by 10, so `15` slots a new pair between two others. |

### Add a new shoe

**Table editor → products → Insert row**: give it a new `id`, fill `name`, `price`, `image_url` and `category`, set `sizes` to something like `{37,38,39,40}`, then save. To use a photo that is not in the repo, upload it in **Storage**, make the bucket public and paste the public URL into `image_url`.

### Safety notes

- Shoppers can only **read** this table: the row-level-security policy grants `select` to the anon role and nothing else. Editing happens in the dashboard, which uses the service role.
- An intentionally empty table shows an empty shop (that is how you would pause the catalogue); a failed request falls back to the built-in list and logs a warning in the browser console.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` also switch the order desk from `localStorage` to the cloud — see `supabase/schema.sql`.

## Deploying to Netlify

1. Connect the GitHub repository to Netlify. `netlify.toml` already sets the build command (`npm run build`), the publish directory (`dist`), Node 20 and the SPA rewrite that lets `/admin` load when opened or refreshed directly.
2. Add these under **Site configuration → Environment variables** (scope *All* so both production and deploy previews get them):

   | Variable | Value |
   | --- | --- |
   | `VITE_WHATSAPP_NUMBER` | `255754623904` |
   | `VITE_ADMIN_PIN` | the private order-desk PIN (never commit it; the repo only carries the `1234` dev fallback) |
   | `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | the project's **anon public** key (Supabase → Project settings → API) |
   | `VITE_FEEDFUSION_URL`, `VITE_FEEDFUSION_KEY` | optional Instagram feed |

3. Run `supabase/schema.sql` (orders) and `supabase/products.sql` + `supabase/seed-products.sql` (catalogue) in the Supabase SQL editor before switching on the cloud store.
4. **Trigger a fresh deploy** — Vite inlines `VITE_*` values at build time, so existing builds keep the old settings until they are rebuilt.
5. Open `/admin` and check the status banner: *Supabase connected — orders are stored in the cloud* means the keys reached the build; *Local test mode* means they did not.
6. Replace the placeholder in the **Live demo** section above with the Netlify URL.

### Push the local `.env` to Netlify (fastest path)

`netlify-env.mjs` copies the `VITE_*` values from your `.env` to the Netlify site, so the live PIN and keys always match your machine. It prints values masked, refuses to run without a PIN, and marks the variables non-secret (Vite can only inline non-secret values at build time).

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
netlify env:set VITE_SUPABASE_ANON_KEY <anon-public-key>
netlify env:list
netlify deploy --prod                            # or "Trigger deploy" in the dashboard
```

## Notes

- Without Supabase keys, orders are saved in the browser's `localStorage`. The storefront and the `/admin` desk must then be opened in the same browser profile (for example, two tabs) to see the same orders.
- Product photos in `public/shoes/` and `public/images/` are the shop's own images — keep them when restyling.
- Prices are display-only Tanzania shillings (TZS); payment is confirmed with the shop on WhatsApp.
