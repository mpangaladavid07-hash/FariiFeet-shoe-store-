import { SparkleIcon, TruckIcon } from './Icons'
import { WHATSAPP_DISPLAY, whatsappLink } from '../lib/store'
import { useI18n } from '../lib/i18n'

/** One slim espresso strip — no marquee duplication, no stacked banners. */
export default function AnnouncementBar() {
  const { t } = useI18n()

  return (
    <div className="relative border-b border-white/10 bg-charcoal font-chat text-[10px] font-semibold uppercase tracking-[0.18em] text-blush/90">
      <div className="container-page flex h-8 items-center justify-between gap-4">
        <p className="hidden items-center gap-2 sm:flex">
          <SparkleIcon className="h-3 w-3 text-blush" />
          {t('announce.sameDay')}
        </p>
        <p className="hidden items-center gap-2 text-white/55 md:flex">
          <TruckIcon className="h-3.5 w-3.5 text-blush" />
          {t('announce.countrywide')}
        </p>
        <a
          href={whatsappLink(t('wa.order'))}
          target="_blank"
          rel="noreferrer"
          className="truncate transition hover:text-white"
        >
          {t('announce.orderWhatsApp', { number: WHATSAPP_DISPLAY })}
        </a>
      </div>
    </div>
  )
}
