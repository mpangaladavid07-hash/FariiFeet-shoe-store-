import { getCatalogueProduct } from './catalogue'

/**
 * FeedFusion → FariiFeet Instagram feed client.
 *
 * Configure with two environment variables (see `.env.example`):
 *   VITE_FEEDFUSION_URL — the FeedFusion feed endpoint that returns JSON
 *   VITE_FEEDFUSION_KEY — the FeedFusion API key
 *
 * The key is sent as a `key` query parameter, or substituted into a `{{key}}`
 * placeholder when your endpoint template uses one. If the endpoint already
 * carries a key/token parameter the URL is left untouched.
 *
 * Responses are normalised defensively because feed proxies commonly return
 * one of: a bare array, `{ data: [] }`, `{ posts: [] }`, `{ items: [] }`,
 * `{ media: [] }`, `{ entries: [] }` or `{ edges: [{ node }] }`.
 *
 * If the keys are missing, the request fails, times out or returns nothing,
 * the gallery silently falls back to the shop's own real photography.
 */

const env = import.meta.env || {}

export const FEEDFUSION_URL = String(env.VITE_FEEDFUSION_URL || '').trim()
export const FEEDFUSION_KEY = String(env.VITE_FEEDFUSION_KEY || '').trim()
export const isFeedConfigured = Boolean(FEEDFUSION_URL)

const REQUEST_TIMEOUT_MS = 8000
const KEY_PARAM_NAMES = ['key', 'api_key', 'apikey', 'access_key', 'token']

const firstString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

const isImageLike = (value) =>
  typeof value === 'string' &&
  (/^data:image\//i.test(value) ||
    /\.(jpe?g|png|webp|gif|avif|heic)(\?|#|$)/i.test(value) ||
    /(cdninstagram|fbcdn|cloudinary|images\.|imgix)/i.test(value))

function pickImage(node) {
  if (!node || typeof node !== 'object') return ''

  const direct = firstString(
    node.media_url,
    node.mediaUrl,
    node.image_url,
    node.imageUrl,
    node.display_url,
    node.displayUrl,
    node.thumbnail_url,
    node.thumbnailUrl,
    node.thumbnail,
    node.picture,
    node.image,
  )
  if (direct) return direct

  if (node.images && typeof node.images === 'object') {
    const fromImages = firstString(
      node.images.standard_resolution?.url,
      node.images.low_resolution?.url,
      node.images.thumbnail?.url,
      node.images.url,
    )
    if (fromImages) return fromImages
  }

  if (Array.isArray(node.children?.data) && node.children.data.length) {
    const child =
      node.children.data.find((entry) => entry?.media_type !== 'VIDEO') || node.children.data[0]
    const nested = pickImage(child?.node || child)
    if (nested) return nested
  }

  return isImageLike(node.url) ? node.url.trim() : ''
}

function extractList(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  const candidates = [
    payload.data,
    payload.posts,
    payload.items,
    payload.media,
    payload.entries,
    payload.feed,
    payload.result,
    payload.data?.data,
    payload.data?.posts,
    payload.data?.items,
    payload.result?.data,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }

  if (Array.isArray(payload.edges)) return payload.edges

  return []
}

function normalizePost(raw, index) {
  const node = raw?.node || raw?.media || raw
  if (!node || typeof node !== 'object') return null

  const image = pickImage(node)
  if (!image) return null

  const caption = firstString(
    node.caption,
    node.caption?.text,
    node.text,
    node.description,
    node.title,
  )
  const productId = firstString(node.productId, node.product_id, node.product)
  const product = productId ? getCatalogueProduct(productId) : null

  const likes = Number(node.like_count ?? node.likes ?? node.likesCount ?? 0)
  const comments = Number(node.comments_count ?? node.comments ?? node.commentsCount ?? 0)

  return {
    id:
      firstString(node.id, node.pk, node.shortcode, node.code, node.slug) || `feedfusion-${index}`,
    image,
    caption,
    alt: caption || 'FariiFeet shoe photographed for Instagram',
    productId: product?.id || undefined,
    category: product?.category || firstString(node.category).toLowerCase() || undefined,
    likes: Number.isFinite(likes) && likes > 0 ? likes : null,
    comments: Number.isFinite(comments) && comments > 0 ? comments : null,
    date: node.timestamp ?? node.taken_at ?? node.created_time ?? node.date ?? null,
    // Kept for reference only — the UI never sends customers to instagram.com.
    permalink: firstString(node.permalink, node.link) || undefined,
    isCurated: false,
  }
}

export function normalizeFeedPayload(payload) {
  return extractList(payload).map(normalizePost).filter(Boolean)
}


function buildEndpoint() {
  if (!FEEDFUSION_URL) return ''
  if (FEEDFUSION_URL.includes('{{key}}')) {
    return FEEDFUSION_URL.replace('{{key}}', encodeURIComponent(FEEDFUSION_KEY))
  }
  if (!FEEDFUSION_KEY) return FEEDFUSION_URL

  try {
    const parsed = new URL(FEEDFUSION_URL, window.location.href)
    const alreadyHasKey = KEY_PARAM_NAMES.some((name) => parsed.searchParams.has(name))
    if (!alreadyHasKey) parsed.searchParams.set('key', FEEDFUSION_KEY)
    return parsed.toString()
  } catch {
    return FEEDFUSION_URL
  }
}

const withCacheBust = (url) => {
  try {
    const parsed = new URL(url, window.location.href)
    parsed.searchParams.set('_', String(Date.now()))
    return parsed.toString()
  } catch {
    return url
  }
}

/**
 * Fetches the live feed. Always resolves — an empty array means "use fallback".
 * @param {{ signal?: AbortSignal, limit?: number }} [options]
 * @returns {Promise<Array>}
 */
export async function fetchInstagramFeed({ signal, limit = 8 } = {}) {
  const endpoint = buildEndpoint()
  if (!endpoint || typeof fetch !== 'function') return []

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const abortFromParent = () => controller.abort()
  signal?.addEventListener?.('abort', abortFromParent)

  try {
    const response = await fetch(withCacheBust(endpoint), {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`FeedFusion responded with ${response.status}`)

    const payload = await response.json()
    return normalizeFeedPayload(payload).slice(0, limit)
  } catch {
    // Missing keys, offline, CORS, timeout or an unexpected payload: stay quiet
    // and keep the shop photography on screen.
    return []
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener?.('abort', abortFromParent)
  }
}

/* ------------------------------------------------------------------ */
/* Shop fallback — always uses the store's real product photography */
/* ------------------------------------------------------------------ */

const FALLBACK_SEEDS = [
  {
    productId: 'new-balance-530',
    caption:
      'The New Balance 530 in Silver Storm — restocked at our Kariakoo shop this week. Tap to shop the pair.',
  },
  {
    productId: 'tory-burch-kitten',
    caption: 'Suede, pointed and walkable. Our kitten heel for the everyday.',
  },
  {
    productId: 'butterfly-slide',
    caption: 'Crystal detail slides for slow Sundays in Dar.',
  },
  {
    productId: 'mesh-buckle-ballet',
    caption: 'Mesh + buckle ballet flats, just in at FariiFeet.',
  },
  {
    productId: 'mid-heel-01',
    caption: 'Six colourways, one perfect point. Which one is yours?',
  },
  {
    productId: 'cobalt-loafer',
    caption: 'Cobalt loafers, straight off our shop shelf.',
  },
]

export const fallbackPosts = FALLBACK_SEEDS.map((seed) => {
  const product = getCatalogueProduct(seed.productId)
  return {
    id: `farii-curated-${seed.productId}`,
    image: product?.image || '/shoes/new-balance.jpg',
    caption: seed.caption,
    alt: product ? `${product.name} in ${product.colorway}` : 'FariiFeet shoes',
    productId: product?.id || seed.productId,
    category: product?.category || 'all',
    likes: null,
    comments: null,
    date: null,
    isCurated: true,
  }
})

