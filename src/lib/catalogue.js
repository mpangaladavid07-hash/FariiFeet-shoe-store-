import { useEffect, useSyncExternalStore } from 'react'
import { ADULT_SIZES, products as localProducts } from '../data/products'
import {
  PRODUCTS_TABLE,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from './config'

/**
 * Product catalogue.
 *
 * Source of truth: the `products` table in Supabase (see
 * `supabase/products.sql`). The owner edits price / image / category in the
 * Supabase dashboard and the shop follows on the next page load.
 *
 * The built-in list in `src/data/products.js` stays as the offline fallback so
 * the storefront never renders an empty grid: it is used until the first
 * Supabase response arrives, and again if that request fails.
 *
 * No SDK — a plain REST call keeps the bundle small, exactly like
 * `src/lib/orders.js`.
 */

const REQUEST_TIMEOUT = 12000
const FALLBACK_IMAGE = '/images/fariifeet-hero-shoes.jpg'

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
 * One Supabase row -> the product shape every component already expects.
 * Returns null for rows that cannot be shown (no id or no name).
 */
export function rowToProduct(row) {
  const id = String(row?.id || '').trim()
  const name = String(row?.name || '').trim()
  if (!id || !name) return null

  const seeded = localProducts.find((product) => product.id === id)
  const sizes = toIntegerList(row.sizes)
  const compareAt = row.compare_at == null ? 0 : Math.round(toNumber(row.compare_at))
  const image = String(row.image_url || '').trim()

  return {
    id,
    name,
    category: String(row.category || 'sneakers').trim() || 'sneakers',
    price: Math.max(0, Math.round(toNumber(row.price))),
    compareAt: compareAt > 0 ? compareAt : null,
    image: image || seeded?.image || FALLBACK_IMAGE,
    colorway: String(row.colorway || seeded?.colorway || '').trim(),
    sizes: sizes.length ? sizes : ADULT_SIZES,
    soldOut: toIntegerList(row.sold_out),
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

const listeners = new Set()

export const getCatalogue = () => currentList
export const getCatalogueSource = () => currentSource
export const getCatalogueError = () => lastError

export function subscribeCatalogue(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
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

/* ------------------------------------------------------------------ */
/* Supabase read                                                       */
/* ------------------------------------------------------------------ */

async function fetchProductRows() {
  if (typeof fetch !== 'function') throw new Error('fetch is unavailable in this environment')

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT) : null

  try {
    const query = 'select=*&is_active=eq.true&order=sort_order.asc,name.asc'
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${PRODUCTS_TABLE}?${query}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
      },
      signal: controller?.signal,
    })
    if (!response.ok) throw new Error(`Supabase responded ${response.status}`)
    const payload = await response.json()
    return Array.isArray(payload) ? payload : []
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Load (once per page load) the live catalogue.
 * Resolves to `{ products, source, error }`; never throws.
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

/** Subscribe a component to the shared catalogue and kick off the first load. */
export function useCatalogue() {
  const products = useSyncExternalStore(subscribeCatalogue, getCatalogue, getCatalogue)

  useEffect(() => {
    loadCatalogue()
  }, [])

  return {
    products,
    source: getCatalogueSource(),
    isCloud: getCatalogueSource() === 'cloud',
    error: getCatalogueError(),
  }
}

