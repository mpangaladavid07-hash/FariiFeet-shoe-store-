import { useState } from 'react'
import { availableSizeCount, getSizeOptions, isSizeAvailable } from '../data/products'
import { useI18n } from '../lib/i18n'
import { formatTZS } from '../lib/store'
import { ArrowUpRightIcon, BagIcon, CloseIcon, StarIcon } from './Icons'

export default function ProductCard({ product, onSelect, onAddToCart, index = 0 }) {
  const { t } = useI18n()
  const [picking, setPicking] = useState(false)
  const sizesInStock = availableSizeCount(product)
  const hasSomeStock = sizesInStock > 0
  const sizes = getSizeOptions(product)

  return (
    <article
      className="group animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <button
        type="button"
        onClick={() => onSelect(product)}
        aria-label={t('card.view', { name: product.name, price: formatTZS(product.price) })}
        className="block w-full text-left"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] border border-blushline bg-shell-soft shadow-soft">
          <img
            src={product.image}
            alt={t('card.alt', { name: product.name, colorway: product.colorway })}
            loading={index < 4 ? 'eager' : 'lazy'}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian/85 via-obsidian/5 to-obsidian/10" />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1.5 p-2.5 sm:p-3">
            <span
              className={`rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.16em] backdrop-blur-md sm:text-[9px] ${
                product.isNew
                  ? 'bg-blush text-obsidian'
                  : 'border border-white/15 bg-obsidian/50 text-rose'
              }`}
            >
              {product.isNew ? t('common.newDrop') : product.badge}
            </span>
            <span className="glass flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-rose sm:text-[9px]">
              <span
                className={`h-1 w-1 rounded-full ${hasSomeStock ? 'bg-emerald' : 'bg-mocha'}`}
              />
              <span className="hidden sm:inline">
                {hasSomeStock ? t('common.inStock') : t('common.soldOut')}
              </span>
              <span className="sm:hidden">{t('card.sizes', { count: sizesInStock })}</span>
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1.5 p-2.5 sm:p-3">
            <span className="rounded-full border border-white/20 bg-obsidian/45 px-2.5 py-1.5 text-[10px] font-bold tracking-wide text-rose backdrop-blur-md sm:text-xs">
              {formatTZS(product.price)}
            </span>
            <span className="flex items-center gap-1 rounded-full border border-white/15 bg-obsidian/55 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-rose backdrop-blur-md transition-all duration-300 group-hover:border-blush group-hover:bg-blush group-hover:text-obsidian sm:gap-1.5 sm:px-3">
              {t('card.selectSize')}
              <ArrowUpRightIcon className="h-3 w-3" />
            </span>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelect(product)}
        aria-label={t('card.view', { name: product.name, price: formatTZS(product.price) })}
        className="mt-3 block w-full px-0.5 text-left"
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-plum/60">
                {t(`category.${product.category}`)}
                {product.badge === 'Kids' && ` · ${t('card.kids')}`}
              </p>
              <h3 className="mt-1 truncate font-display text-[13px] font-bold leading-snug text-plum sm:text-[15px]">
                {product.name}
              </h3>
            </div>
            <ArrowUpRightIcon className="mt-1 hidden h-4 w-4 shrink-0 text-plum/30 transition group-hover:text-plum sm:block" />
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-plum-soft sm:text-[11px]">
            <StarIcon className="h-3 w-3 text-plum" />
            <span className="font-semibold text-plum">{product.rating}</span>
            <span className="text-plum/25">/</span>
            <span className="truncate">{product.colorway}</span>
          </div>
          {product.compareAt ? (
            <p className="mt-1 text-[10px] text-plum-soft">
              <span className="mr-1.5 line-through">{formatTZS(product.compareAt)}</span>
              <span className="font-semibold text-emerald">
                {t('common.save', { amount: formatTZS(product.compareAt - product.price) })}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-[10px] text-plum-soft/80">
              {isSizeAvailable(product, product.sizes[0])
                ? t('card.readyToShip')
                : t('card.limitedStock')}
            </p>
          )}
        </div>
      </button>

      {onAddToCart && (
        <div className="mt-2.5">
          {!picking ? (
            <button
              type="button"
              onClick={() => setPicking(true)}
              aria-label={t('card.quickAdd', { name: product.name })}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-blushline bg-panel text-[9px] font-bold uppercase tracking-[0.14em] text-plum transition hover:border-plum/40 hover:bg-shell-soft sm:text-[10px]"
            >
              <BagIcon className="h-3.5 w-3.5" />
              {t('card.addToBag')}
            </button>
          ) : (
            <div className="rounded-2xl border border-blushline bg-panel p-2">
              <div className="flex items-center justify-between gap-1 pb-1.5 pl-1">
                <span className="font-chat text-[9px] font-semibold uppercase tracking-[0.1em] text-plum-soft">
                  {t('card.chooseSize')}
                </span>
                <button
                  type="button"
                  onClick={() => setPicking(false)}
                  aria-label={t('common.cancel')}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-plum-soft transition hover:bg-shell-soft hover:text-plum"
                >
                  <CloseIcon className="h-3 w-3" />
                </button>
              </div>

              <div className="grid grid-cols-5 gap-1">
                {sizes.map((size) => {
                  const soldOut = !isSizeAvailable(product, size)
                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={soldOut}
                      onClick={() => {
                        setPicking(false)
                        onAddToCart(product, size, 1)
                      }}
                      aria-label={
                        soldOut
                          ? t('modal.soldOutSize', { size })
                          : t('modal.orderSize', { size })
                      }
                      className={`flex h-7 items-center justify-center rounded-lg border font-chat text-[10px] font-semibold transition ${
                        soldOut
                          ? 'cursor-not-allowed border-blushline bg-shell-soft text-plum-soft/40 line-through'
                          : 'border-blushline bg-shell-soft text-plum hover:border-plum hover:bg-plum hover:text-shell'
                      }`}
                    >
                      {size}
                    </button>
                  )
                })}
              </div>

              <p className="pl-1 pt-1.5 text-[9px] leading-snug text-plum-soft">
                {t('card.quickNote')}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
