/**
 * POST/GET /api/instagram-sync — run the Instagram -> catalogue import on demand.
 *
 * This is the only public door to the importer, and it is locked:
 *   - it refuses to do anything unless INSTAGRAM_SYNC_SECRET is set;
 *   - callers must send that secret in the `x-sync-secret` header (or `?secret=`).
 *
 *   curl -X POST https://<site>/api/instagram-sync \
 *        -H "x-sync-secret: $INSTAGRAM_SYNC_SECRET"
 *   curl "https://<site>/api/instagram-sync?dryRun=1&limit=3" -H "x-sync-secret: …"
 *
 * Scheduled runs do not go through this endpoint (see instagram-sync-scheduled.mjs),
 * so the secret never needs to live anywhere except the environment.
 */
import { createHash, timingSafeEqual } from 'node:crypto'
import { readConfig, runInstagramSync } from '../lib/instagram/sync.mjs'

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}

const respond = (body, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: JSON_HEADERS })

// Constant-time comparison; hashing first keeps the buffer lengths equal.
const digest = (value) => createHash('sha256').update(String(value)).digest()
const safeEqual = (a, b) => timingSafeEqual(digest(a), digest(b))

export default async (req) => {
  const url = new URL(req.url)

  if (req.method !== 'GET' && req.method !== 'POST') {
    return respond({ ok: false, error: 'Use GET or POST.' }, 405)
  }

  const settings = readConfig()

  if (!settings.secret) {
    return respond(
      {
        ok: false,
        error:
          'INSTAGRAM_SYNC_SECRET is not set, so this endpoint stays closed. ' +
          'Set it in Netlify -> Site configuration -> Environment variables, then redeploy.',
      },
      503,
    )
  }

  const provided = req.headers.get('x-sync-secret') || url.searchParams.get('secret') || ''
  if (!provided || !safeEqual(provided, settings.secret)) {
    return respond({ ok: false, error: 'Unauthorized — send the secret in the x-sync-secret header.' }, 401)
  }

  if (!settings.isConfigured) {
    return respond(
      {
        ok: false,
        error: `Missing ${settings.missing.join(', ')}.`,
        missing: settings.missing,
      },
      503,
    )
  }

  const dryRunParam = url.searchParams.get('dryRun') || url.searchParams.get('dry_run') || ''
  const limitParam = url.searchParams.get('limit')
  const result = await runInstagramSync({
    trigger: 'http',
    dryRun: /^(1|true|yes)$/i.test(dryRunParam),
    limit: limitParam === null ? undefined : Number(limitParam),
  })

  return respond(result, result.ok ? 200 : 502)
}

// Served at https://<site>/api/instagram-sync as well as the default
// /.netlify/functions/instagram-sync path.
export const config = { path: '/api/instagram-sync' }
