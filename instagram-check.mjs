// Dev-only smoke test for the Instagram -> catalogue importer (no network):
// caption parsing, photo cropping, id generation, the full pipeline against a
// stubbed Instagram + Supabase, and the endpoint's secret gate.
//   node instagram-check.mjs     (or: npm run check:instagram)
import { readFileSync } from 'node:fs'
import { Jimp } from 'jimp'
import {
  extractName,
  extractDescription,
  inferCategory,
  joinThousands,
  parseCaption,
  parsePrice,
  parseSizes,
  slugify,
} from './netlify/lib/instagram/caption.mjs'
import {
  PHOTO_HEIGHT,
  PHOTO_WIDTH,
  buildProductRow,
  cropToProductPhoto,
  pickImageUrl,
  productIdFor,
  readConfig,
  runInstagramSync,
} from './netlify/lib/instagram/sync.mjs'
import handler, { config as functionConfig } from './netlify/functions/instagram-sync.mjs'

let failures = 0
const check = (label, condition, detail = '') => {
  if (condition) console.log(`OK    ${label}`)
  else {
    failures += 1
    console.log(`FAIL  ${label} ${detail}`)
  }
}
const eq = (label, actual, expected) =>
  check(label, JSON.stringify(actual) === JSON.stringify(expected), `got ${JSON.stringify(actual)}`)

/* ------------------------------------------------------------------ */
/* 1. Caption parsing                                                  */
/* ------------------------------------------------------------------ */

const fullCaption = [
  "Name: Air Force 1 '07",
  'TZS 145,000',
  'Colour: White / Grey',
  'Sizes: 38, 39, 40',
  '- Leather upper',
  '- Gum sole',
  '#sneakers #fariifeet',
].join('\n')

const full = parseCaption(fullCaption)
eq('labelled name wins', full.name, "Air Force 1 '07")
eq('price from "TZS 145,000"', full.price, 145000)
eq('hashtag category', full.category, 'sneakers')
eq('sizes list', full.sizes, [38, 39, 40])
eq('colour label', full.colorway, 'White / Grey')
eq('bullet details', full.details, ['Leather upper', 'Gum sole'])
eq('bullets become the description', full.description, 'Leather upper · Gum sole')
eq('blurb is capped copy', full.blurb, 'Leather upper · Gum sole')

const priceCases = [
  ['TZS 145,000', 145000],
  ['Tsh 145000', 145000],
  ['TSHS. 85,000', 85000],
  ['Shs 120,000', 120000],
  ['145,000/=', 145000],
  ['/=145,000', 145000],
  ['Bei: 98,000', 98000],
  ['Price: TZS85,000', 85000],
  ['@ 55,000', 55000],
  ['145K', 145000],
  ['45,000', 45000],
  ['1,250,000 shs', 1250000],
]
for (const [caption, expected] of priceCases) {
  const actual = parsePrice(caption)
  check(`price "${caption}" -> ${expected}`, actual === expected, `got ${actual}`)
}

const noPriceCases = [
  'size 40',
  'Call 0754 623 904',
  'TZS 999',
  'no numbers here',
  '+255 754 623 904',
  'Sizes: 38, 39, 40',
]
for (const caption of noPriceCases) {
  const actual = parsePrice(caption)
  check(`no price in "${caption}"`, actual === null, `got ${actual}`)
}

eq('joinThousands 1,250,000', joinThousands('1,250,000'), '1250000')
eq('joinThousands leaves size lists alone', joinThousands('38, 39, 40'), '38, 39, 40')

eq('slides beat the brand', inferCategory('Nike slides'), 'slides')
eq('heels win on the first mention', inferCategory('Heels and sandals'), 'heels')
eq('block heel sandals -> heels', inferCategory('Block heel sandals'), 'heels')
eq('bare caption -> sneakers', inferCategory('plain caption'), 'sneakers')
eq('loafers -> sneakers', inferCategory('Cobalt driving loafer TZS 75,000'), 'sneakers')
eq('ballet flats -> heels', inferCategory('Mesh buckle ballet flats'), 'heels')

eq('size list', parseSizes('Sizes: 38, 39, 40'), [38, 39, 40])
eq('size range', parseSizes('size 38-42'), [38, 39, 40, 41, 42])
eq('swahili size label', parseSizes('saizi 40'), [40])
eq('no sizes -> full adult run', parseSizes('nothing here').length, 10)
eq('kids sizes', parseCaption('Kids school shoes TZS 45,000').sizes[0], 27)

eq('hashtag-only line skipped', extractName('#sneakers\nTZS 145,000\nNike slides @ 65k'), 'Nike slides')
eq('price stripped from name', extractName('Carousel heels TZS 88,000 size 38-40'), 'Carousel heels')
eq('cta stripped from name', extractName('New Balance 530 Silver Storm — now in store'), 'New Balance 530 Silver Storm')
eq('label word stripped', extractName('Kids school shoes from 45000/='), 'Kids school shoes')
eq('no name in a price-only caption', extractName('145,000/= only'), '')
check('name capped at 120', extractName('A'.repeat(200)).length <= 120)
eq('slug is url safe', slugify("Air Force 1 '07"), 'air-force-1-07')
eq('slug keeps ampersands readable', slugify('Cobalt & Rose'), 'cobalt-and-rose')
eq('description keeps real sentences', extractDescription('Just in from Kariakoo. Genuine leather.\nTZS 85,000'), 'Just in from Kariakoo. Genuine leather.')

/* ------------------------------------------------------------------ */
/* 2. Photo cropping (real JPEG, no network)                           */
/* ------------------------------------------------------------------ */

const sourcePhoto = readFileSync('public/shoes/new-balance.jpg')
const cropped = await cropToProductPhoto(sourcePhoto)
const croppedImage = await Jimp.read(cropped)

check(
  `crop -> ${PHOTO_WIDTH}x${PHOTO_HEIGHT}`,
  croppedImage.bitmap.width === PHOTO_WIDTH && croppedImage.bitmap.height === PHOTO_HEIGHT,
  `${croppedImage.bitmap.width}x${croppedImage.bitmap.height}`,
)
check('crop -> JPEG', cropped[0] === 0xff && cropped[1] === 0xd8)
check(
  'crop -> 4:5 aspect',
  Math.abs(croppedImage.bitmap.width / croppedImage.bitmap.height - 4 / 5) < 0.001,
)
check('crop stays web-sized', cropped.length < 600 * 1024, `${Math.round(cropped.length / 1024)} kB`)

/* ------------------------------------------------------------------ */
/* 3. Ids                                                              */
/* ------------------------------------------------------------------ */

eq('id from the name', productIdFor('Air Force 1', '1789000000001', new Set()), 'air-force-1')
eq(
  'id collision gets a media suffix',
  productIdFor('Air Force 1', '1789000000001', new Set(['air-force-1'])),
  'air-force-1-000001',
)
eq(
  'same input -> same id',
  productIdFor('Air Force 1', '1789000000001', new Set()),
  productIdFor('Air Force 1', '1789000000001', new Set()),
)
eq('empty name falls back', productIdFor('', '1789000099', new Set()), 'insta-drop')

/* ------------------------------------------------------------------ */
/* 4. Configuration                                                    */
/* ------------------------------------------------------------------ */

const emptyConfig = readConfig({})
check('empty env -> not configured', emptyConfig.isConfigured === false)
eq('empty env -> what is missing', emptyConfig.missing, [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'INSTAGRAM_ACCESS_TOKEN',
])

const baseEnv = {
  SUPABASE_URL: 'https://demo.supabase.co/',
  SUPABASE_SERVICE_ROLE_KEY: 'service-test-key',
  INSTAGRAM_ACCESS_TOKEN: 'ig-test-token',
}
const readyConfig = readConfig(baseEnv)
check('full env -> configured', readyConfig.isConfigured === true, JSON.stringify(readyConfig.missing))
eq('trailing slash trimmed', readyConfig.supabaseUrl, 'https://demo.supabase.co')
eq('default graph host', readyConfig.base, 'https://graph.instagram.com')
eq('default user id', readyConfig.userId, 'me')
eq('default bucket', readyConfig.bucket, 'product-images')
eq('default limit', readyConfig.limit, 6)
check('publish by default', readyConfig.autoPublish === true)
check('no secret by default', readyConfig.secret === '')

const tuned = readConfig({
  ...baseEnv,
  VITE_SUPABASE_URL: '',
  INSTAGRAM_SYNC_LIMIT: '3',
  INSTAGRAM_AUTO_PUBLISH: 'false',
  INSTAGRAM_GRAPH_BASE: 'https://graph.facebook.com/v21.0/',
  INSTAGRAM_USER_ID: '17841400000000000',
})
eq('limit from env', tuned.limit, 3)
check('auto publish off', tuned.autoPublish === false)
eq('facebook graph host trimmed', tuned.base, 'https://graph.facebook.com/v21.0')
eq('business account id', tuned.userId, '17841400000000000')

eq('limit clamped to 10', readConfig({ ...baseEnv, INSTAGRAM_SYNC_LIMIT: '99' }).limit, 10)
eq('limit clamped to 1', readConfig({ ...baseEnv, INSTAGRAM_SYNC_LIMIT: '0' }).limit, 1)
eq(
  'VITE_SUPABASE_URL is accepted as a fallback',
  readConfig({ VITE_SUPABASE_URL: 'https://fallback.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })
    .supabaseUrl,
  'https://fallback.supabase.co',
)

/* ------------------------------------------------------------------ */
/* 5. Photo picking                                                    */
/* ------------------------------------------------------------------ */

eq('plain image', pickImageUrl({ media_type: 'IMAGE', media_url: 'a.jpg' }), 'a.jpg')
eq(
  'video uses its thumbnail',
  pickImageUrl({ media_type: 'VIDEO', media_url: 'v.mp4', thumbnail_url: 'v.jpg' }),
  'v.jpg',
)
eq(
  'carousel skips video children',
  pickImageUrl({
    media_type: 'CAROUSEL_ALBUM',
    children: { data: [{ media_type: 'VIDEO', thumbnail_url: 'skip.jpg' }, { media_type: 'IMAGE', media_url: 'one.jpg' }] },
  }),
  'one.jpg',
)
eq('no photo at all', pickImageUrl({ media_type: 'IMAGE' }), '')

const rowDraft = buildProductRow({
  id: 'demo-shoe',
  parsed: parseCaption(fullCaption),
  post: { id: '1789', permalink: 'https://instagram.com/p/x', timestamp: '2026-11-01T09:00:00+0000' },
  photoUrl: 'https://demo.supabase.co/storage/v1/object/public/product-images/instagram/demo-shoe.jpg',
  config: readyConfig,
})
eq('row source', rowDraft.source, 'instagram')
check('row is new + published', rowDraft.is_new === true && rowDraft.is_active === true)
eq('row is traced to the post', rowDraft.instagram_media_id, '1789')
eq('row badge', rowDraft.badge, 'Instagram')
eq('row never invents a sale price', rowDraft.compare_at, null)
eq('row has no sold-out sizes', rowDraft.sold_out, [])

/* ------------------------------------------------------------------ */
/* 6. Full run against a stubbed Instagram + Supabase                  */
/* ------------------------------------------------------------------ */

const silent = { log: () => {}, warn: () => {}, error: () => {} }
const SUPABASE = 'https://demo.supabase.co'
const env = {
  SUPABASE_URL: SUPABASE,
  SUPABASE_SERVICE_ROLE_KEY: 'service-test-key',
  INSTAGRAM_ACCESS_TOKEN: 'ig-test-token',
  INSTAGRAM_USER_ID: '17841400000000000',
  INSTAGRAM_SYNC_SECRET: 'super-secret',
  INSTAGRAM_SYNC_LIMIT: '5',
}

const posts = [
  {
    id: '17890000000000001',
    caption: "Name: Silver Runner 530\nTZS 145,000\nColour: Silver\nSizes: 38, 39, 40\n- Mesh upper\n#sneakers",
    media_type: 'IMAGE',
    media_url: 'https://scontent.cdninstagram.com/one.jpg',
    permalink: 'https://www.instagram.com/p/AAA/',
    timestamp: '2026-11-01T09:00:00+0000',
  },
  {
    id: '17890000000000002',
    caption: 'Restocked again TZS 99,000',
    media_type: 'IMAGE',
    media_url: 'https://scontent.cdninstagram.com/two.jpg',
  },
  {
    id: '17890000000000003',
    caption: 'Just vibes, no price in this one',
    media_type: 'IMAGE',
    media_url: 'https://scontent.cdninstagram.com/three.jpg',
  },
  {
    id: '17890000000000004',
    caption: 'Crystal butterfly slides TZS 55,000\n#slides',
    media_type: 'VIDEO',
    thumbnail_url: 'https://scontent.cdninstagram.com/four.jpg',
  },
  {
    id: '17890000000000005',
    caption: 'Carousel heels TZS 88,000 size 38-40',
    media_type: 'CAROUSEL_ALBUM',
    children: {
      data: [
        { media_type: 'VIDEO', thumbnail_url: 'https://scontent.cdninstagram.com/skip.jpg' },
        { media_type: 'IMAGE', media_url: 'https://scontent.cdninstagram.com/five.jpg' },
      ],
    },
  },
]

const existingRows = [
  { id: 'new-balance-530', name: 'New Balance 530', instagram_media_id: '17890000000000002' },
]

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
  arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(body)).buffer,
})
const binaryResponse = (buffer, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => ({}),
  text: async () => '',
  arrayBuffer: async () =>
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
})

const photoBytes = readFileSync('public/shoes/new-balance.jpg')
let calls = []

globalThis.fetch = async (input, init = {}) => {
  const url = String(input)
  const method = String(init.method || 'GET').toUpperCase()
  calls.push({ url, method, headers: init.headers || {}, body: init.body })

  if (url.includes('/media?')) return jsonResponse({ data: posts })
  if (url.includes('cdninstagram')) return binaryResponse(photoBytes)
  if (url.includes('/storage/v1/object/')) return jsonResponse({ Key: 'ok' })
  if (url.includes('/rest/v1/instagram_sync_runs')) {
    return method === 'POST' ? jsonResponse([{ id: 41 }], 201) : jsonResponse([], 204)
  }
  if (url.includes('/rest/v1/products?select=')) return jsonResponse(existingRows)
  if (url.includes('/rest/v1/products?on_conflict=')) {
    return jsonResponse(JSON.parse(String(init.body)), 201)
  }
  return jsonResponse({ error: 'unexpected request' }, 404)
}

const run = await runInstagramSync({ env, trigger: 'test', log: silent })

check('run ok', run.ok === true, run.error)
eq('posts seen', run.postsSeen, 5)
eq('imported', run.imported, 3)
eq('skipped', run.skipped, 2)
eq('failed', run.failed, 0)
eq('run status', run.status, 'ok')
eq('run id from the log table', run.runId, 41)

const graphCall = calls.find((call) => call.url.includes('/media?'))
check('graph endpoint used', graphCall.url.startsWith('https://graph.instagram.com/17841400000000000/media?'))
check('graph fields requested', graphCall.url.includes('fields=') && graphCall.url.includes('children'))
check('graph limit sent', graphCall.url.includes('limit=5'))
check('graph token sent', graphCall.url.includes('access_token=ig-test-token'))
eq('graph is called once', calls.filter((call) => call.url.includes('/media?')).length, 1)

const skipReasons = run.results.map((result) => result.reason)
check('already imported post skipped', skipReasons.includes('already in the catalogue'), skipReasons.join(' | '))
check('caption without price skipped', skipReasons.includes('no TZS price in the caption'), skipReasons.join(' | '))

const uploads = calls.filter((call) => call.url.includes('/storage/v1/object/'))
eq('one upload per imported post', uploads.length, 3)
check(
  'upload path per product',
  uploads.some((call) => call.url.endsWith('/storage/v1/object/product-images/instagram/silver-runner-530.jpg')),
  uploads.map((call) => call.url).join(' | '),
)
check('upload is a JPEG', uploads.every((call) => call.headers['Content-Type'] === 'image/jpeg'))
check('upload is allowed to overwrite', uploads.every((call) => call.headers['x-upsert'] === 'true'))
check(
  'upload uses the service role',
  uploads.every((call) => call.headers.Authorization === 'Bearer service-test-key'),
)
check(
  'uploaded bytes are the cropped JPEG',
  uploads.every((call) => Buffer.isBuffer(call.body) && call.body[0] === 0xff && call.body[1] === 0xd8),
)

const insertCall = calls.find((call) => call.url.includes('/rest/v1/products?on_conflict='))
check('insert asks for on_conflict=id', Boolean(insertCall) && insertCall.url.endsWith('on_conflict=id'))
check(
  'insert never overwrites',
  String(insertCall.headers.Prefer).includes('ignore-duplicates'),
  insertCall.headers.Prefer,
)
const inserted = JSON.parse(String(insertCall.body))
eq('three rows appended', inserted.length, 3)
eq('row ids', inserted.map((row) => row.id), ['silver-runner-530', 'crystal-butterfly-slides', 'carousel-heels'])
eq('first row price', inserted[0].price, 145000)
eq('first row category', inserted[0].category, 'sneakers')
eq('first row sizes', inserted[0].sizes, [38, 39, 40])
eq('video row is a slide', inserted[1].category, 'slides')
eq('carousel range sizes', inserted[2].sizes, [38, 39, 40])
eq(
  'first row image is the public storage URL',
  inserted[0].image_url,
  `${SUPABASE}/storage/v1/object/public/product-images/instagram/silver-runner-530.jpg`,
)
eq('first row keeps the permalink', inserted[0].instagram_permalink, 'https://www.instagram.com/p/AAA/')
eq('first row keeps the timestamp', inserted[0].instagram_posted_at, '2026-11-01T09:00:00+0000')
check('rows are live in the shop', inserted.every((row) => row.is_active === true && row.is_new === true))
check('rows sort above the hand-entered shoes', inserted.every((row) => row.sort_order === 5))

const logPost = calls.find((call) => call.url.includes('/instagram_sync_runs') && call.method === 'POST')
const logPatch = calls.find((call) => call.url.includes('/instagram_sync_runs') && call.method === 'PATCH')
check('run opened in the log', Boolean(logPost) && JSON.parse(String(logPost.body)).trigger === 'test')
check('run closed in the log', Boolean(logPatch) && logPatch.url.includes('id=eq.41'))
const patchBody = JSON.parse(String(logPatch.body))
eq('log status', patchBody.status, 'ok')
eq('log imported count', patchBody.imported, 3)
eq('log skipped count', patchBody.skipped, 2)
eq('log posts seen', patchBody.posts_seen, 5)

/* Dry run: reads Instagram, writes nothing. */
calls = []
const dry = await runInstagramSync({ env, trigger: 'test', dryRun: true, log: silent })
eq('dry run imports nothing', dry.imported, 3)
check('dry run only reads', calls.every((call) => call.method === 'GET'), calls.map((c) => c.method).join(','))
eq('dry run opens no log', dry.runId, null)
check('dry run reports intent', dry.results.some((result) => result.status === 'would-import'))

/* A bad token must be reported, not thrown. */
calls = []
globalThis.fetch = async (input) => {
  if (String(input).includes('/media?')) {
    return jsonResponse({ error: { message: 'Session has expired', code: 190 } }, 400)
  }
  return jsonResponse([])
}
const expired = await runInstagramSync({ env, trigger: 'test', log: silent })
check('expired token -> failed run', expired.ok === false)
check(
  'expired token hint',
  String(expired.error).includes('generate a fresh long-lived token'),
  expired.error,
)

/* ------------------------------------------------------------------ */
/* 7. The HTTP endpoint (secret gate)                                  */
/* ------------------------------------------------------------------ */

Object.assign(process.env, {
  SUPABASE_URL: SUPABASE,
  SUPABASE_SERVICE_ROLE_KEY: 'service-test-key',
  INSTAGRAM_ACCESS_TOKEN: 'ig-test-token',
  INSTAGRAM_USER_ID: '17841400000000000',
  INSTAGRAM_SYNC_SECRET: 'super-secret',
})
delete process.env.VITE_SUPABASE_URL

globalThis.fetch = async (input, init = {}) => {
  const url = String(input)
  const method = String(init.method || 'GET').toUpperCase()
  if (url.includes('/media?')) return jsonResponse({ data: [] })
  if (url.includes('/rest/v1/products?select=')) return jsonResponse([])
  if (url.includes('/rest/v1/instagram_sync_runs')) {
    return method === 'POST' ? jsonResponse([{ id: 7 }], 201) : jsonResponse([], 204)
  }
  return jsonResponse({}, 404)
}

const endpoint = 'https://shop.example/api/instagram-sync'
const callHandler = ({ url = endpoint, method = 'POST', headers = {} } = {}) =>
  handler(new Request(url, { method, headers }))

eq('endpoint is mounted at /api/instagram-sync', functionConfig.path, '/api/instagram-sync')

const unauthorised = await callHandler()
eq('no secret -> 401', unauthorised.status, 401)

const wrongSecret = await callHandler({ headers: { 'x-sync-secret': 'nope' } })
eq('wrong secret -> 401', wrongSecret.status, 401)

const wrongMethod = await callHandler({ method: 'PUT', headers: { 'x-sync-secret': 'super-secret' } })
eq('PUT -> 405', wrongMethod.status, 405)

const authorised = await callHandler({ headers: { 'x-sync-secret': 'super-secret' } })
eq('authorised -> 200', authorised.status, 200)
const payload = await authorised.json()
check('authorised body', payload.ok === true && payload.trigger === 'http', JSON.stringify(payload).slice(0, 120))
eq('authorised run count', payload.postsSeen, 0)
check('response never leaks the service key', !JSON.stringify(payload).includes('service-test-key'))
check('response never leaks the instagram token', !JSON.stringify(payload).includes('ig-test-token'))

const viaQuery = await callHandler({ url: `${endpoint}?secret=super-secret&dryRun=1` })
eq('secret via query string', viaQuery.status, 200)
check('dryRun honoured', (await viaQuery.json()).dryRun === true)

const savedSecret = process.env.INSTAGRAM_SYNC_SECRET
delete process.env.INSTAGRAM_SYNC_SECRET
const closed = await callHandler({ headers: { 'x-sync-secret': 'super-secret' } })
eq('no configured secret -> 503', closed.status, 503)
process.env.INSTAGRAM_SYNC_SECRET = savedSecret

const savedToken = process.env.INSTAGRAM_ACCESS_TOKEN
delete process.env.INSTAGRAM_ACCESS_TOKEN
const incomplete = await callHandler({ headers: { 'x-sync-secret': 'super-secret' } })
eq('missing token -> 503', incomplete.status, 503)
const incompleteBody = await incomplete.json()
check(
  '503 lists what is missing',
  Array.isArray(incompleteBody.missing) && incompleteBody.missing.includes('INSTAGRAM_ACCESS_TOKEN'),
  JSON.stringify(incompleteBody.missing),
)
process.env.INSTAGRAM_ACCESS_TOKEN = savedToken

console.log(
  failures ? `\n${failures} check(s) failed.` : '\nAll Instagram importer checks passed.',
)
process.exit(failures ? 1 : 0)




