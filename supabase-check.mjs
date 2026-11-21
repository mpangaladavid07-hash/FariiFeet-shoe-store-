// Live check against the Supabase project configured in `.env`.
//
// Unlike the other `*-check.mjs` scripts this one uses the real network: it
// proves the project answers, the publishable key is valid, and that every
// table, column and Storage bucket the storefront needs actually exists.
//
//   node supabase-check.mjs        (or: npm run check:supabase)
//
// Exit code 0 = ready to deploy. Exit 1 = run the SQL in `supabase/` first.
import { readFileSync } from 'node:fs'

const TIMEOUT_MS = 20000
const BUCKET = 'product-images'

/* Columns src/lib/catalogue.js reads on every page load. */
const STORE_COLUMNS = [
  'id',
  'name',
  'price',
  'image_url',
  'category',
  'size_range',
  'available_colors',
  'in_stock',
  'sizes',
  'sold_out',
  'compare_at',
  'colorway',
  'badge',
  'blurb',
  'description',
  'details',
  'rating',
  'is_new',
  'is_active',
  'sort_order',
]

/* Added by supabase/instagram-sync.sql — only the importer needs these. */
const IMPORT_COLUMNS = ['source', 'instagram_media_id', 'instagram_permalink', 'instagram_posted_at']

let failures = 0
let warnings = 0

const check = (label, condition, detail = '') => {
  if (!condition) failures += 1
  console.log(`${condition ? 'OK  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  return condition
}

const warn = (label, condition, detail = '') => {
  if (!condition) warnings += 1
  console.log(`${condition ? 'OK  ' : 'WARN'}  ${label}${detail ? ` — ${detail}` : ''}`)
  return condition
}

/* ------------------------------------------------------------------ */
/* Environment                                                        */
/* ------------------------------------------------------------------ */

const readDotEnv = (path = '.env') => {
  let raw = ''
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    return {}
  }
  const values = {}
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!match) continue
    values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2').trim()
  }
  return values
}

const fileEnv = readDotEnv()
/** process.env (CI / Netlify) wins, then `.env`. */
const env = (name) => {
  const fromProcess = String(process.env[name] || '').trim()
  return fromProcess || String(fileEnv[name] || '').trim()
}

const url = (env('VITE_SUPABASE_URL') || env('SUPABASE_URL')).replace(/\/+$/, '')
const key = env('VITE_SUPABASE_PUBLISHABLE_KEY') || env('VITE_SUPABASE_ANON_KEY')

const jwtRole = (value) => {
  const parts = String(value || '').split('.')
  if (parts.length !== 3) return ''
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    return String(JSON.parse(atob(padded))?.role || '')
  } catch {
    return ''
  }
}

const keyKind = /^sb_publishable_/i.test(key)
  ? 'publishable'
  : /^sb_secret_/i.test(key)
    ? 'secret (WRONG)'
    : jwtRole(key) || 'unknown'
const isSecret = /^sb_secret_/i.test(key) || jwtRole(key) === 'service_role'

console.log('\nFariiFeet — live Supabase check\n')
console.log(`  project  ${url || '(not set)'}`)
console.log(`  key      ${key ? `${key.slice(0, 18)}… (${keyKind})` : '(not set)'}`)
console.log(`  source   ${fileEnv.VITE_SUPABASE_URL ? '.env' : 'process environment'}\n`)

/* ------------------------------------------------------------------ */
/* REST helpers                                                       */
/* ------------------------------------------------------------------ */

const request = async (path, { method = 'GET', headers = {} } = {}) => {
  try {
    const response = await fetch(`${url}${path}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        ...headers,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const text = await response.text()
    let body = text
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      /* html error page — keep the raw text for the report */
    }
    return { status: response.status, headers: response.headers, body }
  } catch (error) {
    return {
      status: 0,
      headers: new Headers(),
      body: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const failureText = (result) => {
  if (result.status === 0) return `network error: ${result.error}`
  const body = result.body
  if (body && typeof body === 'object' && body.message) {
    return `HTTP ${result.status} ${body.code || ''} ${body.message}`.replace(/\s+/g, ' ').trim()
  }
  return `HTTP ${result.status}`
}

/** 404 + PGRST205 means "no such table"; anything else is a real error. */
const isMissingTable = (result) =>
  result.status === 404 && String(result.body?.code || '') === 'PGRST205'

/** 400 + PGRST204 means "no such column". */
const isMissingColumn = (result) =>
  result.status === 400 && String(result.body?.code || '') === 'PGRST204'

const probeTable = async (table) => {
  const result = await request(`/rest/v1/${table}?select=id&limit=1`)
  return { result, exists: result.status === 200, missing: isMissingTable(result) }
}

/* ------------------------------------------------------------------ */
/* 1. Configuration                                                   */
/* ------------------------------------------------------------------ */

const configured = check('project URL configured', Boolean(url), url ? '' : 'set VITE_SUPABASE_URL')
const keyPresent = check(
  'publishable key configured',
  Boolean(key),
  key ? '' : 'set VITE_SUPABASE_PUBLISHABLE_KEY',
)
check('key is browser-safe (not sb_secret_/service_role)', Boolean(key) && !isSecret, keyKind)

if (!configured || !keyPresent || isSecret) {
  console.log('\nFix the values above, then run this again.')
  process.exit(1)
}

/* ------------------------------------------------------------------ */
/* 2. Reachability + tables                                           */
/* ------------------------------------------------------------------ */

const ping = await request('/rest/v1/products?select=id&limit=1')
const reachable = check(
  'project reachable and key accepted',
  ping.status === 200 || isMissingTable(ping),
  ping.status === 0
    ? `${ping.error} — a paused project behaves like this; open the Supabase dashboard and restore it`
    : ping.status === 401
      ? 'the project rejected the key (401 Invalid API key)'
      : '',
)

if (reachable) {
  const products = await probeTable('products')
  const productsReady = check(
    'public.products table exists',
    products.exists,
    products.missing
      ? 'run supabase_products_setup.sql (root of the repo) in the SQL editor'
      : products.exists
        ? ''
        : failureText(products.result),
  )

  if (productsReady) {
    const combined = await request(`/rest/v1/products?select=${STORE_COLUMNS.join(',')}&limit=1`)
    if (combined.status === 200) {
      check('every column the storefront reads exists', true)
    } else {
      const missing = []
      for (const column of STORE_COLUMNS) {
        const probe = await request(`/rest/v1/products?select=${column}&limit=1`)
        if (isMissingColumn(probe)) missing.push(column)
      }
      check(
        'every column the storefront reads exists',
        missing.length === 0,
        missing.length ? `missing: ${missing.join(', ')}` : failureText(combined),
      )
    }

    const counted = await request('/rest/v1/products?select=id', {
      headers: { Prefer: 'count=exact', Range: '0-0' },
    })
    const total = Number(String(counted.headers.get('content-range') || '').split('/')[1])
    check(
      'catalogue has rows (supabase_products_setup.sql seeds 21)',
      Number.isFinite(total) && total > 0,
      Number.isFinite(total) ? `${total} product row(s)` : failureText(counted),
    )

    const appQuery = await request(
      '/rest/v1/products?select=*&is_active=eq.true&order=sort_order.asc,name.asc',
    )
    check(
      'the exact storefront query works (RLS read policy)',
      appQuery.status === 200,
      appQuery.status === 200
        ? `${Array.isArray(appQuery.body) ? appQuery.body.length : 0} active product(s)`
        : failureText(appQuery),
    )

    const importProbe = await request(`/rest/v1/products?select=${IMPORT_COLUMNS.join(',')}&limit=1`)
    warn(
      'import columns from supabase/instagram-sync.sql',
      importProbe.status === 200,
      importProbe.status === 200 ? '' : 'optional — only the Instagram importer needs them',
    )
  }

  const orders = await probeTable('orders')
  check(
    'public.orders table exists',
    orders.exists,
    orders.missing ? 'run supabase/schema.sql' : orders.exists ? '' : failureText(orders.result),
  )

  const runs = await request('/rest/v1/instagram_sync_runs?select=id&limit=1')
  const runsMissing = isMissingTable(runs)
  warn(
    'public.instagram_sync_runs audit table',
    !runsMissing,
    runsMissing ? 'optional — run supabase/instagram-sync.sql for the importer' : '',
  )
  if (!runsMissing && runs.status === 200) {
    warnings += 1
    console.log('WARN  instagram_sync_runs is readable with the browser key — revoke anon access')
  }
}

/* ------------------------------------------------------------------ */
/* 3. Storage bucket                                                  */
/* ------------------------------------------------------------------ */

const bucketProbe = await request(`/storage/v1/object/public/${BUCKET}/.fariifeet-probe`)
const bucketMissing = String(bucketProbe.body?.code || '') === 'NoSuchBucket'
check(
  `Storage bucket "${BUCKET}" exists`,
  !bucketMissing && bucketProbe.status !== 0,
  bucketMissing
    ? 'run supabase/instagram-sync.sql (or create a public bucket named product-images)'
    : bucketProbe.status === 0
      ? bucketProbe.error
      : 'answered — upload one photo with the service role to confirm writes',
)

/* ------------------------------------------------------------------ */
/* 4. Server-only values (the storefront runs without them)           */
/* ------------------------------------------------------------------ */

warn(
  'SUPABASE_SERVICE_ROLE_KEY (photo uploads + product inserts)',
  Boolean(env('SUPABASE_SERVICE_ROLE_KEY')),
  'not set — the importer stays in dry-run until this exists',
)
warn(
  'INSTAGRAM_ACCESS_TOKEN (caption import)',
  Boolean(env('INSTAGRAM_ACCESS_TOKEN')),
  'not set — the importer reports "not configured" and the gallery uses the curated fallback',
)
warn(
  'INSTAGRAM_SYNC_SECRET (closes POST /api/instagram-sync)',
  Boolean(env('INSTAGRAM_SYNC_SECRET')),
  'not set — the HTTP endpoint stays closed (the daily schedule still runs)',
)
warn(
  'VITE_FEEDFUSION_URL (live "Seen on Instagram" gallery)',
  Boolean(env('VITE_FEEDFUSION_URL')),
  'not set — the gallery uses the boutique photography',
)

/* ------------------------------------------------------------------ */
/* 5. Verdict                                                         */
/* ------------------------------------------------------------------ */

console.log('')
if (failures) {
  console.log(
    `Not ready: ${failures} problem(s) above. Run in the Supabase SQL editor:\n` +
      '  supabase_products_setup.sql   (products table, 21 seed rows, RLS, Realtime)\n' +
      '  supabase/schema.sql           (orders table)\n' +
      '  supabase/instagram-sync.sql   (optional: Instagram importer)',
  )
} else {
  console.log(
    `Supabase looks ready${warnings ? ` (${warnings} optional item(s) open)` : ''}. ` +
      'Next: npm run build, then set the same values in Netlify.',
  )
}

process.exit(failures ? 1 : 0)
