/**
 * Instagram Graph API -> FariiFeet catalogue.
 *
 * One run does five things:
 *   1. GET /{ig-user-id}/media  (caption, permalink, timestamp, image URL)
 *   2. parse the caption for a product name + TZS price (./caption.mjs)
 *   3. download the photo, crop it to the 4:5 product-card ratio with `jimp`
 *   4. upload the cropped JPEG to the public `product-images` Storage bucket
 *   5. append a row to `public.products` (never overwriting an existing one)
 *
 * Secrets: this module reads the *service role* key, so it must only ever run
 * inside a Netlify function (or `run-instagram-sync.mjs` on the owner's machine).
 * Nothing here is imported by the browser bundle.
 */
import { Jimp } from 'jimp'
import { ADULT_SIZES, parseCaption, slugify } from './caption.mjs'

export const DEFAULT_BUCKET = 'product-images'
export const PHOTO_WIDTH = 1080
export const PHOTO_HEIGHT = 1350 // 4:5 — matches the product cards
export const DEFAULT_LIMIT = 6
export const MAX_LIMIT = 10
export const IMPORT_SORT_ORDER = 5 // above every hand-entered shoe (10…210)
export const GRAPH_FIELDS =
  'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_url,media_type,thumbnail_url}'

const REQUEST_TIMEOUT_MS = 20000
const UPLOAD_TIMEOUT_MS = 30000
const MAX_IMAGE_BYTES = 12 * 1024 * 1024

const trim = (value) => String(value ?? '').trim()
const errorMessage = (error) => (error instanceof Error ? error.message : String(error))

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

/**
 * Reads the server-side environment. `SUPABASE_URL` may fall back to
 * `VITE_SUPABASE_URL` because both point at the same project.
 *
 * @param {Record<string, string|undefined>} [env]
 */
export function readConfig(env = process.env) {
  const supabaseUrl = trim(env.SUPABASE_URL || env.VITE_SUPABASE_URL).replace(/\/+$/, '')
  const serviceKey = trim(env.SUPABASE_SERVICE_ROLE_KEY)
  const token = trim(env.INSTAGRAM_ACCESS_TOKEN)
  const userId = trim(env.INSTAGRAM_USER_ID) || 'me'
  const base = (trim(env.INSTAGRAM_GRAPH_BASE) || 'https://graph.instagram.com').replace(/\/+$/, '')
  const bucket = trim(env.INSTAGRAM_STORAGE_BUCKET) || DEFAULT_BUCKET
  const secret = trim(env.INSTAGRAM_SYNC_SECRET)
  const autoPublish = !/^(false|0|no|off)$/i.test(trim(env.INSTAGRAM_AUTO_PUBLISH || 'true'))
  const configuredLimit = Number.parseInt(trim(env.INSTAGRAM_SYNC_LIMIT), 10)

  const missing = []
  if (!supabaseUrl) missing.push('SUPABASE_URL')
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!token) missing.push('INSTAGRAM_ACCESS_TOKEN')

  return {
    supabaseUrl,
    serviceKey,
    token,
    userId,
    base,
    bucket,
    secret,
    autoPublish,
    limit: clampLimit(Number.isFinite(configuredLimit) ? configuredLimit : DEFAULT_LIMIT),
    missing,
    isConfigured: missing.length === 0,
  }
}

export function clampLimit(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return DEFAULT_LIMIT
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(numeric)))
}

/* ------------------------------------------------------------------ */
/* Instagram Graph API                                                 */
/* ------------------------------------------------------------------ */

/**
 * Recent media for the configured account, newest first.
 * Works with both token flavours:
 *   graph.instagram.com  -> "Instagram API with Instagram Login" (IG_USER_ID = me)
 *   graph.facebook.com   -> Instagram Business account id + a Page token
 */
export async function fetchInstagramMedia(config, { limit = config.limit } = {}) {
  const endpoint = new URL(`${config.base}/${config.userId}/media`)
  endpoint.searchParams.set('fields', GRAPH_FIELDS)
  endpoint.searchParams.set('limit', String(clampLimit(limit)))
  endpoint.searchParams.set('access_token', config.token)

  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.error) {
    const detail = payload?.error || {}
    const hint =
      detail.code === 190 || response.status === 401
        ? ' — the access token has expired; generate a fresh long-lived token'
        : ''
    throw new Error(
      `Instagram Graph API ${response.status}${detail.message ? `: ${detail.message}` : ''}${hint}`,
    )
  }

  const media = Array.isArray(payload?.data) ? payload.data : []
  return media.filter((post) => post && post.id)
}

/** The best still image for a post: carousels use their first photo. */
export function pickImageUrl(post) {
  if (!post) return ''
  if (post.media_type === 'CAROUSEL_ALBUM') {
    const children = Array.isArray(post.children?.data) ? post.children.data : []
    const child = children.find(
      (entry) => entry?.media_type !== 'VIDEO' && (entry?.media_url || entry?.thumbnail_url),
    )
    if (child) return child.media_url || child.thumbnail_url || ''
  }
  if (post.media_type === 'VIDEO') return post.thumbnail_url || ''
  return post.media_url || post.thumbnail_url || ''
}

async function downloadImage(url) {
  const response = await fetch(url, {
    headers: { Accept: 'image/*', 'User-Agent': 'FariiFeetCatalogueBot/1.0' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`photo download failed (HTTP ${response.status})`)

  const buffer = Buffer.from(await response.arrayBuffer())
  if (!buffer.length) throw new Error('photo download returned an empty file')
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`photo is too large (${Math.round(buffer.length / 1024 / 1024)} MB)`)
  }
  return buffer
}

/** Centre-crops any photo to 1080x1350 and re-encodes it as a small JPEG. */
export async function cropToProductPhoto(buffer) {
  const image = await Jimp.read(buffer)
  image.cover({ w: PHOTO_WIDTH, h: PHOTO_HEIGHT })
  const output = await image.getBuffer('image/jpeg', { quality: 82 })
  return Buffer.from(output)
}

export const publicPhotoUrl = (config, objectPath) =>
  `${config.supabaseUrl}/storage/v1/object/public/${config.bucket}/${objectPath}`

async function uploadProductPhoto(config, objectPath, buffer) {
  const endpoint = `${config.supabaseUrl}/storage/v1/object/${config.bucket}/${objectPath}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'max-age=31536000',
      'x-upsert': 'true',
    },
    body: buffer,
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `photo upload failed (HTTP ${response.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`,
    )
  }

  return publicPhotoUrl(config, objectPath)
}

/* ------------------------------------------------------------------ */
/* Supabase: products table + sync log                                 */
/* ------------------------------------------------------------------ */

const supabaseHeaders = (config, extra = {}) => ({
  apikey: config.serviceKey,
  Authorization: `Bearer ${config.serviceKey}`,
  Accept: 'application/json',
  ...extra,
})

/** Existing ids and imported media ids, so nothing is added twice. */
async function fetchExistingProducts(config) {
  const url = `${config.supabaseUrl}/rest/v1/products?select=id,name,instagram_media_id`
  const response = await fetch(url, {
    headers: supabaseHeaders(config),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `could not read the products table (HTTP ${response.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`,
    )
  }
  const rows = await response.json().catch(() => null)
  return Array.isArray(rows) ? rows : []
}

/**
 * Appends rows. `ignore-duplicates` means a re-run can never overwrite a price
 * or a photo the owner edited by hand in the dashboard.
 */
async function insertProducts(config, rows) {
  if (!rows.length) return []
  const response = await fetch(`${config.supabaseUrl}/rest/v1/products?on_conflict=id`, {
    method: 'POST',
    headers: supabaseHeaders(config, {
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=representation',
    }),
    body: JSON.stringify(rows),
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `could not add the products (HTTP ${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
    )
  }

  const inserted = await response.json().catch(() => null)
  return Array.isArray(inserted) ? inserted : []
}

/** Best-effort audit trail: a logging failure must never break an import. */
async function startRun(config, trigger, log) {
  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/instagram_sync_runs`, {
      method: 'POST',
      headers: supabaseHeaders(config, {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify({ trigger }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const rows = await response.json().catch(() => null)
    return Array.isArray(rows) && rows[0]?.id ? rows[0].id : null
  } catch (error) {
    log.warn(`[instagram-sync] could not open a run log (${errorMessage(error)}) — continuing.`)
    return null
  }
}

async function finishRun(config, runId, patch, log) {
  if (!runId) return
  try {
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/instagram_sync_runs?id=eq.${encodeURIComponent(runId)}`,
      {
        method: 'PATCH',
        headers: supabaseHeaders(config, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...patch, finished_at: new Date().toISOString() }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    )
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error) {
    log.warn(`[instagram_sync_runs] could not record the result (${errorMessage(error)})`)
  }
}

/* ------------------------------------------------------------------ */
/* Product rows                                                        */
/* ------------------------------------------------------------------ */

/**
 * Deterministic id from the product name; a short slice of the Instagram media
 * id breaks ties so two "Air Force 1" posts cannot collide.
 */
export function productIdFor(name, mediaId, taken = new Set()) {
  const base = (slugify(name) || 'insta-drop').slice(0, 64).replace(/-+$/, '')
  if (base && !taken.has(base)) return base

  const tail = String(mediaId ?? '').replace(/[^a-z0-9]/gi, '').slice(-6) || 'insta'
  const withTail = `${base.slice(0, 56).replace(/-+$/, '')}-${tail}`
  if (!taken.has(withTail)) return withTail

  let counter = 2
  while (taken.has(`${withTail}-${counter}`)) counter += 1
  return `${withTail}-${counter}`
}

/** Draft -> the exact shape `public.products` expects. */
export function buildProductRow({ id, parsed, post, photoUrl, config }) {
  return {
    id,
    name: parsed.name,
    price: parsed.price,
    image_url: photoUrl,
    category: parsed.category,
    sizes: parsed.sizes.length ? parsed.sizes : [...ADULT_SIZES],
    sold_out: [],
    compare_at: null,
    colorway: parsed.colorway,
    badge: 'Instagram',
    blurb: parsed.blurb,
    description: parsed.description,
    details: parsed.details,
    rating: 4.8,
    is_new: true,
    is_active: config.autoPublish,
    sort_order: IMPORT_SORT_ORDER,
    source: 'instagram',
    instagram_media_id: String(post.id),
    instagram_permalink: String(post.permalink || ''),
    instagram_posted_at: post.timestamp || null,
  }
}

/* ------------------------------------------------------------------ */
/* The run                                                             */
/* ------------------------------------------------------------------ */

/**
 * Fetches recent posts and appends the ones that parse into a sellable shoe.
 * Never throws: the result object explains what happened, so the scheduled
 * function, the HTTP endpoint and the local CLI all report the same way.
 *
 * @param {{ trigger?: string, limit?: number, dryRun?: boolean,
 *   env?: Record<string, string|undefined>, log?: Console }} [options]
 */
export async function runInstagramSync({
  trigger = 'manual',
  limit,
  dryRun = false,
  env = process.env,
  log = console,
} = {}) {
  const config = readConfig(env)
  const results = []
  const summary = {
    ok: true,
    configured: config.isConfigured,
    trigger,
    dryRun,
    runId: null,
    startedAt: new Date().toISOString(),
    postsSeen: 0,
    imported: 0,
    skipped: 0,
    failed: 0,
    results,
  }

  if (!config.isConfigured) {
    summary.ok = false
    summary.error = `Missing ${config.missing.join(', ')} — see README → "Instagram → catalogue".`
    log.warn(`[instagram-sync] ${summary.error}`)
    return summary
  }

  if (!dryRun) summary.runId = await startRun(config, trigger, log)

  try {
    const posts = await fetchInstagramMedia(config, { limit: clampLimit(limit ?? config.limit) })
    summary.postsSeen = posts.length

    const existing = await fetchExistingProducts(config)
    const takenIds = new Set(existing.map((row) => trim(row?.id)).filter(Boolean))
    const importedMedia = new Set(existing.map((row) => trim(row?.instagram_media_id)).filter(Boolean))
    const rows = []

    for (const post of posts) {
      const mediaId = String(post.id)
      const entry = { mediaId, permalink: post.permalink || '' }

      if (importedMedia.has(mediaId)) {
        results.push({ ...entry, status: 'skipped', reason: 'already in the catalogue' })
        continue
      }

      const parsed = parseCaption(post.caption || '')
      if (!parsed.price) {
        results.push({ ...entry, status: 'skipped', reason: 'no TZS price in the caption' })
        continue
      }
      if (!parsed.name) {
        results.push({ ...entry, status: 'skipped', reason: 'could not read a product name' })
        continue
      }

      const imageUrl = pickImageUrl(post)
      if (!imageUrl) {
        results.push({ ...entry, status: 'skipped', reason: 'post has no photo' })
        continue
      }

      const id = productIdFor(parsed.name, mediaId, takenIds)
      const objectPath = `instagram/${id}.jpg`

      let photoUrl
      try {
        if (dryRun) {
          photoUrl = publicPhotoUrl(config, objectPath)
        } else {
          const cropped = await cropToProductPhoto(await downloadImage(imageUrl))
          photoUrl = await uploadProductPhoto(config, objectPath, cropped)
        }
      } catch (error) {
        results.push({ ...entry, status: 'failed', reason: errorMessage(error) })
        continue
      }

      const row = buildProductRow({ id, parsed, post, photoUrl, config })
      takenIds.add(id)
      importedMedia.add(mediaId)
      rows.push(row)
      results.push({
        ...entry,
        status: dryRun ? 'would-import' : 'imported',
        id,
        name: row.name,
        price: row.price,
        category: row.category,
        image: photoUrl,
      })
    }

    if (!dryRun && rows.length) {
      const inserted = await insertProducts(config, rows)
      const insertedIds = new Set(inserted.map((row) => trim(row?.id)))
      for (const result of results) {
        if (result.status !== 'imported' || insertedIds.has(result.id)) continue
        result.status = 'failed'
        result.reason = 'the database ignored this row (duplicate id or Instagram post)'
      }
    }
  } catch (error) {
    summary.ok = false
    summary.error = errorMessage(error)
    log.error(`[instagram-sync] ${summary.error}`)
  }

  for (const result of results) {
    if (result.status === 'imported' || result.status === 'would-import') summary.imported += 1
    else if (result.status === 'failed') summary.failed += 1
    else summary.skipped += 1
  }

  summary.finishedAt = new Date().toISOString()
  summary.status = summary.ok ? (summary.failed ? 'partial' : 'ok') : 'failed'

  if (!dryRun) {
    await finishRun(
      config,
      summary.runId,
      {
        status: summary.status,
        posts_seen: summary.postsSeen,
        imported: summary.imported,
        skipped: summary.skipped,
        failed: summary.failed,
        message: String(summary.error || '').slice(0, 400),
        detail: results.slice(0, 50),
      },
      log,
    )
  }

  log.log(
    `[instagram-sync] ${summary.status}: ${summary.postsSeen} post(s) seen, ` +
      `${summary.imported} imported, ${summary.skipped} skipped, ${summary.failed} failed` +
      `${summary.error ? ` — ${summary.error}` : ''}`,
  )

  return summary
}



