import ProductCard from './ProductCard'
import CategoryPills from './CategoryPills'
import { SearchIcon } from './Icons'
import { useI18n } from '../lib/i18n'

export default function ProductGrid({
  products,
  category,
  onCategoryChange,
  onSelect,
  onAddToCart,
  query,
  onReset,
}) {
  const { t } = useI18n()

  const headlines = {
    all: { title: t('grid.headlines.all.title'), note: t('grid.headlines.all.note') },
    sneakers: { title: t('grid.headlines.sneakers.title'), note: t('grid.headlines.sneakers.note') },
    heels: { title: t('grid.headlines.heels.title'), note: t('grid.headlines.heels.note') },
    slides: { title: t('grid.headlines.slides.title'), note: t('grid.headlines.slides.note') },
    new: { title: t('grid.headlines.new.title'), note: t('grid.headlines.new.note') },
  }

  const headline = headlines[category] || headlines.all
  const isFiltered = category !== 'all' || query.trim().length > 0

  return (
    <section id="shop" className="relative z-10 scroll-mt-40 py-14 sm:py-20">
      <div className="container-page">
        <div className="flex flex-col gap-8 border-b border-blushline pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow-plum flex items-center gap-2">
              <span className="h-px w-8 bg-plum/25" />
              {t('grid.eyebrow')}
            </p>
            <h2 className="mt-3 font-display text-[clamp(2rem,5vw,3.2rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-plum">
              {headline.title}
              <span className="text-blush">.</span>
            </h2>
            <p className="mt-2 max-w-md text-sm text-plum-soft">{headline.note}</p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <CategoryPills
              category={category}
              onChange={onCategoryChange}
              className="max-w-full lg:justify-end"
            />
            <div className="flex items-center gap-3 font-chat text-[10px] font-semibold uppercase tracking-[0.18em] text-plum-soft">
              <span>
                {t('grid.count', { count: String(products.length).padStart(2, '0') })}
                {query.trim() ? t('grid.forQuery', { query: query.trim() }) : ''}
              </span>
              {isFiltered && (
                <button
                  type="button"
                  onClick={onReset}
                  className="rounded-full border border-blushline bg-panel px-2.5 py-1 text-[9px] text-plum transition hover:border-plum/40 hover:bg-shell-soft"
                >
                  {t('grid.reset')}
                </button>
              )}
            </div>
          </div>
        </div>

        {products.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-x-3.5 gap-y-9 sm:gap-x-5 sm:gap-y-12 md:grid-cols-3 xl:grid-cols-4">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onSelect={onSelect}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-blushline bg-panel/70 px-6 py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-blushline bg-shell-soft text-plum-soft">
              <SearchIcon className="h-6 w-6" />
            </span>
            <h3 className="mt-5 font-display text-2xl font-bold text-plum">
              {t('grid.emptyTitle')}
            </h3>
            <p className="mt-2 max-w-sm text-sm text-plum-soft">{t('grid.emptyCopy')}</p>
            <button type="button" onClick={onReset} className="btn-plum mt-6">
              {t('grid.emptyCta')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
