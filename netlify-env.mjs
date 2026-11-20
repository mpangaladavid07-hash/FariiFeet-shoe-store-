// Push the local `.env` values to the Netlify site so the deployed build matches
// this machine. Vite inlines `VITE_*` at build time, so a new VITE_ADMIN_PIN only
// reaches the live site after the variable is set here AND the site is rebuilt.
//   node netlify-env.mjs                      dry run: site + variables that would be pushed
//   node netlify-env.mjs --apply              create/update the variables
//   node netlify-env.mjs --apply --deploy     ...and trigger a production build
//   node netlify-env.mjs --site fariifeet     pick a site by name/url fragment
//
// Auth: NETLIFY_AUTH_TOKEN (Netlify -> User settings -> Applications -> personal
// access token). The token is only read from the environment, never written out.
import { readFileSync } from 'node:fs'

const API = 'https://api.netlify.com/api/v1'
const PUSHED_KEYS = [
  'VITE_WHATSAPP_NUMBER',
  'VITE_ADMIN_PIN',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_FEEDFUSION_URL',
  'VITE_FEEDFUSION_KEY',
]

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const deploy = args.includes('--deploy')
const siteArg = args.includes('--site') ? args[args.indexOf('--site') + 1] : ''

const fail = (message) => {
  console.error(`\n${message}\n`)
  process.exit(1)
}

const token = String(process.env.NETLIFY_AUTH_TOKEN || '').trim()
if (!token) {
  fail(
    'NETLIFY_AUTH_TOKEN is not set.\n' +
      '  PowerShell:  $env:NETLIFY_AUTH_TOKEN = Read-Host -AsSecureString | ConvertFrom-SecureString -AsPlainText\n' +
      '  bash:        export NETLIFY_AUTH_TOKEN=...\n' +
      'Create one at Netlify -> User settings -> Applications -> Personal access tokens.',
  )
}

/** Local `.env` is the source of truth for what gets pushed. */
const readEnv = () => {
  let raw = ''
  try {
    raw = readFileSync('.env', 'utf8')
  } catch {
    fail('No .env file found — copy .env.example to .env and fill it in first.')
  }
  const values = {}
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!match) continue
    values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2').trim()
  }
  return values
}


const api = async (path, init = {}) => {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (response.status === 401) {
    fail('Netlify rejected the token (401). Create a fresh personal access token.')
  }
  return { ok: response.ok, status: response.status, body }
}

const env = readEnv()
const wanted = PUSHED_KEYS.filter((key) => String(env[key] || '').length > 0).map((key) => ({
  key,
  value: env[key],
}))

if (!wanted.length) fail('No VITE_* values found in .env — nothing to push.')
if (!env.VITE_ADMIN_PIN) fail('VITE_ADMIN_PIN is empty in .env — refusing to deploy a PIN-less build.')

console.log('\nFrom .env (values masked):')
for (const { key, value } of wanted) {
  console.log(`  ${key.padEnd(26)} set (len ${value.length})`)
}
if (!/^\d{4,12}$/.test(env.VITE_ADMIN_PIN)) {
  console.log('  ! VITE_ADMIN_PIN is not 4-12 digits — it will work, but it is unusual.')
}

const sites = await api('/sites')
if (!sites.ok || !Array.isArray(sites.body)) fail(`Could not list sites (HTTP ${sites.status}).`)

const haystack = (site) => `${site.name} ${site.url} ${site.ssl_url}`.toLowerCase()
const matches = siteArg
  ? sites.body.filter((site) => haystack(site).includes(siteArg.toLowerCase()))
  : sites.body
if (!matches.length) {
  fail(
    `No Netlify site matched "${siteArg}". Available:\n` +
      sites.body.map((site) => `  ${site.name}  (${site.url})`).join('\n'),
  )
}
if (matches.length > 1 && !siteArg) {
  fail(
    'Several sites on this account — re-run with --site <fragment>:\n' +
      matches.map((site) => `  ${site.name}  (${site.url})`).join('\n'),
  )
}

const site = matches[0]
const account = site.account_slug || site.account_id
console.log(`\nSite:    ${site.name}  (${site.url})\nAccount: ${account}`)

if (!apply) {
  console.log('\nDry run — nothing changed. Re-run with --apply to write these variables.')
  process.exit(0)
}

const existing = await api(`/accounts/${account}/env?site_id=${site.id}`)
const current = new Map(
  (Array.isArray(existing.body) ? existing.body : []).map((entry) => [entry.key, entry]),
)

for (const { key, value } of wanted) {
  const payload = {
    key,
    is_secret: false, // must stay readable so Vite can inline it into the bundle
    scopes: ['builds'],
    values: [{ value, context: 'all' }],
  }
  const found = current.get(key)
  const result = found
    ? await api(`/accounts/${account}/env/${encodeURIComponent(key)}?site_id=${site.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    : await api(`/accounts/${account}/env?site_id=${site.id}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
  console.log(`  ${result.ok ? 'OK  ' : 'FAIL'} ${found ? 'updated' : 'created'} ${key}`)
  if (!result.ok) console.log(`       HTTP ${result.status} ${JSON.stringify(result.body)}`)
}

const after = await api(`/accounts/${account}/env?site_id=${site.id}`)
const stored = new Map(
  (Array.isArray(after.body) ? after.body : []).map((entry) => [entry.key, entry]),
)
console.log('\nStored on Netlify (values masked):')
for (const { key } of wanted) {
  const entry = stored.get(key)
  const length = entry?.values?.find((item) => item.context === 'all')?.value?.length ?? 0
  console.log(`  ${length ? 'OK  ' : 'MISS'} ${key.padEnd(26)} ${length ? `len ${length}` : 'not readable'}`)
}

if (deploy) {
  const build = await api(`/sites/${site.id}/builds`, { method: 'POST' })
  console.log(
    build.ok
      ? `\nDeploy triggered (build ${build.body?.id || 'queued'}) — Vite re-inlines the new values in this build.`
      : `\nCould not trigger a build (HTTP ${build.status}). Use "Trigger deploy" in the dashboard.`,
  )
} else {
  console.log('\nSet, but the live bundle is unchanged until you redeploy (--deploy or the dashboard).')
}

console.log('Then open /admin: "Supabase connected" means the keys reached the build.')
