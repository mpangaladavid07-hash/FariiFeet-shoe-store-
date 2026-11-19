import { useI18n } from '../lib/i18n'
import { whatsappLink } from '../lib/store'
import { InstagramIcon, WhatsAppIcon } from './Icons'

export default function ConciergeCTA() {
  const { t } = useI18n()

  return (
    <section className="relative overflow-hidden bg-blush text-obsidian">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 right-0 select-none font-display text-[16vw] font-extrabold leading-none tracking-[-0.06em] text-obsidian/5"
      >
        FARII
      </span>

      <div className="container-page relative flex flex-col gap-7 py-10 sm:py-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <p className="font-chat text-[10px] font-bold uppercase tracking-[0.28em] text-obsidian/55">
            {t('concierge.eyebrow')}
          </p>
          <h2 className="mt-2 font-display text-[clamp(1.8rem,4vw,2.75rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">
            {t('concierge.title')}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-obsidian/70">
            {t('concierge.copy')}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row">
          <a
            href={whatsappLink(t('wa.sizeHelp'))}
            target="_blank"
            rel="noreferrer"
            className="btn bg-obsidian text-rose hover:bg-espresso"
          >
            <WhatsAppIcon className="h-4 w-4" />
            {t('concierge.chat')}
          </a>
          <a
            href="#instagram"
            aria-label={t('nav.instagram')}
            className="btn border border-obsidian/25 text-obsidian hover:border-obsidian/60 hover:bg-obsidian/5"
          >
            <InstagramIcon className="h-4 w-4" />
            {t('concierge.drops')}
          </a>
        </div>
      </div>
    </section>
  )
}

