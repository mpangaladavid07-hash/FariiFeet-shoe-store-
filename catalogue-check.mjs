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

/* 1. No VITE_SUPABASE_* keys: the built-in catalogue must be served as-is. */
const offlineVite = await createServer(viteOptions)
try {
  const catalogue = await offlineVite.ssrLoadModule('/src/lib/catalogue.js')
  const first = await catalogue.loadCatalogue()

  check('no keys → built-in catalogue', first.source === 'local', first.source)
  check('built-in product count', first.products.length === 21, String(first.products.length))
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
process.env.VITE_SUPABASE_ANON_KEY = 'anon-test-key'

const rows = [
  {
    id: 'dashboard-only-shoe',
    name: 'Dashboard Only Heel',
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
]

let requestedUrl = ''
let requestedHeaders = {}

globalThis.fetch = async (url, options = {}) => {
  requestedUrl = String(url)
  requestedHeaders = options.headers || {}
  return {
    ok: true,
    status: 200,
    json: async () => rows,
  }
}

const cloudVite = await createServer(viteOptions)
try {
  const catalogue = await cloudVite.ssrLoadModule('/src/lib/catalogue.js')
  const loaded = await catalogue.loadCatalogue()

  check('keys present → cloud source', loaded.source === 'cloud', loaded.source)
  check('cloud row count', loaded.products.length === 2, String(loaded.products.length))
  check(
    'request path + filters',
    requestedUrl ===
      'https://demo-project.supabase.co/rest/v1/products?select=*&is_active=eq.true&order=sort_order.asc,name.asc',
    requestedUrl,
  )
  check(
    'anon key sent',
    requestedHeaders.apikey === 'anon-test-key' &&
      requestedHeaders.Authorization === 'Bearer anon-test-key',
  )

  const added = loaded.products[0]
  check('new row visible by id', catalogue.getCatalogueProduct('dashboard-only-shoe') === added)
  check('price string → number', added.price === 91000, String(added.price))
  check('int[] string parsed', added.sizes.join(',') === '38,39,40', added.sizes.join(','))
  check('sold out parsed', added.soldOut.join(',') === '39', added.soldOut.join(','))
  check('absolute image kept', added.image === 'https://cdn.example.com/heels/rose.jpg', added.image)
  check('is_new honoured', added.isNew === true)
  check('rating coerced', added.rating === 4.6, String(added.rating))
  check('no compare_at → null', added.compareAt === null, String(added.compareAt))

  const seeded = loaded.products[1]
  check('blank image falls back to built-in photo', seeded.image === '/shoes/new-balance.jpg', seeded.image)
  check('compare_at kept', seeded.compareAt === 175000, String(seeded.compareAt))
  check('details array kept', seeded.details.length === 0)

  const noName = await catalogue.loadCatalogue()
  check('second load is cached', noName.products.length === 2)

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
  check('failure → 21 products', failed.products.length === 21, String(failed.products.length))
  check('failure recorded', failed.error === 'network down', String(failed.error))
  check('getCatalogueProduct still resolves', Boolean(catalogue.getCatalogueProduct('new-balance-530')))

  check(
    'rows without id/name are dropped',
    catalogue.rowToProduct({ name: 'No id' }) === null &&
      catalogue.rowToProduct({ id: 'no-name' }) === null,
  )
} finally {
  await cloudVite.close()
}

process.exit(failures ? 1 : 0)
