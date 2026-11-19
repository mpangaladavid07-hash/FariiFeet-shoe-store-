# FariiFeet website orders

The storefront takes orders on-site (shopping bag → checkout → receipt) and the
owner tracks them at the hidden `/admin` order desk. Nothing here is required
to browse or test the site: without Supabase keys every order is stored in the
browser's `localStorage` and the desk reads that same list.

## 1. Create the table

1. Open your Supabase project → **SQL** → **New query**.
2. Paste [`schema.sql`](./schema.sql) and run it.
3. Copy **Project URL** and the **anon public** key from
   **Project Settings → API**.

## 2. Point the site at it

Copy `.env.example` to `.env.local` (git-ignored) and fill in:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
VITE_ADMIN_PIN=1234
```

Restart `npm run dev` (Vite reads env vars at start-up). The order desk badge
switches from "Local test mode" to "Supabase connected" once orders are coming
from the cloud.

## 3. Use the order desk

- Open `http://localhost:5173/admin` (or `/admin` on the deployed domain).
  If your host does not rewrite unknown paths to `index.html`, use
  `https://your-domain.com/#/admin` instead — both are recognised.
- Enter the PIN from `VITE_ADMIN_PIN` (default `1234`).
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
