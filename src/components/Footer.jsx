import { CATEGORIES } from '../data/products'
import { useI18n } from '../lib/i18n'
import { INSTAGRAM_HANDLE, WHATSAPP_DISPLAY, whatsappLink } from '../lib/store'
import { ArrowUpRightIcon, InstagramIcon, PinIcon, WhatsAppIcon } from './Icons'

export default function Footer({ onCategorySelect }) {
  const { t } = useI18n()

  const helpLinks = [
    { label: t('footer.helpDelivery'), href: whatsappLink(t('wa.delivery')) },
    { label: t('footer.helpSize'), href: whatsappLink(t('wa.fit')) },
    { label: t('footer.helpReturns'), href: whatsappLink(t('wa.returns')) },
  ]

  const payments = [t('cart.paymentMpesa'), t('footer.cash'), t('cart.paymentBank')]

  // Let the browser handle the `#shop` jump (smooth scroll) so the filtered
  // grid is actually in view after a footer category click.
  const handleCategory = (id) => () => {
    onCategorySelect(id)
  }

  return (
    <footer className="relative overflow-hidden border-t border-espresso/60 bg-obsidian">
      <div className="container-page relative z-10">
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.1fr]">
          <div>
            <a href="#top" className="flex items-center gap-3" aria-label={t('brand.home')}>
              <span className="h-12 w-12 overflow-hidden rounded-full ring-1 ring-blush/30">
                <img
                  src="/brand-logo.jpeg"
                  alt={t('brand.logoAlt')}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="leading-none">
                <span className="block font-display text-2xl font-extrabold tracking-tight text-rose">
                  Farii<span className="text-blush">Feet</span>
                </span>
                <span className="mt-1.5 block font-chat text-[9px] font-semibold uppercase tracking-[0.28em] text-mocha">
                  {t('brand.tagline')}
                </span>
              </span>
            </a>
            <p className="mt-5 max-w-xs text-xs leading-relaxed text-mocha">{t('footer.blurb')}</p>
            <div className="mt-5 flex items-center gap-2">
              <a
                href="#instagram"
                aria-label={t('nav.instagram')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-espresso text-mocha transition hover:border-blush/60 hover:text-blush"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a
                href={whatsappLink(t('wa.chat'))}
                target="_blank"
                rel="noreferrer"
                aria-label={t('footer.chatLabel')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-espresso text-mocha transition hover:border-emerald/60 hover:text-emerald"
              >
                <WhatsAppIcon className="h-4 w-4" />
              </a>
              <a
                href="#instagram"
                className="ml-1 font-chat text-[10px] font-semibold uppercase tracking-[0.16em] text-mocha transition hover:text-blush"
              >
                {INSTAGRAM_HANDLE}
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-chat text-[10px] font-bold uppercase tracking-[0.24em] text-rose">
              {t('footer.shop')}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {CATEGORIES.map((category) => (
                <li key={category.id}>
                  <a
                    href="#shop"
                    onClick={handleCategory(category.id)}
                    className="group inline-flex items-center gap-1.5 text-xs text-mocha transition hover:text-blush"
                  >
                    {t(`category.${category.id}`)}
                    <ArrowUpRightIcon className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-chat text-[10px] font-bold uppercase tracking-[0.24em] text-rose">
              {t('footer.help')}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {helpLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-mocha transition hover:text-blush"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-chat text-[10px] font-bold uppercase tracking-[0.24em] text-rose">
              {t('footer.visit')}
            </h3>
            <ul className="mt-4 space-y-3 text-xs text-mocha">
              <li className="flex items-start gap-2">
                <PinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blush" />
                {t('footer.address')}
              </li>
              <li>
                <a
                  href={whatsappLink(t('wa.chat'))}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-blush"
                >
                  {WHATSAPP_DISPLAY}
                </a>
              </li>
              <li>
                <a href="#instagram" className="transition hover:text-blush">
                  {INSTAGRAM_HANDLE}
                </a>
              </li>
            </ul>
            <p className="mt-4 text-[10px] leading-relaxed text-mocha/70">{t('footer.hours')}</p>
            <a
              href="#shop"
              className="mt-4 inline-flex items-center gap-1.5 font-chat text-[10px] font-bold uppercase tracking-[0.16em] text-blush transition hover:text-rose"
            >
              {t('footer.shopNew')}
              <ArrowUpRightIcon className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-espresso/40 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-mocha">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <p className="flex items-center gap-1.5 text-[10px] text-mocha">
            {t('footer.styled')}
            <span className="h-1 w-1 rounded-full bg-blush" />
            {t('footer.built')}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {payments.map((payment) => (
              <span
                key={payment}
                className="rounded border border-espresso/70 px-2 py-1 font-chat text-[9px] font-semibold uppercase tracking-[0.1em] text-mocha"
              >
                {payment}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p
        aria-hidden="true"
        className="pointer-events-none -mb-[0.14em] select-none whitespace-nowrap text-center font-display text-[19.5vw] font-extrabold leading-[0.72] tracking-[-0.06em] text-stroke-soft opacity-80"
      >
        FARIIFEET
      </p>
    </footer>

  )
}
