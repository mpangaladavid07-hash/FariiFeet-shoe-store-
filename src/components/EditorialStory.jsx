import { useI18n } from '../lib/i18n'
import { whatsappLink } from '../lib/store'
import { ArrowRightIcon, InstagramIcon, WhatsAppIcon } from './Icons'

export default function EditorialStory({ onShopAll }) {
  const { t } = useI18n()

  const promises = [
    { number: '01', title: t('story.promise1Title'), note: t('story.promise1Note') },
    { number: '02', title: t('story.promise2Title'), note: t('story.promise2Note') },
    { number: '03', title: t('story.promise3Title'), note: t('story.promise3Note') },
  ]

  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <p
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 top-4 select-none font-display text-[24vw] font-extrabold leading-none tracking-[-0.08em]"
        style={{ WebkitTextStroke: '1px rgba(246,242,243,0.08)', color: 'transparent' }}
      >
        FEET
      </p>

      <div className="container-page relative grid items-center gap-14 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:py-24">
        <div className="relative mx-auto w-full max-w-[420px]">
          <div className="overflow-hidden rounded-[2rem] border border-white/15 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.85)]">
            <img
              src="/shoes/simple-shoes-02.jpg"
              alt={t('story.altMain')}
              loading="lazy"
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-8 -right-3 w-40 overflow-hidden rounded-2xl border-[5px] border-navy shadow-xl sm:-right-8 sm:w-52">
            <img
              src="/shoes/simple-sandal-2.jpg"
              alt={t('story.altInset')}
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
          </div>
          <span className="absolute -left-2 top-6 rounded-full bg-blush px-4 py-2 font-chat text-[9px] font-bold uppercase tracking-[0.2em] text-obsidian sm:-left-4">
            {t('story.badgeCity')}
          </span>
          <span className="absolute -bottom-4 left-4 hidden rounded-full border border-white/20 bg-navy/85 px-4 py-2 font-chat text-[9px] font-bold uppercase tracking-[0.18em] text-white/70 backdrop-blur sm:block">
            {t('story.badgeNew')}
          </span>
        </div>

        <div>
          <p className="eyebrow text-white/50">{t('story.eyebrow')}</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.6vw,3.4rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">
            {t('story.title')}
            <span className="block text-blush">{t('story.accent')}</span>
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/70 sm:text-[15px]">
            {t('story.copy')}
          </p>

          <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {promises.map((item) => (
              <div key={item.number} className="flex gap-4 py-4">
                <span className="font-display text-xs font-extrabold tracking-[0.12em] text-blush/60">
                  {item.number}
                </span>
                <div>
                  <h3 className="font-display text-sm font-bold text-white">{item.title}</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/60">{item.note}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onShopAll}
              className="btn group bg-white text-navy hover:bg-blush hover:text-obsidian"
            >
              {t('story.cta')}
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href="#instagram"
              className="btn border border-white/20 text-white hover:border-white/50 hover:bg-white/5"
            >
              <InstagramIcon className="h-4 w-4" />
              @fariifeet
            </a>
          </div>

          <a
            href={whatsappLink(t('wa.stock'))}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 font-chat text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55 transition hover:text-white"
          >
            <WhatsAppIcon className="h-3.5 w-3.5" />
            {t('story.chat')}
          </a>
        </div>
      </div>
    </section>
  )
}
