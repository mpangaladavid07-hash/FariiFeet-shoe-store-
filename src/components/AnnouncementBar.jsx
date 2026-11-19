import { SparkleIcon, TruckIcon, WhatsAppIcon } from './Icons'
import { WHATSAPP_DISPLAY, whatsappLink } from '../lib/store'
import { useI18n } from '../lib/i18n'

function MessageRow({ messages }) {
  return (
    <div className="flex shrink-0 items-center gap-6 pr-6">
      {messages.map(({ id, text, icon: Icon }) => (
        <span key={id} className="flex items-center gap-2 whitespace-nowrap">
          <Icon className="h-3.5 w-3.5 text-blush" />
          {text}
          <span className="ml-3 h-1 w-1 rounded-full bg-blush/50" />
        </span>
      ))}
    </div>
  )
}

export default function AnnouncementBar() {
  const { t } = useI18n()

  const messages = [
    { id: 'same-day', text: t('announce.sameDay'), icon: SparkleIcon },
    { id: 'countrywide', text: t('announce.countrywide'), icon: TruckIcon },
    {
      id: 'whatsapp',
      text: t('announce.orderWhatsApp', { number: WHATSAPP_DISPLAY }),
      icon: WhatsAppIcon,
    },
  ]

  return (
    <div className="relative overflow-hidden border-b border-white/10 bg-navy-deep font-chat text-[10px] font-semibold uppercase tracking-[0.22em] text-blush/90">
      <div className="container-page hidden h-9 items-center justify-between md:flex">
        <p className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blush opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blush" />
          </span>
          {t('announce.sameDay')}
        </p>
        <p className="flex items-center gap-2 text-white/50">
          <TruckIcon className="h-3.5 w-3.5 text-blush" />
          {t('announce.countrywide')}
        </p>
        <a
          href={whatsappLink(t('wa.order'))}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 transition hover:text-white"
        >
          {t('announce.orderWhatsApp', { number: WHATSAPP_DISPLAY })}
        </a>
      </div>
      <div className="flex h-9 items-center overflow-hidden md:hidden">
        <div className="flex w-max animate-marquee">
          <MessageRow messages={messages} />
          <MessageRow messages={messages} />
        </div>
      </div>
    </div>
  )
}
