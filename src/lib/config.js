/**
 * Runtime configuration for the on-site ordering flow.
 *
 * Vite only exposes variables prefixed with `VITE_`, and only to client code.
 * Everything here degrades gracefully: with no Supabase keys the store keeps
 * taking orders and parks them in `localStorage`, so the checkout can be
 * demoed before the database exists.
 */

const cleanUrl = (value) => String(value || '').trim().replace(/\/+$/, '')

export const SUPABASE_URL = cleanUrl(import.meta.env.VITE_SUPABASE_URL)
export const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

/** True only when both the project URL and the anon key are present. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/** Table that holds website orders (see supabase/schema.sql). */
export const ORDERS_TABLE = 'orders'

/** PIN for the hidden /admin order desk. Change it in `.env.local`. */
export const ADMIN_PIN = String(import.meta.env.VITE_ADMIN_PIN || '1234').trim() || '1234'

/** Storage keys shared by the bag, the order desk and the admin session. */
export const ORDERS_STORAGE_KEY = 'fariifeet-orders-v1'
export const ADMIN_SESSION_KEY = 'fariifeet-admin-unlocked'
