// Run the Instagram -> catalogue import from this machine, no Netlify CLI needed.
//
//   npm run instagram:sync              import new posts (up to 6)
//   npm run instagram:sync:dry          show what would be imported (writes nothing)
//   node run-instagram-sync.mjs --limit=3
//
// Reads every key from `.env` — including the server-only ones
// (SUPABASE_SERVICE_ROLE_KEY, INSTAGRAM_ACCESS_TOKEN, …), which Vite never
// exposes to the browser. The same values go into Netlify's function scope.
import { loadEnv } from 'vite'
import { readConfig, runInstagramSync } from './netlify/lib/instagram/sync.mjs'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run') || args.includes('--dry')
const limitArg = args.find((arg) => arg.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined

// loadEnv with an empty prefix returns every key, not just VITE_*.
const fileEnv = loadEnv('development', process.cwd(), '')
for (const [key, value] of Object.entries(fileEnv)) {
  if (!process.env[key]) process.env[key] = value
}

const mask = (value) => (value ? `${value.slice(0, 4)}… (len ${value.length})` : '(empty)')
const settings = readConfig()

console.log('\nFariiFeet — Instagram -> catalogue')
console.log(`  mode             ${dryRun ? 'dry run — nothing is written' : 'live import'}`)
console.log(`  supabase         ${settings.supabaseUrl || '(missing)'}`)
console.log(`  service role key ${mask(settings.serviceKey)}`)
console.log(`  graph endpoint   ${settings.base}/${settings.userId}/media`)
console.log(`  access token     ${mask(settings.token)}`)
console.log(`  storage bucket   ${settings.bucket}`)
console.log(`  is_active        ${settings.autoPublish ? 'true (visible in the shop)' : 'false (drafts)'}`)
console.log(`  posts per run    ${limit || settings.limit}`)

if (!settings.isConfigured) {
  console.error(
    `\nMissing ${settings.missing.join(', ')} in .env.\n` +
      'See README -> "Instagram -> catalogue" for where each value comes from.',
  )
  process.exit(1)
}

const summary = await runInstagramSync({ trigger: 'cli', limit, dryRun })

if (summary.results.length) {
  console.log('')
  for (const result of summary.results) {
    const details = result.name ? `${result.name} — TZS ${result.price}` : result.reason || ''
    console.log(`  ${result.status.padEnd(13)} ${result.mediaId}  ${details}`)
  }
}

console.log(
  `\n${summary.status} — ${summary.postsSeen} post(s) seen, ${summary.imported} imported, ` +
    `${summary.skipped} skipped, ${summary.failed} failed`,
)
if (summary.error) console.error(`\n${summary.error}`)
console.log(
  dryRun
    ? '\nDry run: no photo was uploaded and no product was added.'
    : '\nOpen /admin -> "Shop catalogue" (or the Supabase Table Editor) to see the new rows.',
)

process.exit(summary.ok ? 0 : 1)
