import { useCallback, useEffect, useRef, useState } from 'react'
import { fallbackPosts, fetchInstagramFeed, isFeedConfigured } from './feedfusion'

/**
 * Keeps the on-site Instagram gallery in sync with the shop's account.
 *
 * Refresh triggers:
 *  - every 3 minutes while the tab is visible (new posts appear on their own)
 *  - when the customer returns to the tab (focus / visibilitychange)
 *  - when the connection comes back online
 *  - the manual "Refresh feed" button
 *
 * The last successful payload is cached in localStorage so repeat visits paint
 * instantly, and the shop photography is used whenever the feed is not
 * configured or unreachable.
 */

const REFRESH_INTERVAL_MS = 3 * 60 * 1000
const MIN_REFRESH_GAP_MS = 45 * 1000
const CACHE_KEY = 'fariifeet-instagram-cache-v2'

function readCache() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.posts) || !parsed.posts.length) return null
    return parsed
  } catch (error) {
    return null
  }
}

function writeCache(posts, savedAt) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ posts, savedAt }))
  } catch (error) {
    /* storage full/off — live posts still render for this session */
  }
}

export default function useInstagramFeed() {
  const cached = useRef(readCache())
  const [posts, setPosts] = useState(() => cached.current?.posts || [])
  const [lastUpdated, setLastUpdated] = useState(() => cached.current?.savedAt || null)
  const [refreshing, setRefreshing] = useState(false)
  const [status, setStatus] = useState(() => {
    if (!isFeedConfigured) return 'fallback'
    return cached.current ? 'live' : 'loading'
  })

  const hasPostsRef = useRef(Boolean(cached.current?.posts?.length))
  const lastAttemptRef = useRef(0)
  const inFlightRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(async ({ manual = false } = {}) => {
    if (!isFeedConfigured) {
      setStatus('fallback')
      return
    }
    if (inFlightRef.current) return

    inFlightRef.current = true
    lastAttemptRef.current = Date.now()
    if (manual) setRefreshing(true)

    const next = await fetchInstagramFeed({ limit: 8 })
    if (!mountedRef.current) return

    if (next.length) {
      const stamp = Date.now()
      hasPostsRef.current = true
      setPosts(next)
      setLastUpdated(stamp)
      setStatus('live')
      writeCache(next, stamp)
    } else {
      setStatus(hasPostsRef.current ? 'stale' : 'fallback')
    }

    setRefreshing(false)
    inFlightRef.current = false
  }, [])

  // Initial fetch (fresh cache is still revalidated in the background).
  useEffect(() => {
    if (!isFeedConfigured) return undefined
    load()
    return undefined
  }, [load])

  // Poll while the tab is visible.
  useEffect(() => {
    if (!isFeedConfigured) return undefined

    const tick = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastAttemptRef.current < MIN_REFRESH_GAP_MS) return
      load()
    }

    const intervalId = window.setInterval(tick, REFRESH_INTERVAL_MS)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }
    const handleOnline = () => load()
    const handleFocus = () => tick()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('online', handleOnline)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('online', handleOnline)
    }
  }, [load])

  const refresh = useCallback(() => load({ manual: true }), [load])

  return {
    posts: posts.length ? posts : fallbackPosts,
    isLive: posts.length > 0 && status === 'live',
    isCurated: posts.length === 0,
    status,
    lastUpdated,
    refreshing,
    refresh,
    isConfigured: isFeedConfigured,
  }
}
