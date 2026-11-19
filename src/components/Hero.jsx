import { useRef } from 'react'
import { featuredProduct, getProductById } from '../data/products'
import { formatTZS, whatsappLink } from '../lib/store'
import { useHeroScroll } from '../hooks/useHeroScroll'
import { useI18n } from '../lib/i18n'
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  PinIcon,
  SparkleIcon,
  StarIcon,
  TruckIcon,
  WhatsAppIcon,
} from './Icons'

/**
 * Hero stage — off-white with a blush bloom, a wide New Balance showcase and a
 * pink accent rail. The showcase uses the boutique's own photograph; the crop
 * is tuned so both pairs in the frame stay visible at every breakpoint.
 */
const SHOWCASE_IMAGE = '/shoes/new-balance.jpg'
const RAIL_PRODUCT_IDS = ['tory-burch-kitten', 'mid-heel-01', 'butterfly-slide']

const splitName = (name) => String(name || '').split(' — ')[0]

export default function Hero({ onShopNow, onShopNewDrops, onViewProduct }) {
  const sectionRef = useRef(null)
  useHeroScroll(sectionRef)
  const { t } = useI18n()

  const product = featuredProduct
  const handleShopNow = onShopNow || onShopNewDrops
  const railProducts = RAIL_PRODUCT_IDS.map((id) => getProductById(id)).filter(Boolean)

  const highlights = [
    { icon: TruckIcon, title: t('hero.highlightSameDay'), note: t('hero.highlightSameDayNote') },
    { icon: StarIcon, title: t('hero.highlightRating'), note: t('hero.highlightRatingNote') },
    { icon: SparkleIcon, title: t('hero.highlightSizes'), note: t('hero.highlightSizesNote') },
  ]

  const viewLabel = (item) =>
    t('hero.viewProduct', { name: splitName(item.name), price: formatTZS(item.price) })

  return (
    <section
      id="top"
      ref={sectionRef}
      className="hero-section relative isolate z-0 overflow-hidden border-b border-blushline bg-shell text-plum"
    >
      {/* Off-white stage: blush bloom, hairline grid, pink light */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_82%_-10%,#FBEEF2_0%,#FAF6F7_46%,#F5EDEF_100%)] dark:bg-[radial-gradient(120%_90%_at_82%_-10%,#261D26_0%,#141014_54%,#0F0C10_100%)]" />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(214,175,186,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(214,175,186,0.12) 1px, transparent 1px)',
            backgroundSize: '104px 104px',
          }}
        />
        <div className="hero-glow-shift absolute -right-24 -top-28 h-[30rem] w-[30rem] rounded-full bg-blush/45 blur-[120px] dark:bg-blush/15" />
        <div className="absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-[#F6D5DF]/60 blur-[110px] dark:bg-[#6B3D4C]/25" />
        <div className="absolute bottom-0 left-1/2 h-40 w-[70%] -translate-x-1/2 rounded-full bg-white/50 blur-[90px] dark:bg-white/[0.04]" />
      </div>

      <div className="container-page relative">
        <div className="grid items-end gap-9 pt-10 pb-8 sm:pt-12 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10 lg:pt-14 lg:pb-10">
          {/* Copy */}
          <div className="hero-copy-shift relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blush px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-obsidian">
                <SparkleIcon className="h-3.5 w-3.5" />
                {t('hero.badgeNew')}
              </span>
              <span className="chip-light">
                <PinIcon className="h-3.5 w-3.5 text-[#B37286]" />
                {t('hero.badgeCity')}
              </span>
            </div>

            <h1 className="mt-6 font-display text-[clamp(2.7rem,6.2vw,4.85rem)] font-extrabold leading-[0.92] tracking-[-0.045em] text-plum">
              {t('hero.titleLead')}
              <span className="relative mt-2 block w-fit">
                {t('hero.titleAccent')}
                <span className="text-[#C4788F]">.</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 300 14"
                  fill="none"
                  className="absolute -bottom-2 left-0 h-2.5 w-[86%] text-[#D79BAC]"
                >
                  <path
                    d="M2 10C64 3 168 2 298 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="mt-7 max-w-lg text-[15px] leading-relaxed text-plum-soft">
              <span className="font-semibold text-plum">{t('hero.copyBold')}</span>{' '}
              {t('hero.copy')}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleShopNow}
                className="btn-plum group h-12 justify-center px-7 text-sm"
              >
                {t('hero.shopNow')}
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <a
                href={whatsappLink(t('wa.heroHelp'))}
                target="_blank"
                rel="noreferrer"
                className="btn-line h-12 justify-center gap-2 px-6 text-sm"
              >
                <WhatsAppIcon className="h-4 w-4 text-emerald" />
                {t('hero.orderWhatsApp')}
              </a>
            </div>

            <div className="mt-7 grid max-w-md grid-cols-3 gap-3 border-t border-blushline pt-5">
              {highlights.map(({ icon: Icon, title, note }) => (
                <div key={title} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush/45 text-[#A4617A] dark:bg-blush/15 dark:text-blush">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[11px] font-bold text-plum">{title}</span>
                    <span className="mt-0.5 block truncate text-[9px] uppercase tracking-[0.08em] text-plum-soft">
                      {note}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp concierge — a pink-tinted chat card */}
          <div className="hero-parallax relative z-10">
            <div className="rounded-[26px] border border-blushline bg-panel/85 p-4 shadow-[0_30px_60px_-40px_rgba(59,43,51,0.45)] backdrop-blur-xl sm:p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald/10 text-emerald dark:bg-emerald/20">
                  <WhatsAppIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-plum-soft">
                    {t('hero.chatTitle')}
                  </span>
                  <span className="block text-[12px] font-bold text-plum">
                    {t('hero.chatStatus')}
                  </span>
                </span>
                <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald dark:bg-emerald/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                  {t('common.live')}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-[12px] leading-snug">
                <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-shell-soft px-3 py-2 text-plum">
                  {t('hero.chatAsk')}
                </p>
                <p className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-blush px-3 py-2 font-medium text-obsidian">
                  {t('hero.chatReply')}
                </p>
              </div>

              <a
                href={whatsappLink(t('wa.order'))}
                target="_blank"
                rel="noreferrer"
                className="btn-plum mt-4 h-11 w-full justify-center gap-2 text-[12px]"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {t('hero.orderWhatsApp')}
              </a>
              <p className="mt-2 text-center text-[10px] text-plum-soft">{t('hero.chatNote')}</p>
            </div>
          </div>
        </div>

        {/* Wide New Balance showcase — the boutique's own 4:3 photograph */}
        <div className="hero-parallax relative z-10 pb-8 lg:pb-10">
          <div className="relative overflow-hidden rounded-[26px] border border-blushline bg-shell-soft shadow-[0_45px_90px_-55px_rgba(59,43,51,0.55)] sm:rounded-[34px]">
            <div className="relative aspect-[4/3] w-full sm:aspect-[16/10] lg:aspect-[16/9]">
              <img
                src={SHOWCASE_IMAGE}
                alt={t('hero.photoAlt')}
                loading="eager"
                className="absolute inset-0 h-full w-full scale-[1.02] object-cover object-[50%_58%]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#2A1D24]/70 via-[#2A1D24]/10 to-transparent"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(72%_62%_at_50%_44%,transparent_32%,rgba(42,29,36,0.24)_100%)]"
              />

              <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-3 sm:inset-x-5 sm:top-5 lg:inset-x-6 lg:top-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blush px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-obsidian sm:text-[10px]">
                  <SparkleIcon className="h-3.5 w-3.5" />
                  {t('hero.featuredTag')}
                </span>
                <span className="hidden items-center gap-1.5 rounded-full border border-white/45 bg-shell/85 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-plum backdrop-blur-md sm:inline-flex">
                  <TruckIcon className="h-3.5 w-3.5 text-emerald" />
                  {t('hero.deliveredToday')}
                </span>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5 lg:p-6">
                <div className="flex flex-col gap-3 rounded-[20px] border border-white/45 bg-shell/90 p-3.5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-4 dark:border-white/10 dark:bg-[#1A151A]/85">
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-plum-soft">
                      {t('hero.featuredLabel')}
                    </p>
                    <h2 className="mt-1 truncate font-display text-lg font-extrabold tracking-tight text-plum sm:text-xl">
                      {splitName(product.name)}
                    </h2>
                    <p className="mt-0.5 truncate text-[11px] text-plum-soft">
                      {product.colorway} · {t('hero.featuredNote')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-display text-lg font-extrabold text-plum sm:text-xl">
                      {formatTZS(product.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onViewProduct(product)}
                      className="btn-plum group h-10 gap-2 px-4 text-[11px]"
                    >
                      {t('hero.featuredCta')}
                      <ArrowUpRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-2.5 text-right text-[9px] uppercase tracking-[0.22em] text-plum-soft/70">
            {t('hero.photoCredit')}
          </p>
          {/* Pink accent rail: three pairs from the same edit */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {railProducts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewProduct(item)}
                aria-label={viewLabel(item)}
                className="group flex items-center gap-3 rounded-2xl border border-blushline bg-panel/85 p-2.5 text-left transition duration-300 hover:-translate-y-0.5 hover:border-plum/25 hover:shadow-soft"
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-shell-soft">
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-plum-soft">
                    {t(`category.${item.category}`)}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] font-bold text-plum">
                    {splitName(item.name)}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-plum-soft">
                    {formatTZS(item.price)}
                  </span>
                </span>
                <ArrowUpRightIcon className="h-4 w-4 shrink-0 text-plum-soft transition group-hover:text-plum" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-blushline py-5 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="#collection"
            className="group inline-flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-plum-soft transition hover:text-plum"
          >
            <span className="h-px w-10 bg-blushline transition-all duration-300 group-hover:w-14 group-hover:bg-blush" />
            {t('hero.explore')}
          </a>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-plum-soft/70">
            {t('hero.categories')}
          </p>
        </div>
      </div>
    </section>
  )
}
