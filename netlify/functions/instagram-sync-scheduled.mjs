/**
 * Daily Instagram -> catalogue import.
 *
 * Netlify scheduled functions have a 30 second budget, so this run is capped at
 * four posts. Anything larger belongs on the HTTP endpoint or the local CLI
 * (`npm run instagram:sync`), which get a 60 second window.
 *
 * The cron expression lives in `netlify.toml`:
 *   [functions."instagram-sync-scheduled"]
 *     schedule = "0 4 * * *"      # 04:00 UTC = 07:00 in Dar es Salaam
 *
 * Scheduled functions are only invoked for published deploys; use the
 * "Run now" button on Netlify -> Functions to test one immediately.
 */
import { readConfig, runInstagramSync } from '../lib/instagram/sync.mjs'

const SCHEDULE_LIMIT = 4

export default async () => {
  const settings = readConfig()

  if (!settings.isConfigured) {
    console.warn(
      `[instagram-sync] scheduled run skipped — missing ${settings.missing.join(', ')}.`,
    )
    return new Response(JSON.stringify({ ok: false, skipped: 'not configured' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const result = await runInstagramSync({ trigger: 'schedule', limit: SCHEDULE_LIMIT })

  return new Response(
    JSON.stringify({
      ok: result.ok,
      status: result.status,
      postsSeen: result.postsSeen,
      imported: result.imported,
      skipped: result.skipped,
      failed: result.failed,
      error: result.error || null,
    }),
    { status: result.ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } },
  )
}
