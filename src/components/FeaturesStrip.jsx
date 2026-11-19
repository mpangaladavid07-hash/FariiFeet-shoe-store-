import { PinIcon, ShieldIcon, TruckIcon, WhatsAppIcon } from './Icons'
import { useI18n } from '../lib/i18n'

export default function FeaturesStrip() {
  const { t } = useI18n()

  const features = [
    {
      icon: TruckIcon,
      title: t('features.sameDayTitle'),
      note: t('features.sameDayNote'),
    },
    {
      icon: PinIcon,
      title: t('features.countryTitle'),
      note: t('features.countryNote'),
    },
    {
      icon: ShieldIcon,
      title: t('features.pickedTitle'),
      note: t('features.pickedNote'),
    },
    {
      icon: WhatsAppIcon,
      title: t('features.whatsappTitle'),
      note: t('features.whatsappNote'),
    },
  ]

  return (
    <section className="relative z-10 border-b border-blushline bg-panel/70">
      <div className="container-page grid grid-cols-2 gap-x-4 gap-y-6 py-7 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, note }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blushline bg-blush/30 text-plum dark:bg-blush/10">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="font-chat text-[11px] font-bold uppercase tracking-[0.12em] text-plum sm:text-xs">
                {title}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-plum-soft sm:text-[11px]">{note}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

