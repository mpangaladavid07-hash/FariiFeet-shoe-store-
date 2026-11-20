import { useCallback, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { INSTAGRAM_HANDLE } from '../lib/store'
import useInstagramFeed from '../lib/useInstagramFeed'
import { InstagramIcon, RefreshIcon, SparkleIcon } from './Icons'
import InstagramLightbox from './InstagramLightbox'

/**
 * "Seen on Instagram @fariifeet" — live FeedFusion feed with a graceful
 * fallback to the shop's own photography, opened in an on-site lightbox.
 */
export default function InstagramGallery({ onShopSimilar }) {
  const { t } = useI18n()
  const { posts, isLive, isConfigured, lastUpdated, refreshing, refresh } = useInstagramFeed()
  const [activeIndex, setActiveIndex] = useState(null)

  const closeLightbox = useCallback(() => setActiveIndex(null), [])

  const navigateLightbox = useCallback(
    (delta) => {
      setActiveIndex((current) => {
        if (current === null) return current
        return (current + delta + posts.length) % posts.length
      })
    },
    [posts.length],
  )

  const handleShopSimilar = useCallback(
    (post) => {
      setActiveIndex(null)
      onShopSimilar(post)
    },
    [onShopSimilar],
  )

  const updatedLabel = (() => {
    if (!lastUpdated) return t('instagram.updatedJustNow')
    const minutes = Math.max(0, Math.floor((Date.now() - lastUpdated) / 60000))
    if (minutes < 1) return t('instagram.updatedJustNow')
    if (minutes < 60) return t('instagram.updatedMinutes', { count: minutes })
    return t('instagram.updatedHours', { count: Math.floor(minutes / 60) })
  })()

  return (
    <section
      id="instagram"
      aria-labelledby="instagram-title"
      className="relative scroll-mt-40 border-b border-blushline bg-panel/70 py-16 sm:py-20"
    >
      <div className="container-page">
        <div className="flex flex-col gap-6 border-b border-blushline pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow-plum flex items-center gap-2">
              <span className="h-px w-8 bg-plum/25" />
              {t('instagram.eyebrow')}
            </p>
            <h2
              id="instagram-title"
              className="mt-3 font-display text-[clamp(1.85rem,4.4vw,3rem)] font-extrabold leading-[1.03] tracking-[-0.035em] text-plum"
            >
              {t('instagram.title')}
              <span className="block text-plum-soft">{INSTAGRAM_HANDLE}</span>
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-plum-soft">
              {t('instagram.copy')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="chip-light">
              <span
                className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald' : 'bg-plum/40'}`}
                aria-hidden="true"
              />
              {isLive ? t('instagram.liveFeed') : t('instagram.boutique')}
            </span>
            <span className="chip-light">
              <InstagramIcon className="h-3.5 w-3.5" />
              {INSTAGRAM_HANDLE}
            </span>
            {isConfigured && (
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-full border border-blushline bg-panel px-3 py-1.5 font-chat text-[9px] font-semibold uppercase tracking-[0.16em] text-plum-soft transition hover:border-plum/40 hover:text-plum disabled:opacity-60"
              >
                <RefreshIcon className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? t('instagram.refreshing') : t('instagram.refresh')}
              </button>
            )}
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          {posts.map((post, index) => (
            <button
              key={post.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={t('instagram.openPhoto', {
                index: index + 1,
                caption: post.caption || post.alt,
              })}
              className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-blushline bg-shell-soft text-left"
            >
              <img
                src={post.image}
                alt={post.alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-obsidian/85 via-obsidian/10 to-transparent" />
              <span className="absolute inset-x-2.5 bottom-2.5 line-clamp-2 text-[10px] font-semibold leading-snug text-white/90">
                {post.caption || t('instagram.viewPost')}
              </span>
              <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-obsidian/50 text-white backdrop-blur">
                <InstagramIcon className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 font-chat text-[10px] font-semibold uppercase tracking-[0.18em] text-plum-soft">
          <div className="space-y-1">
            <p className="flex items-center gap-2">
              <SparkleIcon className="h-3.5 w-3.5" />
              {t('instagram.tapHint')}
            </p>
            <p className="text-plum-soft/70">
              {isConfigured ? t('instagram.autoNote') : t('instagram.offlineNote')}
            </p>
          </div>
          <p>
            {isLive
              ? t('instagram.countLive', {
                  count: String(posts.length).padStart(2, '0'),
                  time: updatedLabel,
                })
              : t('instagram.countCurated')}
          </p>
        </div>

      </div>

      {activeIndex !== null && (
        <InstagramLightbox
          posts={posts}
          index={activeIndex}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
          onShopSimilar={handleShopSimilar}
        />
      )}
    </section>
  )
}
