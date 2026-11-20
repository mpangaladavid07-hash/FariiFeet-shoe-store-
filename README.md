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
  data/products.js                 catalogue: names, prices, sizes, categories
  lib/store.js                     WhatsApp number, shop address, delivery & payment
  lib/orders.js                    order records, totals, receipts, admin statuses
  lib/i18n.jsx                     English ⇄ Kiswahili dictionary + provider
supabase/schema.sql                orders table + RLS, for cloud storage
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
| `npm run check` | All of the checks above |

## Admin order desk

Open `/admin` (or `#/admin`) and enter the PIN from `VITE_ADMIN_PIN`. The unlock is kept in `sessionStorage` for the tab, so it is asked again after the browser is closed. Orders arrive from the checkout as **Pending**; the desk can move them to **Out for Delivery** and **Delivered**.

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

3. Run `supabase/schema.sql` in the Supabase SQL editor before switching on the cloud order store.
4. **Trigger a fresh deploy** — Vite inlines `VITE_*` values at build time, so existing builds keep the old settings until they are rebuilt.
5. Open `/admin` and check the status banner: *Supabase connected — orders are stored in the cloud* means the keys reached the build; *Local test mode* means they did not.
6. Replace the placeholder in the **Live demo** section above with the Netlify URL.

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
