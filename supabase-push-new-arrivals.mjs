// Push the 23 November 2026 new arrivals into the live Supabase `products`
// table, then check the table for rows pointing at photos that no longer exist.
//
//   npm run products:push            upsert the 30 rows (safe to re-run)
//   npm run products:push:dry        print the payload, write nothing
//   npm run products:push -- --prune delete rows whose photo is missing
//
// The shoe data comes from `src/data/products.js`; the id list and the
// `sort_order` values come from `supabase/new-arrivals.sql`. Reading both keeps
// the SQL migration, the offline catalogue and the live table in sync.
//
// `Prefer: resolution=merge-duplicates` updates a row that already exists (ids
// are fixed) instead of failing, so running this twice is safe. Needs
// SUPABASE_SERVICE_ROLE_KEY in `.env`: the publishable key cannot write,
// because Row Level Security only lets signed-in admins INSERT.
import { existsSync, readFileSync } from 'node:fs'
import { loadEnv } from 'vite'
import { products } from './src/data/products.js'

const TABLE = 'products'
const SQL_FILE = 'supabase/new-arrivals.sql'
const TIMEOUT_MS = 25000

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run') || args.includes('--dry')
const prune = args.includes('--prune')

/* loadEnv with an empty prefix returns every key, not only VITE_*. */
const fileEnv = loadEnv('development', process.cwd(), '')
for (const [key, value] of Object.entries(fileEnv)) {
  if (!process.env[key]) process.env[key] = value
}

const env = (...names) => {
  for (const name of names) {
    const value = String(process.env[name] || '').trim()
    if (value) return value
  }
  return ''
}

const url = env('SUPABASE_URL', 'VITE_SUPABASE_URL').replace(/\/+$/, '')
const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY')
const mask = (value) => (value ? `${value.slice(0, 4)}… (len ${value.length})` : '(empty)')

/* ------------------------------------------------------------------ */
/* Rows: ids + sort_order from the SQL file, everything else from JS   */
/* ------------------------------------------------------------------ */

const sql = readFileSync(SQL_FILE, 'utf8')
const sqlRows = [...sql.matchAll(/^\s*\('([a-z0-9-]+)'.*?,\s*(\d{2,4})\),?\s*$/gm)].map(
  ([, id, sortOrder]) => ({ id, sortOrder: Number(sortOrder) }),
)

if (!sqlRows.length) {
  console.error(`Could not read any product ids from ${SQL_FILE}.`)
  process.exit(1)
}

const colorsFor = (product) =>
  String(product.colorway || '')
    .split(/\s*[/,;|]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ') || 'Black'

const sizeRangeFor = (sizes) => {
  if (!sizes?.length) return '36 - 45'
  return sizes.length === 1 ? String(sizes[0]) : `${sizes[0]} - ${sizes[sizes.length - 1]}`
}

const rows = []
const problems = []

for (const { id, sortOrder } of sqlRows) {
  const product = products.find((entry) => entry.id === id)
  if (!product) {
    problems.push(`${id} is in ${SQL_FILE} but not in src/data/products.js`)
    continue
  }
  if (product.image && !existsSync(`public${product.image}`)) {
    problems.push(`${id} points at a missing photo: public${product.image}`)
  }
  rows.push({
    id,
    name: product.name,
    price: product.price,
    image_url: product.image,
    category: product.category,
    size_range: sizeRangeFor(product.sizes),
    available_colors: colorsFor(product),
    colorway: product.colorway || '',
    badge: product.badge || '',
    blurb: product.blurb || '',
    description: product.description || '',
    details: product.details || [],
    sizes: product.sizes || [],
    sold_out: product.soldOut || [],
    compare_at: product.compareAt || null,
    rating: product.rating ?? 4.8,
    is_new: product.isNew !== false,
    is_active: true,
    in_stock: true,
    sort_order: sortOrder,
  })
}

/* ------------------------------------------------------------------ */
/* Talk to Supabase                                                    */
/* ------------------------------------------------------------------ */

const request = async (path, init = {}) => {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${init.method || 'GET'} ${path} -> ${response.status} ${text.slice(0, 500)}`)
  }
  return text ? JSON.parse(text) : null
}

console.log('\nFariiFeet — new arrivals -> Supabase')
console.log(`  mode             ${dryRun ? 'dry run — nothing is written' : 'live upsert'}`)
console.log(`  supabase         ${url || '(missing)'}`)
console.log(`  service role key ${mask(serviceKey)}`)
console.log(`  source           ${SQL_FILE} + src/data/products.js`)
console.log(`  rows             ${rows.length}`)

if (problems.length) {
  console.log('')
  for (const problem of problems) console.log(`  PROBLEM  ${problem}`)
}

if (dryRun) {
  console.log('\nPayload (first 2 rows):')
  console.log(JSON.stringify(rows.slice(0, 2), null, 2))
  console.log('\nDry run: nothing was written to Supabase.')
  process.exit(problems.length ? 1 : 0)
}

if (!url || !serviceKey) {
  console.error(
    '\nMissing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.\n' +
      'Copy the service_role key from Supabase -> Project Settings -> API,\n' +
      'or run supabase/new-arrivals.sql in the SQL Editor instead.',
  )
  process.exit(1)
}

try {
  const saved = await request(`${TABLE}?on_conflict=id`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  })
  console.log(`\nUpserted ${Array.isArray(saved) ? saved.length : rows.length} row(s).`)
} catch (error) {
  console.error(`\nUpsert failed: ${error.message}`)
  process.exit(1)
}

/* ------------------------------------------------------------------ */
/* Verify: row count + rows whose photo was deleted from public/       */
/* ------------------------------------------------------------------ */

const live = await request(`${TABLE}?select=id,price,category,image_url&order=sort_order.asc`)
const missing = live.filter(
  (row) => row.image_url?.startsWith('/') && !existsSync(`public${row.image_url}`),
)

console.log(`\nLive table: ${live.length} row(s)`)
for (const row of live.slice(-rows.length)) {
  console.log(
    `  ${row.id.padEnd(26)} ${String(row.price).padStart(6)}  ${row.category.padEnd(9)} ${row.image_url}`,
  )
}

if (missing.length) {
  console.log(`\n${missing.length} row(s) point at a photo that is not in public/:`)
  for (const row of missing) console.log(`  ${row.id}  ${row.image_url}`)
  if (prune) {
    const ids = missing.map((row) => `"${row.id}"`).join(',')
    await request(`${TABLE}?id=in.(${ids})`, { method: 'DELETE' })
    console.log(`Deleted ${missing.length} orphan row(s).`)
  } else {
    console.log('Re-run with `npm run products:push -- --prune` to delete them.')
  }
} else {
  console.log('Every live row points at a photo that exists in public/ — nothing to prune.')
}

process.exit(problems.length ? 1 : 0)

