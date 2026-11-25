// Dev-only smoke test for the Supabase product catalogue (no network needed):
// offline fallback, row mapping and the failure path.
//   node catalogue-check.mjs     (or: npm run check:catalogue)
import { createServer } from 'vite'

const viteOptions = {
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: 'custom',
  logLevel: 'warn',
}

let failures = 0
const check = (label, condition, detail = '') => {
  if (condition) console.log(`OK    ${label}`)
  else {
    failures += 1
    console.log(`FAIL  ${label} ${detail}`)
  }
}

/* src/data/products.js — the 21 original shoes plus the 30 arrivals of
   23 Nov 2026 (see supabase/new-arrivals.sql). */
const BUILT_IN_COUNT = 51

/* `.env` points at the live project, so pin the environment for this file:
   Vite's loadEnv() lets process.env win, which keeps these checks offline. */
const clearSupabaseEnv = () => {
  process.env.VITE_SUPABASE_URL = ''
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = ''
  process.env.VITE_SUPABASE_ANON_KEY = ''
}
clearSupabaseEnv()

/* 1. No VITE_SUPABASE_* keys: the built-in catalogue must be served as-is. */
const offlineVite = await createServer(viteOptions)
try {
  const catalogue = await offlineVite.ssrLoadModule('/src/lib/catalogue.js')
  const first = await catalogue.loadCatalogue()

  check('no keys → built-in catalogue', first.source === 'local', first.source)
  check('built-in product count', first.products.length === BUILT_IN_COUNT, String(first.products.length))
  check('getCatalogue mirrors snapshot', catalogue.getCatalogue() === first.products)
  check(
    'offline lookup by id',
    catalogue.getCatalogueProduct('new-balance-530')?.price === 145000,
    String(catalogue.getCatalogueProduct('new-balance-530')?.price),
  )
  check('unknown id → null', catalogue.getCatalogueProduct('not-a-shoe') === null)
} finally {
  await offlineVite.close()
}

/* 2. Keys present + a stubbed REST response: rows must be mapped to the shape
      the storefront components already consume. */
process.env.VITE_SUPABASE_URL = 'https://demo-project.supabase.co/'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test-key'

const rows = [
  {
    id: 'dashboard-only-shoe',
    name: 'Dashboard Only Heel',
    size_range: '38 - 40',
    available_colors: 'Rose, Black',
    in_stock: true,
    price: '91000',
    image_url: 'https://cdn.example.com/heels/rose.jpg',
    category: 'heels',
    sizes: '{38,39,40}',
    sold_out: [39],
    compare_at: null,
    colorway: 'Rose',
    badge: '',
    blurb: 'Added straight from the Supabase dashboard.',
    description: '',
    details: ['Suede upper'],
    rating: '4.6',
    is_new: true,
    sort_order: 5,
    is_active: true,
  },
  {
    id: 'new-balance-530',
    name: 'New Balance 530 — Silver Storm',
    price: 149000,
    image_url: '',
    category: 'sneakers',
    sizes: [36, 37],
    sold_out: [],
    compare_at: 175000,
    rating: 4.9,
    is_new: false,
    details: [],
    colorway: '',
    badge: 'Icon',
    is_active: true,
  },
  {
    id: 'sold-out-slide',
    name: 'Sold Out Slide',
    size_range: '38, 39, 41',
    available_colors: 'Black',
    in_stock: false,
    price: 55000,
    image_url: '',
    category: 'slides',
    is_active: true,
  },
]

let requestedUrl = ''
let requestedHeaders = {}
let requestedCount = 0

/* @supabase/supabase-js talks to PostgREST over the global `fetch`, so a real
   Response object is enough to exercise the whole query + mapping path. */
globalThis.fetch = async (url, options = {}) => {
  requestedUrl = String(url)
  requestedHeaders = options.headers || {}
  requestedCount += 1
  return new Response(JSON.stringify(rows), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const cloudVite = await createServer(viteOptions)
try {
  const catalogue = await cloudVite.ssrLoadModule('/src/lib/catalogue.js')
  const loaded = await catalogue.loadCatalogue()

  check('keys present → cloud source', loaded.source === 'cloud', loaded.source)
  check('cloud row count', loaded.products.length === 3, String(loaded.products.length))
  check(
    'request path + filters',
    decodeURIComponent(requestedUrl) ===
      'https://demo-project.supabase.co/rest/v1/products?select=*&is_active=eq.true&order=sort_order.asc,name.asc',
    requestedUrl,
  )
  const header = (name) =>
    (typeof requestedHeaders.get === 'function'
      ? requestedHeaders.get(name)
      : requestedHeaders[name] ?? requestedHeaders[name.toLowerCase()]) || ''
  check(
    'publishable key sent',
    header('apikey') === 'sb_publishable_test-key' &&
      header('authorization') === 'Bearer sb_publishable_test-key',
    String(header('apikey')),
  )

  const added = loaded.products[0]
  check('new row visible by id', catalogue.getCatalogueProduct('dashboard-only-shoe') === added)
  check('price string → number', added.price === 91000, String(added.price))
  check('size_range expanded', added.sizes.join(',') === '38,39,40', added.sizes.join(','))
  check('size range label kept', added.sizeRange === '38 - 40', added.sizeRange)
  check('available_colors split', added.colors.join('|') === 'Rose|Black', added.colors.join('|'))
  check('colourway mirrors the list', added.colorway === 'Rose, Black', added.colorway)
  check('in_stock true', added.inStock === true)
  check('sold out parsed', added.soldOut.join(',') === '39', added.soldOut.join(','))
  check('absolute image kept', added.image === 'https://cdn.example.com/heels/rose.jpg', added.image)
  check('is_new honoured', added.isNew === true)
  check('rating coerced', added.rating === 4.6, String(added.rating))
  check('no compare_at → null', added.compareAt === null, String(added.compareAt))

  const seeded = loaded.products[1]
  check('blank image falls back to built-in photo', seeded.image === '/shoes/new-balance.jpg', seeded.image)
  check('compare_at kept', seeded.compareAt === 175000, String(seeded.compareAt))
  check('details array kept', seeded.details.length === 0)

  const soldOut = loaded.products[2]
  check('comma size list parsed', soldOut.sizes.join(',') === '38,39,41', soldOut.sizes.join(','))
  check(
    'in_stock false → every size sold out',
    soldOut.inStock === false && soldOut.soldOut.join(',') === '38,39,41',
    soldOut.soldOut.join(','),
  )
  check('single colour', soldOut.colors.join('|') === 'Black', soldOut.colors.join('|'))

  const cached = await catalogue.loadCatalogue()
  check(
    'second load is cached',
    cached.products.length === 3 && requestedCount === 1,
    String(requestedCount),
  )

  /* 2b. A table that predates `is_active` / `sort_order`: the filtered query
         400s and the catalogue retries with a plain select. */
  requestedCount = 0
  globalThis.fetch = async (url) => {
    requestedCount += 1
    requestedUrl = String(url)
    if (requestedCount === 1) {
      return new Response(
        JSON.stringify({ message: 'column products.is_active does not exist', code: '42703' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const retried = await catalogue.loadCatalogue({ force: true })
  check(
    'missing column → plain retry',
    retried.source === 'cloud' && requestedCount === 2,
    String(requestedCount),
  )
  check('plain retry keeps the rows', retried.products.length === 3, String(retried.products.length))

  /* 2c. Size / colour parsers accept what a shop owner actually types. */
  check(
    'parser · EU prefix + en dash',
    catalogue.parseSizeRange('EU 39–45').join(',') === '39,40,41,42,43,44,45',
    catalogue.parseSizeRange('EU 39–45').join(','),
  )
  check(
    'parser · mixed range + single',
    catalogue.parseSizeRange('38-40, 44').join(',') === '38,39,40,44',
    catalogue.parseSizeRange('38-40, 44').join(','),
  )
  check('parser · unparseable → []', catalogue.parseSizeRange('one size').length === 0)
  check(
    'parser · colours deduped',
    catalogue.parseColorList('Black / black, Navy').join('|') === 'Black|Navy',
    catalogue.parseColorList('Black / black, Navy').join('|'),
  )
  check('cart line ids include the colour', catalogue.cartLineId('mid-heel-01', 39, 'Black') === 'mid-heel-01-39-Black')
  check('cart line ids work without a colour', catalogue.cartLineId('mid-heel-01', 39) === 'mid-heel-01-39')

  /* 3. Request failure: fall back to the built-in catalogue, keep the error. */
  const realWarn = console.warn
  console.warn = () => {}
  globalThis.fetch = async () => {
    throw new Error('network down')
  }
  let failed
  try {
    failed = await catalogue.loadCatalogue({ force: true })
  } finally {
    console.warn = realWarn
  }

  check('failure → built-in catalogue', failed.source === 'local', failed.source)
  check(
    'failure → built-in products',
    failed.products.length === BUILT_IN_COUNT,
    String(failed.products.length),
  )
  check('failure recorded', /network down/.test(String(failed.error)), String(failed.error))
  check('getCatalogueProduct still resolves', Boolean(catalogue.getCatalogueProduct('new-balance-530')))

  check(
    'rows without id/name are dropped',
    catalogue.rowToProduct({ name: 'No id' }) === null &&
      catalogue.rowToProduct({ id: 'no-name' }) === null,
  )
} finally {
  await cloudVite.close()
}

/* 4. Key handling: the publishable key wins over the legacy anon key, the
      legacy name still works on its own, and a secret key is refused. */
const loadConfig = async (vars) => {
  clearSupabaseEnv()
  Object.assign(process.env, vars)
  const server = await createServer(viteOptions)
  try {
    return await server.ssrLoadModule('/src/lib/config.js')
  } finally {
    await server.close()
  }
}

const bothKeys = await loadConfig({
  VITE_SUPABASE_URL: 'https://demo.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo',
  VITE_SUPABASE_ANON_KEY: 'anon-demo',
})
check('publishable key wins over anon', bothKeys.SUPABASE_KEY === 'sb_publishable_demo', bothKeys.SUPABASE_KEY)
check('legacy export mirrors the key', bothKeys.SUPABASE_ANON_KEY === 'sb_publishable_demo')
check('project ref parsed from URL', bothKeys.SUPABASE_PROJECT_REF === 'demo', bothKeys.SUPABASE_PROJECT_REF)

const legacyOnly = await loadConfig({
  VITE_SUPABASE_URL: 'https://demo.supabase.co/',
  VITE_SUPABASE_ANON_KEY: 'anon-demo',
})
check(
  'legacy anon key still works',
  legacyOnly.isSupabaseConfigured && legacyOnly.SUPABASE_KEY === 'anon-demo',
  legacyOnly.SUPABASE_KEY,
)
check('trailing slash trimmed', legacyOnly.SUPABASE_URL === 'https://demo.supabase.co', legacyOnly.SUPABASE_URL)

const b64url = (payload) => Buffer.from(JSON.stringify(payload)).toString('base64url')
const serviceJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${b64url({ role: 'service_role' })}.c2ln`

const realError = console.error
console.error = () => {}
let secretKeyConfig
let serviceJwtConfig
try {
  secretKeyConfig = await loadConfig({
    VITE_SUPABASE_URL: 'https://demo.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_should-never-ship',
  })
  serviceJwtConfig = await loadConfig({
    VITE_SUPABASE_URL: 'https://demo.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: serviceJwt,
  })
} finally {
  console.error = realError
}

check(
  'sb_secret_ key refused',
  secretKeyConfig.SUPABASE_KEY === '' && secretKeyConfig.isSupabaseConfigured === false,
  secretKeyConfig.SUPABASE_KEY,
)
check(
  'service_role JWT refused',
  serviceJwtConfig.SUPABASE_KEY === '' && serviceJwtConfig.isSupabaseConfigured === false,
  serviceJwtConfig.SUPABASE_KEY,
)

clearSupabaseEnv()
process.exit(failures ? 1 : 0)
