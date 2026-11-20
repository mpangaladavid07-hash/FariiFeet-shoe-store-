import { useRef } from 'react'
import { STORE_ADDRESS, STORE_MAP_URL, whatsappLink } from '../lib/store'
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
 * Compact hero stage — warm ivory with a blush bloom, the brand mark and a
 * single studio shot of the shop's own heels. No chat mock-ups and no
 * promo strips: the shoppable grid sits directly underneath, so the real
 * product cards are visible on the first scroll.
 */
const HERO_IMAGE = '/images/fariifeet-hero-shoes.jpg'
const LOGO_IMAGE = '/images/fariifeet-logo.png'

export default function Hero({ onShopNow }) {
  const sectionRef = useRef(null)
  useHeroScroll(sectionRef)
  const { t } = useI18n()

  const highlights = [
    { icon: TruckIcon, title: t('hero.highlightSameDay'), note: t('hero.highlightSameDayNote') },
    { icon: StarIcon, title: t('hero.highlightRating'), note: t('hero.highlightRatingNote') },
    { icon: SparkleIcon, title: t('hero.highlightSizes'), note: t('hero.highlightSizesNote') },
  ]

  return (
    <section
      id="top"
      ref={sectionRef}
      className="hero-section relative isolate z-0 overflow-hidden border-b border-blushline bg-shell text-plum"
    >
      {/* Warm studio light only — no background grid, no stacked boxes */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_82%_-18%,#F6EBE6_0%,#FAF7F4_54%,#F3ECE6_100%)] dark:bg-[radial-gradient(120%_90%_at_82%_-18%,#2A1F19_0%,#18110D_56%,#120C09_100%)]" />
        <div className="hero-glow-shift absolute -right-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-blush/30 blur-[120px] dark:bg-blush/10" />
      </div>

      <div className="container-page relative">
        <div className="grid items-center gap-7 py-7 sm:py-8 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10 lg:py-10">
          {/* Copy */}
          <div className="hero-copy-shift relative z-10">
            <div className="flex items-center gap-3">
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-blush/25 ring-1 ring-blush/45">
                <img
                  src={LOGO_IMAGE}
                  alt={t('brand.logoAlt')}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="leading-none">
                <span className="block font-display text-lg font-extrabold tracking-tight text-plum">
                  Farii<span className="text-blush">Feet</span>
                </span>
                <span className="mt-1 block font-chat text-[9px] font-semibold uppercase tracking-[0.26em] text-plum-soft">
                  {t('brand.tagline')}
                </span>
              </span>
            </div>

            <h1 className="mt-5 font-display text-[clamp(2.35rem,5.4vw,3.9rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-plum">
              {t('hero.titleLead')}{' '}
              <span className="relative inline-block">
                {t('hero.titleAccent')}
                <span className="text-blush">.</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 300 14"
                  fill="none"
                  className="absolute -bottom-1.5 left-0 h-2 w-[88%] text-blush/80"
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

            <p className="mt-5 max-w-md text-[14px] leading-relaxed text-plum-soft">
              <span className="font-semibold text-plum">{t('hero.copyBold')}</span>{' '}
              {t('hero.copy')}
            </p>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onShopNow}
                className="btn-plum group h-11 justify-center px-6 text-[13px]"
              >
                {t('hero.shopNow')}
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <a
                href={whatsappLink(t('wa.heroHelp'))}
                target="_blank"
                rel="noreferrer"
                className="btn-line h-11 justify-center gap-2 px-5 text-[13px]"
              >
                <WhatsAppIcon className="h-4 w-4 text-emerald" />
                {t('hero.orderWhatsApp')}
              </a>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-plum-soft">
              {highlights.map(({ icon: Icon, title, note }) => (
                <span key={title} className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-blush" />
                  <span className="text-plum">{title}</span>
                  <span className="text-plum-soft/70">{note}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Studio showcase — the shop's own heels, cropped to the shoes */}
          <div className="hero-parallax relative z-10 mx-auto w-full max-w-[440px] lg:mr-0">
            <div className="relative overflow-hidden rounded-[24px] border border-blushline bg-shell-soft shadow-[0_40px_80px_-52px_rgba(24,17,13,0.6)]">
              <img
                src={HERO_IMAGE}
                alt={t('hero.heroAlt')}
                loading="eager"
                className="aspect-[9/10] w-full object-cover object-center"
              />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-shell/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-plum backdrop-blur dark:bg-charcoal/85 dark:text-rose">
                <SparkleIcon className="h-3 w-3 text-blush" />
                {t('hero.badgeNew')}
              </span>
            </div>
            <p className="mt-2 text-right font-chat text-[9px] uppercase tracking-[0.2em] text-plum-soft/80">
              {t('hero.photoCredit')}
            </p>
          </div>
        </div>

        {/* Visit us — the exact shop location, right on the storefront */}
        <a
          href={STORE_MAP_URL}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col gap-1.5 border-t border-blushline py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <span className="flex items-start gap-2 text-[11px] leading-relaxed text-plum-soft">
            <PinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blush" />
            <span>
              <span className="font-semibold text-plum">{t('hero.visitLabel')}</span>{' '}
              {STORE_ADDRESS}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 font-chat text-[9px] font-bold uppercase tracking-[0.16em] text-plum-soft transition group-hover:text-plum">
            {t('hero.directions')}
            <ArrowUpRightIcon className="h-3 w-3" />
          </span>
        </a>
      </div>
    </section>
  )
}
