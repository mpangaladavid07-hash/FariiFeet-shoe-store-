/**
 * Runtime configuration for the storefront, the catalogue and the order desk.
 *
 * Vite only exposes variables prefixed with `VITE_`, and only to client code.
 * Everything here degrades gracefully: with no Supabase keys the store keeps
 * taking orders and parks them in `localStorage`, and the shop grid renders the
 * built-in catalogue from `src/data/products.js`.
 *
 * Key names
 * ---------
 * Supabase's browser key used to be called `anon`; the current name is
 * `publishable` (same read-only role underneath). Both are read, in this order:
 *
 *   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…   (current)
 *   VITE_SUPABASE_ANON_KEY=eyJhbGciOi…               (legacy JWT, still valid)
 *
 * Whichever is present ends up in `SUPABASE_KEY`, so the rest of the app never
 * has to know which one a deployment uses.
 *
 * These keys are public by design — Vite inlines them into the JavaScript
 * bundle and every visitor can read them. Row Level Security in Postgres is
 * what protects the data (see `supabase/products.sql` and `supabase/schema.sql`).
 * A `sb_secret_…` key or a legacy `service_role` JWT must never be used here:
 * it bypasses RLS, so it would let anyone change prices or read customer phone
 * numbers. `isServerKey()` below refuses one even if it is pasted in by mistake.
 */

const cleanUrl = (value) => String(value || '').trim().replace(/\/+$/, '')
const cleanKey = (value) => String(value || '').trim()

/** `role` claim of a legacy Supabase JWT; '' when the value is not a JWT. */
function jwtRole(key) {
  const parts = String(key || '').split('.')
  if (parts.length !== 3) return ''
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded))
    return String(payload?.role || '')
  } catch {
    return ''
  }
}

/** True for keys that may write past RLS: `sb_secret_…` or a service_role JWT. */
export const isServerKey = (key) => {
  const value = cleanKey(key)
  return /^sb_secret_/i.test(value) || jwtRole(value) === 'service_role'
}

const configuredKey =
  cleanKey(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  cleanKey(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const SUPABASE_URL = cleanUrl(import.meta.env.VITE_SUPABASE_URL)

/** Browser-safe Supabase key (publishable key, or the legacy anon key). */
export const SUPABASE_KEY = isServerKey(configuredKey) ? '' : configuredKey

/** Legacy alias — `SUPABASE_KEY` is the name new code should import. */
export const SUPABASE_ANON_KEY = SUPABASE_KEY

/** True only when the project URL and a browser-safe key are both present. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY)

/** `bcgstfeotcuytnoxctoc` — which project this build points at. */
export const SUPABASE_PROJECT_REF = (() => {
  const match = /^https?:\/\/([^.]+)\.supabase\.co/i.exec(SUPABASE_URL)
  return match ? match[1] : ''
})()

if (configuredKey && !SUPABASE_KEY) {
  console.error(
    '[fariifeet] A secret Supabase key (sb_secret_… / service_role) was set in a ' +
      'VITE_ variable. It has been ignored because Vite would publish it in the ' +
      'browser bundle. Use the publishable or anon key for the storefront.',
  )
}

/** Table that holds website orders (see supabase/schema.sql). */
export const ORDERS_TABLE = 'orders'

/** Table that holds the live catalogue (see supabase/products.sql). */
export const PRODUCTS_TABLE = 'products'

/**
 * PIN for the hidden /admin order desk. Set `VITE_ADMIN_PIN` in `.env` locally
 * and in the Netlify environment for the deployed site; the `1234` fallback
 * below only exists so the desk still opens on a fresh clone with no `.env`.
 */
const configuredPin = String(import.meta.env.VITE_ADMIN_PIN || '').trim()

if (!configuredPin && import.meta.env.DEV) {
  console.warn('[fariifeet] VITE_ADMIN_PIN is not set — the order desk falls back to 1234.')
}

export const ADMIN_PIN = configuredPin || '1234'

/** Storage keys shared by the bag, the order desk and the admin session. */
export const ORDERS_STORAGE_KEY = 'fariifeet-orders-v1'
export const ADMIN_SESSION_KEY = 'fariifeet-admin-unlocked'
