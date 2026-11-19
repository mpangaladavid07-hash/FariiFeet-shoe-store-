import { useEffect, useRef, useState } from 'react'
import { availableSizeCount, isSizeAvailable } from '../data/products'
import { formatTZS, singleItemOrderMessage, whatsappLink } from '../lib/store'
import { useI18n } from '../lib/i18n'
import {
  BagIcon,
  CheckIcon,
  CloseIcon,
  MinusIcon,
  PinIcon,
  PlusIcon,
  ShieldIcon,
  StarIcon,
  TruckIcon,
  WhatsAppIcon,
} from './Icons'

export default function ProductModal({ product, onClose, onAddToCart }) {
  const { t, lang } = useI18n()
  const [size, setSize] = useState(null)
  const [qty, setQty] = useState(1)
  const [error, setError] = useState('')
  const closeRef = useRef(null)

  useEffect(() => {
    setSize(null)
    setQty(1)
    setError('')
    closeRef.current?.focus()
  }, [product?.id])

  useEffect(() => {
    if (!product) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
    }
  }, [product, onClose])

  if (!product) return null

  const inStockCount = availableSizeCount(product)
  const total = product.price * qty
  const whatsappMessage = size
    ? singleItemOrderMessage(product, size, qty, { lang })
    : t('modal.noSizeMessage', {
        name: product.name,
        colorway: product.colorway,
        qty,
        total: formatTZS(total),
      })

  const handleAdd = () => {
    if (!size) {
      setError(t('modal.errorSize'))
      return
    }
    setError('')
    onAddToCart(product, size, qty)
  }

  const sizeRange = t('modal.sizeRange', {
    from: product.sizes[0],
    to: product.sizes[product.sizes.length - 1],
  })

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center sm:items-center sm:p-5">
      <div
        className="absolute inset-0 bg-obsidian/70 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        className="relative flex h-[100dvh] w-full max-w-6xl animate-fade-up flex-col overflow-hidden border border-blushline bg-shell text-plum shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-[28px] md:flex-row"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t('modal.close')}
          className="absolute right-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-obsidian/45 text-white backdrop-blur-md transition hover:border-blush hover:text-blush sm:right-4 sm:top-4"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <div className="relative h-[34vh] min-h-[220px] shrink-0 overflow-hidden bg-obsidian md:h-auto md:min-h-[560px] md:w-[46%]">
          <img
            src={product.image}
            alt={t('card.alt', { name: product.name, colorway: product.colorway })}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/10 to-obsidian/25" />

          <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2 pr-14">
            {product.isNew && (
              <span className="rounded-full bg-blush px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-obsidian">
                {t('modal.newDrop')}
              </span>
            )}
            <span className="rounded-full border border-white/20 bg-obsidian/45 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              {t(`category.${product.category}`)}
            </span>
          </div>

          <div className="absolute inset-x-4 bottom-4 hidden items-end justify-between gap-4 md:flex">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-blush">
                @fariifeet · Dar es Salaam
              </p>
              <p className="mt-2 font-display text-2xl font-extrabold leading-tight text-white">
                {product.colorway}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-white/20 bg-obsidian/50 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md">
              <StarIcon className="h-3 w-3 text-blush" />
              {product.rating}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-5 pb-8 sm:p-7 lg:p-9">
          <div className="pr-10">
            <p className="font-chat text-[10px] font-semibold uppercase tracking-[0.24em] text-[#B3687F] dark:text-blush">
              {product.badge} · {t('modal.inStock')}
            </p>
            <h2
              id="product-modal-title"
              className="mt-2 font-display text-[clamp(1.6rem,3.4vw,2.4rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-plum"
            >
              {product.name}
            </h2>
            <p className="mt-2 text-sm text-plum-soft">{product.colorway}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-display text-2xl font-extrabold tracking-tight text-plum">
              {formatTZS(product.price)}
            </span>
            {product.compareAt && (
              <>
                <span className="text-sm text-plum-soft line-through">
                  {formatTZS(product.compareAt)}
                </span>
                <span className="rounded-full bg-emerald/12 px-2 py-1 font-chat text-[10px] font-bold uppercase tracking-[0.12em] text-emerald dark:bg-emerald/20">
                  {t('modal.save', { amount: formatTZS(product.compareAt - product.price) })}
                </span>
              </>
            )}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-plum-soft">{product.description}</p>

          <ul className="mt-4 grid gap-2">
            {product.details.map((detail) => (
              <li key={detail} className="flex items-start gap-2 text-xs text-plum/85">
                <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B3687F] dark:text-blush" />
                {detail}
              </li>
            ))}
          </ul>

          <div className="mt-7 border-t border-blushline pt-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="font-chat text-[11px] font-bold uppercase tracking-[0.2em] text-plum">
                  {t('modal.selectSize')}
                </h3>
                <p className="mt-1 text-[11px] text-plum-soft">
                  {t('modal.sizesInStock', {
                    available: inStockCount,
                    total: product.sizes.length,
                  })}
                </p>
              </div>
              <span className="rounded border border-blushline px-2 py-1 font-chat text-[9px] uppercase tracking-[0.14em] text-plum-soft">
                {sizeRange}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {product.sizes.map((option) => {
                const soldOut = !isSizeAvailable(product, option)
                const active = option === size
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={soldOut}
                    onClick={() => {
                      setSize(option)
                      setError('')
                    }}
                    aria-pressed={active}
                    aria-label={
                      soldOut
                        ? t('modal.soldOutSize', { size: option })
                        : t('modal.orderSize', { size: option })
                    }
                    className={`relative flex h-11 items-center justify-center rounded-xl border font-chat text-sm font-semibold transition-all duration-200 ${
                      soldOut
                        ? 'cursor-not-allowed border-blushline bg-shell-soft text-plum-soft/40 line-through'
                        : active
                          ? 'border-plum bg-plum text-shell shadow-soft'
                          : 'border-blushline bg-panel text-plum hover:border-plum/40 hover:bg-shell-soft'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            {error && (
              <p className="mt-3 rounded-xl border border-[#D79BAC] bg-blush/30 px-3 py-2 text-[11px] font-medium text-plum">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-stretch gap-2.5">
              <div className="flex h-12 items-center rounded-full border border-blushline bg-shell-soft px-1">
                <button
                  type="button"
                  onClick={() => setQty((value) => Math.max(1, value - 1))}
                  disabled={qty <= 1}
                  aria-label={t('modal.decreaseQty')}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-plum transition hover:bg-panel disabled:opacity-30"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="w-6 text-center font-chat text-sm font-bold tabular-nums text-plum">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((value) => Math.min(10, value + 1))}
                  disabled={qty >= 10}
                  aria-label={t('modal.increaseQty')}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-plum transition hover:bg-panel disabled:opacity-30"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                className="btn-plum h-12 flex-1 gap-2 !px-4"
              >
                <BagIcon className="h-4 w-4" />
                <span>{t('modal.addToBag')}</span>
                <span className="hidden font-chat text-[10px] font-bold opacity-70 sm:inline">
                  {formatTZS(total)}
                </span>
              </button>
            </div>

            <a
              href={whatsappLink(whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              className="btn-line mt-2.5 w-full"
            >
              <WhatsAppIcon className="h-4 w-4 text-emerald" />
              {size ? t('modal.orderSize', { size }) : t('modal.ask')}
            </a>

            <p className="mt-2.5 text-center text-[10px] leading-relaxed text-plum-soft">
              {t('modal.checkoutNote')}
            </p>
          </div>

          <div className="mt-6 space-y-3 rounded-2xl border border-blushline bg-panel/70 p-4">
            {[
              {
                icon: TruckIcon,
                title: t('modal.delivery1Title'),
                note: t('modal.delivery1Note'),
              },
              {
                icon: PinIcon,
                title: t('modal.delivery2Title'),
                note: t('modal.delivery2Note'),
              },
              {
                icon: ShieldIcon,
                title: t('modal.delivery3Title'),
                note: t('modal.delivery3Note'),
              },
            ].map(({ icon: Icon, title, note }) => (
              <div key={title} className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#B3687F] dark:text-blush" />
                <div>
                  <p className="text-xs font-semibold text-plum">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-plum-soft">{note}</p>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  )
}
