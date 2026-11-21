/**
 * One shared `@supabase/supabase-js` client for the storefront.
 *
 * The SDK is imported *lazily* (`await import(...)`) on purpose:
 *
 *   - the shop's shell (hero, grid, WhatsApp buttons) paints first, so a phone
 *     on a slow Tanzanian connection is not waiting for auth/storage/realtime
 *     code it may never need;
 *   - Vite emits the SDK as its own chunk instead of growing the main bundle
 *     past the 500 kB warning;
 *   - `node jsx-check.mjs` / `render-check.mjs` import the app on the server,
 *     where there is nothing to talk to — no keys, no socket, no crash;
 *   - a build with an empty `.env` still loads: `loadSupabaseClient()` resolves
 *     to null and the catalogue falls back to the built-in list.
 *
 * Only the *publishable* (or legacy anon) key ever reaches this file —
 * `src/lib/config.js` refuses a service_role key. RLS is what makes that safe.
 */
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from './config'

let client = null
let loader = null

function buildClient(createClient) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      /* The shop has no customer logins: never write a session to storage. */
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      /* Shows up in Supabase -> Logs, handy when debugging from the phone. */
      headers: { 'x-application-name': 'fariifeet-storefront' },
    },
    realtime: { params: { eventsPerSecond: 5 } },
  })
}

/**
 * Resolves to the shared client, or `null` when this build has no Supabase
 * credentials. Safe to call during server rendering; the SDK chunk is only
 * requested once and shared by every caller.
 */
export async function loadSupabaseClient() {
  if (!isSupabaseConfigured) return null
  if (client) return client
  if (!loader) {
    loader = import('@supabase/supabase-js')
      .then(({ createClient }) => {
        client = buildClient(createClient)
        return client
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.warn('[fariifeet] could not load @supabase/supabase-js:', error)
        }
        loader = null
        return null
      })
  }
  return loader
}

/** The client if it is already in memory — never triggers the import. */
export const peekSupabaseClient = () => client

/** Drops the cached client (used by the dev checks between stubbed envs). */
export function resetSupabaseClient() {
  client = null
  loader = null
}
