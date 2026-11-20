import { useEffect, useRef } from 'react'
import { getCatalogueProduct } from '../lib/catalogue'
import { useI18n } from '../lib/i18n'
import { formatTZS, INSTAGRAM_HANDLE } from '../lib/store'
import { ArrowRightIcon, CloseIcon, InstagramIcon } from './Icons'

function formatPostDate(value) {
  if (!value) return ''
  const numeric = typeof value === 'number' ? value : Number(value)
  const date =
    Number.isFinite(numeric) && numeric > 0
      ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
      : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * On-site Instagram lightbox: full photo, caption and a "Shop Similar Styles"
 * action that hands the customer back to the store — never to instagram.com.
 */
export default function InstagramLightbox({ posts, index, onClose, onNavigate, onShopSimilar }) {
  const { t } = useI18n()
  const closeRef = useRef(null)
  const post = posts[index]

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') onNavigate(1)
      if (event.key === 'ArrowLeft') onNavigate(-1)
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, onNavigate])

  if (!post) return null

  const product = post.productId ? getCatalogueProduct(post.productId) : null
  const hasMultiple = posts.length > 1
  const dateLabel = formatPostDate(post.date)

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-obsidian/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${t('lightbox.seenOn')} · ${INSTAGRAM_HANDLE}`}
        className="relative flex max-h-[94dvh] w-full max-w-5xl animate-scale-in flex-col overflow-hidden rounded-t-[28px] border border-white/15 bg-shell shadow-2xl sm:max-h-[88vh] sm:rounded-[28px] md:flex-row"
      >
        <div className="relative shrink-0 bg-obsidian md:w-[56%]">
          <img
            src={post.image}
            alt={post.alt}
            className="h-[40dvh] w-full object-contain sm:h-[46dvh] md:h-full md:min-h-[420px]"
          />

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={() => onNavigate(-1)}
                aria-label={t('lightbox.prev')}
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-obsidian/75 text-white backdrop-blur transition hover:bg-charcoal"
              >
                <ArrowRightIcon className="h-4 w-4 rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate(1)}
                aria-label={t('lightbox.next')}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-obsidian/75 text-white backdrop-blur transition hover:bg-charcoal"
              >
                <ArrowRightIcon className="h-4 w-4" />
              </button>
              <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-obsidian/75 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur">
                {index + 1} / {posts.length}
              </span>
            </>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 sm:p-6 md:p-7">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-plum text-shell">
                <InstagramIcon className="h-4 w-4" />
              </span>
              <span className="leading-tight">
                <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-plum-soft">
                  {t('lightbox.seenOn')}
                </span>
                <span className="block font-display text-sm font-bold text-plum">
                  {INSTAGRAM_HANDLE}
                </span>
              </span>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t('lightbox.close')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blushline bg-panel text-plum transition hover:border-plum/40 hover:bg-shell-soft"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>


          <p className="mt-5 whitespace-pre-line text-[13px] leading-relaxed text-plum">
            {post.caption || t('lightbox.defaultCaption')}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-chat text-[9px] font-semibold uppercase tracking-[0.16em] text-plum-soft">
            {dateLabel && <span>{dateLabel}</span>}
            {post.likes ? (
              <span>{t('lightbox.likes', { count: post.likes.toLocaleString('en-US') })}</span>
            ) : null}
            {post.comments ? (
              <span>{t('lightbox.comments', { count: post.comments.toLocaleString('en-US') })}</span>
            ) : null}
            <span className="rounded-full border border-blushline px-2 py-0.5">
              {post.isCurated ? t('lightbox.curated') : t('lightbox.live')}
            </span>
          </div>

          {product && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-blushline bg-panel p-2.5">
              <span className="h-14 w-12 shrink-0 overflow-hidden rounded-xl bg-shell-soft">
                <img src={product.image} alt="" className="h-full w-full object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[13px] font-bold text-plum">
                  {product.name}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-plum-soft">
                  {product.colorway}
                </span>
              </span>
              <span className="shrink-0 text-[11px] font-bold text-plum">
                {formatTZS(product.price)}
              </span>
            </div>
          )}

          <div className="mt-auto pt-6">
            <button
              type="button"
              onClick={() => onShopSimilar(post)}
              className="btn-plum group w-full"
            >
              {t('lightbox.shopSimilar')}
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <p className="mt-3 text-center text-[10px] leading-relaxed text-plum-soft">
              {t('lightbox.note')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
