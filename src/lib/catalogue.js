import { useEffect, useSyncExternalStore } from 'react'
import { ADULT_SIZES, products as localProducts } from '../data/products'
import { PRODUCTS_TABLE, isSupabaseConfigured } from './config'
import { loadSupabaseClient, peekSupabaseClient } from './supabaseClient'

/**
 * Product catalogue — read live from the Supabase `products` table.
 *
 * The owner edits a row in the Supabase Table Editor (name, size_range,
 * available_colors, price, image_url, in_stock…) and the storefront follows
 * without a rebuild:
 *
 *   - on page load                    → one `select *` via @supabase/supabase-js
 *   - while the page is open          → Realtime `postgres_changes` on
 *                                       `products` refreshes the list in ~1s
 *   - on focus / returning to the tab → refresh if data is older than a minute
 *
 * `src/data/products.js` stays as the offline fallback: it renders until the
 * first cloud response arrives and again whenever Supabase is unreachable, so
 * the shop is never an empty grid.
 */

const REQUEST_TIMEOUT = 12000
const FOCUS_REFRESH_MS = 60000
const FALLBACK_IMAGE = '/images/fariifeet-hero-shoes.jpg'

/* Columns added later than the first release: if a project still has an older
   table, PostgREST answers 42703 / PGRST204 and we retry without the filters. */
const MISSING_COLUMN = /42703|PGRST204|does not exist|could not find/i

/* ------------------------------------------------------------------ */
/* Row -> product mapping                                              */
/* ------------------------------------------------------------------ */

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

/** PostgREST returns int[] as a JS array, but accept `{36,37}` strings too. */
const toIntegerList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isFinite(item))
  }
  if (typeof value === 'string') {
    return value
      .replace(/[{}]/g, '')
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item))
  }
  return []
}

/**
 * `"39 - 45"`, `"39–45"`, `"EU 39 to 45"`, `"38, 39, 41"`, `"38-42, 44"` →
 * `[39, 40, 41, 42, 43, 44, 45]`. Anything unparseable returns `[]` and the
 * caller keeps the legacy `sizes` column (or the built-in range).
 */
export function parseSizeRange(value) {
  const text = String(value ?? '').trim()
  if (!text) return []

  const sizes = new Set()
  const parts = text.split(/[,;]+/).map((part) => part.trim()).filter(Boolean)

  parts.forEach((part) => {
    const range = /(\d{2})\s*(?:-|–|—|to)\s*(\d{2})/i.exec(part)
    if (range) {
      const from = Number(range[1])
      const to = Number(range[2])
      if (to >= from && to - from <= 30) {
        for (let size = from; size <= to; size += 1) sizes.add(size)
        return
      }
    }
    const single = /(\d{2})/.exec(part)
    if (single) sizes.add(Number(single[1]))
  })

  return [...sizes].sort((a, b) => a - b)
}

/**
 * `"Black, White, Navy"` → `['Black', 'White', 'Navy']`. Accepts arrays,
 * slashes and the old `colorway` style (`"Silver / White / Black"`).
 * De-duplicates case-insensitively so `"Black / black"` shows one chip.
 */
export function parseColorList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))]
  }

  const text = String(value ?? '').trim()
  if (!text) return []

  const seen = new Set()
  return text
    .split(/\s*[,;/|]\s*|\s+·\s+|\s+&\s+/)
    .map((part) => part.replace(/^colou?rs?\s*:/i, '').trim())
    .filter((part) => part && !/^(n\/?a|none|-)$/i.test(part))
    .filter((part) => {
      const key = part.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

/** `[38, 39, 40]` → `"38 - 40"`; used when the table has no `size_range`. */
export function formatSizeRange(sizes = []) {
  const list = toIntegerList(sizes)
  if (!list.length) return ''
  if (list.length === 1) return String(list[0])
  return `${list[0]} - ${list[list.length - 1]}`
}

/**
 * One Supabase row -> the product shape every component already expects.
 * Returns null for rows that cannot be shown (no id or no name).
 *
 * Column precedence, so an old and a new dashboard both work:
 *   sizes    ← `size_range` (human friendly) then the legacy `sizes` array
 *   colors   ← `available_colors` then `colorway`
 *   sold out ← `in_stock = false` marks every size unavailable
 */
export function rowToProduct(row) {
  const id = String(row?.id ?? '').trim()
  const name = String(row?.name || '').trim()
  if (!id || !name) return null

  const seeded = localProducts.find((product) => product.id === id)

  const rangeSizes = parseSizeRange(row.size_range)
  const legacySizes = toIntegerList(row.sizes)
  const sizes = rangeSizes.length
    ? rangeSizes
    : legacySizes.length
      ? legacySizes
      : seeded?.sizes || ADULT_SIZES

  const colors = parseColorList(row.available_colors)
  const colorway = String(row.colorway || seeded?.colorway || '').trim()
  const shades = colors.length ? colors : parseColorList(colorway)

  const inStock = row.in_stock === undefined || row.in_stock === null ? true : Boolean(row.in_stock)
  const compareAt = row.compare_at == null ? 0 : Math.round(toNumber(row.compare_at))
  const image = String(row.image_url || '').trim()

  return {
    id,
    name,
    category: String(row.category || 'sneakers').trim() || 'sneakers',
    price: Math.max(0, Math.round(toNumber(row.price))),
    compareAt: compareAt > 0 ? compareAt : null,
    image: image || seeded?.image || FALLBACK_IMAGE,
    colorway: shades.join(', ') || colorway,
    colors: shades,
    sizeRange: String(row.size_range || '').trim() || formatSizeRange(sizes),
    sizes,
    soldOut: inStock ? toIntegerList(row.sold_out) : sizes.slice(),
    inStock,
    isNew: Boolean(row.is_new),
    badge: String(row.badge || '').trim(),
    rating: toNumber(row.rating, 4.8) || 4.8,
    blurb: String(row.blurb || '').trim(),
    description: String(row.description || seeded?.description || '').trim(),
    details: Array.isArray(row.details)
      ? row.details.map((detail) => String(detail)).filter(Boolean)
      : seeded?.details || [],
  }
}

/* ------------------------------------------------------------------ */
/* Tiny external store so every component shares one catalogue         */
/* ------------------------------------------------------------------ */

let currentList = localProducts
let currentSource = 'local'
let lastError = null
let inFlight = null
let settled = false
let lastLoadedAt = 0

const listeners = new Set()

export const getCatalogue = () => currentList
export const getCatalogueSource = () => currentSource
export const getCatalogueError = () => lastError

const subscribeCatalogueList = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function publish(list, source) {
  const changed = list !== currentList || source !== currentSource
  currentList = list
  currentSource = source
  if (changed) listeners.forEach((listener) => listener())
}

/**
 * Local catalogue first, then Supabase's list in place of the built-in one as
 * soon as it arrives. Unknown ids fall back to the built-in list so saved bags
 * and Instagram "shop this look" links keep working.
 */
export const getCatalogueProduct = (id) =>
  currentList.find((product) => product.id === id) ||
  localProducts.find((product) => product.id === id) ||
  null

/**
 * One bag line per product + size + colour, e.g. `mid-heel-01-39-Black`.
 * The colour is part of the key so the same shoe in two shades stays two
 * lines in the bag and in the WhatsApp order.
 */
export const cartLineId = (productId, size, color = '') =>
  [productId, size, String(color || '').trim()].filter(Boolean).join('-')

/* ------------------------------------------------------------------ */
/* Supabase read                                                       */
/* ------------------------------------------------------------------ */

async function fetchProductRows() {
  const client = await loadSupabaseClient()
  if (!client) throw new Error('Supabase is not configured')

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT) : null
  const signal = controller?.signal

  try {
    const ordered = await client
      .from(PRODUCTS_TABLE)
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .abortSignal(signal)

    if (!ordered.error) return Array.isArray(ordered.data) ? ordered.data : []

    /* A table created before `is_active` / `sort_order` existed: read
       everything and let `rowToProduct` sort out the rest. */
    const problem = `${ordered.error.code || ''} ${ordered.error.message || ''}`
    if (!MISSING_COLUMN.test(problem)) {
      throw new Error(ordered.error.message || 'Supabase refused the products query')
    }

    const plain = await client.from(PRODUCTS_TABLE).select('*').abortSignal(signal)
    if (plain.error) throw new Error(plain.error.message || 'Supabase refused the products query')
    return Array.isArray(plain.data) ? plain.data : []
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Load the live catalogue.
 * Resolves to `{ products, source, error }`; never throws.
 * `force` re-reads even when a load already settled (Realtime, tab focus).
 */
export function loadCatalogue({ force = false } = {}) {
  if (!isSupabaseConfigured) {
    publish(localProducts, 'local')
    return Promise.resolve({ products: currentList, source: currentSource, error: null })
  }

  if (inFlight) return inFlight
  if (settled && !force) {
    return Promise.resolve({ products: currentList, source: currentSource, error: lastError })
  }

  inFlight = (async () => {
    try {
      const rows = await fetchProductRows()
      const mapped = rows.map(rowToProduct).filter(Boolean)
      lastError = null
      settled = true
      lastLoadedAt = Date.now()
      publish(mapped, 'cloud')
      return { products: mapped, source: 'cloud', error: null }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      settled = true
      publish(localProducts, 'local')
      if (import.meta.env.DEV) {
        console.warn(
          `[fariifeet] could not load products from Supabase (${lastError}) — using the built-in catalogue.`,
        )
      }
      return { products: localProducts, source: 'local', error: lastError }
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

/* ------------------------------------------------------------------ */
/* Live updates: Realtime subscription + focus refresh                  */
/* ------------------------------------------------------------------ */

let channel = null
let subscribers = 0
let refreshTimer = null

/**
 * Realtime sends one event per row change. A single row edit can fire several
 * (update + trigger), so the refetch is debounced instead of firing per event.
 */
function scheduleRefresh() {
  if (typeof window === 'undefined') return
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    loadCatalogue({ force: true })
  }, 350)
}

/**
 * Watch the `products` table so an edit in the Supabase Table Editor lands on
 * an open storefront in about a second. Returns a disposer; never throws.
 */
export function subscribeCatalogue() {
  subscribers += 1

  if (!channel && typeof window !== 'undefined') {
    loadSupabaseClient().then((client) => {
      /* The tab may have unmounted while the SDK chunk was downloading. */
      if (!client || channel || subscribers === 0) return
      try {
        channel = client
          .channel('fariifeet-products-live')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: PRODUCTS_TABLE },
            scheduleRefresh,
          )
          .subscribe()
      } catch (error) {
        channel = null
      }
    })
  }

  return () => {
    subscribers = Math.max(0, subscribers - 1)
    if (subscribers === 0) unsubscribeCatalogue()
  }
}

/** Closes the Realtime channel (called on unmount, and by the dev checks). */
export function unsubscribeCatalogue() {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  if (!channel) return
  try {
    peekSupabaseClient()?.removeChannel(channel)
  } catch (error) {
    /* already gone */
  }
  channel = null
}

/** A tab that comes back after a minute may have missed a Realtime event. */
function refreshIfStale() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  if (!isSupabaseConfigured) return
  if (settled && Date.now() - lastLoadedAt < FOCUS_REFRESH_MS) return
  loadCatalogue({ force: true })
}

/** Subscribe a component to the shared catalogue and kick off the first load. */
export function useCatalogue() {
  const products = useSyncExternalStore(subscribeCatalogueList, getCatalogue, getCatalogue)

  useEffect(() => {
    loadCatalogue()
    const stop = subscribeCatalogue()

    window.addEventListener('focus', refreshIfStale)
    document.addEventListener('visibilitychange', refreshIfStale)

    return () => {
      stop()
      window.removeEventListener('focus', refreshIfStale)
      document.removeEventListener('visibilitychange', refreshIfStale)
    }
  }, [])

  return {
    products,
    source: getCatalogueSource(),
    isCloud: getCatalogueSource() === 'cloud',
    error: getCatalogueError(),
  }
}

