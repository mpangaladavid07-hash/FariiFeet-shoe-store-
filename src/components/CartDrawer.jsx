import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CHECKOUT_PAYMENTS,
  DEFAULT_CHECKOUT_PAYMENT,
  DEFAULT_DELIVERY,
  DELIVERY_OPTIONS,
  cartOrderMessage,
  cartSubtotal,
  deliveryFeeFor,
  formatPhone,
  formatTZS,
  legacyPaymentId,
  normalizePhone,
  paymentForDelivery,
  paymentMethodsFor,
  whatsappLink,
  STORE_ADDRESS,
} from '../lib/store'
import { orderSummaryText, orderWhatsAppLink, placeOrder } from '../lib/orders'
import { useI18n } from '../lib/i18n'
import {
  BagIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  MinusIcon,
  PhoneIcon,
  PinIcon,
  PlusIcon,
  ShieldIcon,
  TruckIcon,
  UserIcon,
  WhatsAppIcon,
} from './Icons'

const EMPTY_FORM = { name: '', phone: '', area: '', region: '' }
const STEP_BAG = 'bag'
const STEP_CHECKOUT = 'checkout'
const STEP_DONE = 'done'

/** Keeps the visible phone field at `754 623 904` so the +255 prefix stays true. */
function formatPhoneInput(value) {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('255')) digits = digits.slice(3)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  digits = digits.slice(0, 9)
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ')
}

function formatDate(iso, lang) {

  try {
    return new Intl.DateTimeFormat(lang === 'sw' ? 'sw-TZ' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch (error) {
    return String(iso || '')
  }
}

/**
 * The WhatsApp tab is opened while the submit click is still in flight:
 * browsers only allow pop-ups inside that gesture, and the order 4-12s save
 * would otherwise lose it. The tab is filled in once the order id exists.
 */
function openDispatchWindow() {
  try {
    return window.open('about:blank', '_blank')
  } catch (error) {
    return null
  }
}

function dispatchToWhatsApp(waWindow, order, lang) {
  if (!waWindow || waWindow.closed) return false
  try {
    waWindow.opener = null
    waWindow.location.href = orderWhatsAppLink(order, lang)
    return true
  } catch (error) {
    return false
  }
}

/** Clipboard API first, hidden-textarea fallback for older mobile browsers. */
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (error) {
    /* fall through to execCommand */
  }

  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '-1000px'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(area)
    return copied
  } catch (error) {
    return false
  }
}

function CartItem({ item, onUpdateQty, onRemove, t }) {
  return (
    <div className="flex gap-3 border-b border-blushline py-4">
      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-blushline bg-shell-soft">
        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-chat text-[10px] font-semibold uppercase tracking-[0.14em] text-plum-soft">
              EU {item.size}
            </p>
            <h3 className="mt-1 truncate font-display text-[13px] font-bold leading-snug text-plum">
              {item.name}
            </h3>
            <p className="mt-0.5 truncate text-[10px] text-plum-soft">{item.colorway}</p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.lineId)}
            aria-label={t('cart.remove', { name: item.name })}
            className="rounded-full p-1 text-plum-soft transition hover:bg-shell-soft hover:text-plum"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex h-8 items-center rounded-full border border-blushline bg-shell-soft px-0.5">
            <button
              type="button"
              onClick={() => onUpdateQty(item.lineId, item.qty - 1)}
              aria-label={t('cart.decrease', { name: item.name })}
              className="flex h-7 w-7 items-center justify-center rounded-full text-plum transition hover:bg-panel"
            >
              <MinusIcon className="h-3 w-3" />
            </button>
            <span className="w-5 text-center font-chat text-xs font-bold tabular-nums text-plum">
              {item.qty}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQty(item.lineId, item.qty + 1)}
              aria-label={t('cart.increase', { name: item.name })}
              className="flex h-7 w-7 items-center justify-center rounded-full text-plum transition hover:bg-panel"
            >
              <PlusIcon className="h-3 w-3" />
            </button>
          </div>

          <div className="text-right">
            <p className="font-chat text-xs font-bold text-plum">
              {formatTZS(item.price * item.qty)}
            </p>
            {item.qty > 1 && (
              <p className="mt-0.5 text-[9px] text-plum-soft">
                {t('cart.each', { price: formatTZS(item.price) })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TotalRow({ label, value, strong = false, muted = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={
          strong
            ? 'font-chat text-[10px] font-bold uppercase tracking-[0.16em] text-plum'
            : 'text-[11px] text-plum-soft'
        }
      >
        {label}
      </span>
      <span
        className={
          strong
            ? 'font-display text-lg font-extrabold tracking-tight text-plum'
            : muted
              ? 'font-chat text-[11px] text-plum-soft'
              : 'font-chat text-[11px] font-semibold text-plum'
        }
      >
        {value}
      </span>
    </div>
  )
}

function FieldError({ message }) {
  if (!message) return null
  return <p className="mt-1 text-[10px] font-medium text-[#B3687F] dark:text-blush">{message}</p>
}

export function CheckoutForm({
  form,
  onFieldChange,
  delivery,
  onDeliveryChange,
  payment,
  onPaymentChange,
  errors,
  submitError,
  submitting,
  onSubmit,
  t,
}) {
  const setField = (name) => (event) => onFieldChange(name, event.target.value)

  return (
    <form id="ff-checkout" onSubmit={onSubmit} noValidate className="pb-4">
      <section className="rounded-2xl border border-blushline bg-panel p-4">
        <p className="eyebrow-plum">{t('checkout.contact')}</p>

        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 font-chat text-[10px] font-semibold uppercase tracking-[0.12em] text-plum-soft">
              <UserIcon className="h-3 w-3" />
              {t('checkout.name')}
            </span>
            <input
              type="text"
              className={`field-light ${errors.name ? 'border-[#C0798C]' : ''}`}
              value={form.name}
              onChange={setField('name')}
              placeholder={t('checkout.namePlaceholder')}
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
            />
            <FieldError message={errors.name} />
          </label>

          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 font-chat text-[10px] font-semibold uppercase tracking-[0.12em] text-plum-soft">
              <PhoneIcon className="h-3 w-3" />
              {t('checkout.phone')}
            </span>
            <div
              className={`flex items-stretch overflow-hidden rounded-xl border bg-shell-soft transition focus-within:border-plum/40 focus-within:ring-2 focus-within:ring-blush/30 ${
                errors.phone ? 'border-[#C0798C]' : 'border-blushline'
              }`}
            >
              <span className="flex items-center border-r border-blushline px-3 font-chat text-xs font-semibold text-plum-soft">
                +255
              </span>
              <input
                type="tel"
                inputMode="numeric"
                className="w-full bg-transparent px-3 py-2.5 text-sm text-plum placeholder:text-plum-soft/60 focus:outline-none"
                value={form.phone}
                onChange={setField('phone')}
                placeholder={t('checkout.phonePlaceholder')}
                autoComplete="tel-national"
                maxLength={11}
                aria-invalid={Boolean(errors.phone)}
              />
            </div>
            <FieldError message={errors.phone} />
            <p className="mt-1 text-[10px] text-plum-soft">{t('checkout.phoneNote')}</p>
          </label>
        </div>
      </section>

      <section className="mt-4">
        <p className="eyebrow-plum">{t('checkout.deliverySection')}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {DELIVERY_OPTIONS.map((option) => {
            const active = delivery === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onDeliveryChange(option.id)}
                aria-pressed={active}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? 'border-plum bg-blush/40'
                    : 'border-blushline bg-shell-soft hover:border-plum/30'
                }`}
              >
                <span
                  className={`block text-[11px] font-semibold ${
                    active ? 'text-plum' : 'text-plum-soft'
                  }`}
                >
                  {t(option.labelKey)}
                </span>
                <span className="mt-0.5 block font-chat text-[9px] text-plum-soft">
                  {t(option.noteKey)}
                </span>
              </button>
            )
          })}
        </div>

        <p className="mt-2 flex items-start gap-1.5 rounded-xl border border-blushline bg-shell-soft px-3 py-2 text-[10px] leading-relaxed text-plum-soft">
          <PinIcon className="mt-0.5 h-3 w-3 shrink-0 text-blush" />
          <span>
            <span className="font-semibold text-plum">{t('checkout.pickupTitle')}:</span>{' '}
            {STORE_ADDRESS}
            <span className="mt-0.5 block">{t('checkout.pickupNote')}</span>
          </span>
        </p>

        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 font-chat text-[10px] font-semibold uppercase tracking-[0.12em] text-plum-soft">
              <PinIcon className="h-3 w-3" />
              {t('checkout.area')}
            </span>
            <input
              type="text"
              className={`field-light ${errors.area ? 'border-[#C0798C]' : ''}`}
              value={form.area}
              onChange={setField('area')}
              placeholder={t('checkout.areaPlaceholder')}
              autoComplete="street-address"
              aria-invalid={Boolean(errors.area)}
            />
            <FieldError message={errors.area} />
            {delivery === 'dar' && (
              <p className="mt-1 pl-1 text-[9px] leading-relaxed text-plum-soft">
                {t('checkout.darAreas')}
              </p>
            )}
          </label>

          {delivery === 'countrywide' && (
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 font-chat text-[10px] font-semibold uppercase tracking-[0.12em] text-plum-soft">
                <TruckIcon className="h-3 w-3" />
                {t('checkout.region')}
              </span>
              <input
                type="text"
                className={`field-light ${errors.region ? 'border-[#C0798C]' : ''}`}
                value={form.region}
                onChange={setField('region')}
                placeholder={t('checkout.regionPlaceholder')}
                autoComplete="address-level1"
                aria-invalid={Boolean(errors.region)}
              />
              <FieldError message={errors.region} />
              <p className="mt-1 pl-1 text-[9px] leading-relaxed text-plum-soft">
                {t('checkout.regions')}
              </p>
            </label>
          )}
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-plum-soft">
          {delivery === 'dar' ? t('checkout.darNote') : t('checkout.countryNote')}
        </p>
      </section>

      <section className="mt-4">
        <p className="eyebrow-plum">{t('checkout.paymentSection')}</p>
        <div className="mt-2 space-y-2">
          {paymentMethodsFor(delivery).map((method) => {
            const active = payment === method.id
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => onPaymentChange(method.id)}
                aria-pressed={active}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                  active
                    ? 'border-plum bg-blush/40'
                    : 'border-blushline bg-shell-soft hover:border-plum/30'
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                    active ? 'border-plum' : 'border-plum-soft/50'
                  }`}
                >
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-plum" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[11px] font-semibold ${
                      active ? 'text-plum' : 'text-plum-soft'
                    }`}
                  >
                    {t(method.labelKey)}
                  </span>
                  <span className="mt-0.5 block font-chat text-[9px] text-plum-soft">
                    {t(method.noteKey)}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-plum-soft">
          {payment === 'lipa' ? t('checkout.paymentNoteLipa') : t('checkout.paymentNote')}
        </p>
      </section>

      {submitError && (
        <p className="mt-3 rounded-xl border border-[#D79BAC] bg-blush/30 px-3 py-2 text-[11px] font-medium text-plum">
          {submitError}
        </p>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-[10px] leading-relaxed text-plum-soft">
        <ShieldIcon className="h-3 w-3" />
        {t('checkout.helper')}
      </p>
      <span className="sr-only">{submitting ? t('checkout.placing') : ''}</span>
    </form>
  )
}


export function OrderReceipt({ order, t, lang, onClose, dispatched = false }) {
  const [copyState, setCopyState] = useState('')
  const payment = CHECKOUT_PAYMENTS.find((method) => method.id === order.payment)
  const delivery = DELIVERY_OPTIONS.find((option) => option.id === order.delivery)
  const summary = orderSummaryText(order, lang)

  const handleCopy = async () => {
    const copied = await copyToClipboard(summary)
    setCopyState(copied ? 'done' : 'error')
    window.setTimeout(() => setCopyState(''), 2600)
  }

  return (
    <div className="pb-4">
      <div className="rounded-2xl border border-blushline bg-panel p-5 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald/15 text-emerald">
          <CheckIcon className="h-6 w-6" />
        </span>
        <p className="eyebrow-plum mt-3">{t('receipt.eyebrow')}</p>
        <h3 className="mt-1 font-display text-2xl font-extrabold text-plum">{t('receipt.title')}</h3>
        <div className="mt-3 rounded-xl border border-dashed border-plum/30 bg-shell-soft px-3 py-2">
          <p className="font-chat text-[9px] uppercase tracking-[0.18em] text-plum-soft">
            {t('receipt.orderId')}
          </p>
          <p className="mt-0.5 font-chat text-lg font-bold tracking-[0.12em] text-plum">
            {order.id}
          </p>
        </div>
        <p className="mt-2 text-[10px] text-plum-soft">
          {t('receipt.placedOn', { date: formatDate(order.createdAt, lang) })}
        </p>
      </div>

      <section className="mt-4 rounded-2xl border border-blushline bg-panel p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow-plum">{t('receipt.items')}</p>
          <span className="rounded-full bg-blush/40 px-2 py-0.5 font-chat text-[9px] font-bold uppercase tracking-[0.1em] text-plum">
            {t('admin.statusPending')}
          </span>
        </div>

        <ul className="mt-3 space-y-3">
          {order.items.map((item) => (
            <li key={`${item.productId}-${item.size}`} className="flex gap-3">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-14 w-11 shrink-0 rounded-lg border border-blushline object-cover"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[12px] font-bold leading-snug text-plum">
                  {item.name}
                </p>
                <p className="mt-0.5 font-chat text-[10px] text-plum-soft">
                  EU {item.size} x {item.qty}
                </p>
              </div>
              <p className="shrink-0 font-chat text-[11px] font-semibold text-plum">
                {formatTZS(item.price * item.qty)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-3 space-y-1.5 border-t border-blushline pt-3">
          <TotalRow label={t('receipt.subtotal')} value={formatTZS(order.subtotal)} />
          <TotalRow
            label={t('receipt.delivery')}
            value={
              order.deliveryFee ? formatTZS(order.deliveryFee) : t('checkout.freeDelivery')
            }
            muted={!order.deliveryFee}
          />
          <TotalRow label={t('receipt.total')} value={formatTZS(order.total)} strong />
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-blushline bg-panel p-4">
        <p className="eyebrow-plum">{t('receipt.details')}</p>
        <dl className="mt-2 space-y-1.5 text-[11px]">
          <div className="flex justify-between gap-3">
            <dt className="text-plum-soft">{t('receipt.name')}</dt>
            <dd className="font-semibold text-plum">{order.customer.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-plum-soft">{t('receipt.phone')}</dt>
            <dd className="font-semibold text-plum">
              <a href={`tel:${order.customer.phone}`} className="hover:underline">
                {formatPhone(order.customer.phone)}
              </a>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-plum-soft">{t('receipt.area')}</dt>
            <dd className="text-right font-semibold text-plum">
              {order.customer.area}
              {order.customer.region ? `, ${order.customer.region}` : ''}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-plum-soft">{t('receipt.payment')}</dt>
            <dd className="text-right font-semibold text-plum">
              {payment ? t(payment.labelKey) : order.payment}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-plum-soft">{t('receipt.delivery')}</dt>
            <dd className="text-right font-semibold text-plum">
              {delivery ? t(delivery.labelKey) : order.delivery}
            </dd>
          </div>
        </dl>
      </section>

      <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-shell-soft px-3 py-2 text-[10px] leading-relaxed text-plum-soft">
        <PinIcon className="mt-0.5 h-3 w-3 shrink-0" />
        {t('receipt.nextStep')}
      </p>
      <p className="mt-2 text-[10px] leading-relaxed text-plum-soft">{t('receipt.keep')}</p>

      <p
        className={`mt-3 rounded-xl px-3 py-2 text-[10px] leading-relaxed ${
          dispatched ? 'bg-emerald/10 text-plum' : 'bg-shell-soft text-plum-soft'
        }`}
      >
        {t(dispatched ? 'receipt.sentHint' : 'receipt.autoBlocked')}
      </p>

      <a
        href={whatsappLink(summary)}
        target="_blank"
        rel="noreferrer"
        className="btn-line mt-2.5 w-full"
      >
        <WhatsAppIcon className="h-4 w-4 text-emerald" />
        {t('receipt.whatsapp')}
      </a>

      <button type="button" onClick={handleCopy} aria-live="polite" className="btn-line mt-2 w-full">
        {copyState === 'done' ? (
          <CheckIcon className="h-4 w-4 text-emerald" />
        ) : (
          <CopyIcon className="h-4 w-4" />
        )}
        {copyState === 'done' ? t('receipt.copied') : t('receipt.copy')}
      </button>
      {copyState === 'error' && (
        <p className="mt-1.5 text-[10px] leading-relaxed text-[#B3687F] dark:text-blush">
          {t('receipt.copyError')}
        </p>
      )}

      <button type="button" onClick={onClose} className="btn-plum mt-2.5 w-full">
        {t('receipt.continue')}
      </button>

      <p className="mt-2 text-center text-[9px] text-plum-soft">
        {order.source === 'cloud' ? t('receipt.savedCloud') : t('receipt.savedLocal')}
      </p>
    </div>
  )
}


export default function CartDrawer({
  open,
  items,
  onClose,
  onUpdateQty,
  onRemove,
  onOrderPlaced = () => {},
}) {
  const { t, lang } = useI18n()
  const [step, setStep] = useState(STEP_BAG)
  const [placedOrder, setPlacedOrder] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [delivery, setDelivery] = useState(DEFAULT_DELIVERY)
  const [payment, setPayment] = useState(() =>
    paymentForDelivery(DEFAULT_DELIVERY, DEFAULT_CHECKOUT_PAYMENT),
  )
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dispatchOk, setDispatchOk] = useState(false)
  const closeRef = useRef(null)

  const reset = useCallback(() => {
    setStep(STEP_BAG)
    setPlacedOrder(null)
    setErrors({})
    setSubmitError('')
    setSubmitting(false)
    setDispatchOk(false)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    const timer = window.setTimeout(() => closeRef.current?.focus(), 120)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, handleClose])

  const count = items.reduce((total, item) => total + item.qty, 0)
  const subtotal = cartSubtotal(items)
  const deliveryFee = deliveryFeeFor(delivery)
  const total = subtotal + deliveryFee

  const setField = (name, value) => {
    const nextValue = name === 'phone' ? formatPhoneInput(value) : value
    setForm((current) => ({ ...current, [name]: nextValue }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  /* Cash is a Dar-only option and Lipa Namba is countrywide-only, so switching
     delivery re-validates the payment instead of leaving a dead selection. */
  const setDeliveryOption = (nextDelivery) => {
    setDelivery(nextDelivery)
    setPayment((current) => paymentForDelivery(nextDelivery, current))
  }

  const supportMessage = cartOrderMessage(items, {
    lang,
    delivery,
    payment: legacyPaymentId(payment),
    customer: form,
  })

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting || items.length === 0) return

    const next = {}
    if (!form.name.trim()) next.name = t('checkout.errName')
    if (!normalizePhone(form.phone)) next.phone = t('checkout.errPhone')
    if (!form.area.trim()) next.area = t('checkout.errArea')
    if (delivery === 'countrywide' && !form.region.trim()) next.region = t('checkout.errRegion')
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    setSubmitError('')
    const waWindow = openDispatchWindow()
    try {
      const order = await placeOrder({ items, customer: form, delivery, payment, lang })
      setPlacedOrder(order)
      setStep(STEP_DONE)
      setForm(EMPTY_FORM)
      onOrderPlaced(order)
      setDispatchOk(dispatchToWhatsApp(waWindow, order, lang))
      /* The next order starts from the Dar defaults, not the last shopper's zone. */
      setDelivery(DEFAULT_DELIVERY)
      setPayment(paymentForDelivery(DEFAULT_DELIVERY, DEFAULT_CHECKOUT_PAYMENT))
    } catch (error) {
      if (waWindow && !waWindow.closed) {
        try {
          waWindow.close()
        } catch (closeError) {
          /* the tab is already gone */
        }
      }
      setSubmitError(t('checkout.errSubmit'))
    } finally {
      setSubmitting(false)
    }
  }

  const title =
    step === STEP_BAG ? t('cart.title') : step === STEP_CHECKOUT ? t('checkout.title') : t('receipt.title')
  const eyebrow = step === STEP_DONE ? t('receipt.eyebrow') : t('cart.eyebrow')

  return (
    <div
      className={`fixed inset-0 z-[80] transition-[visibility] duration-300 ${
        open ? 'visible' : 'invisible'
      }`}
      aria-hidden={!open}
    >
      <div
        onClick={handleClose}
        aria-hidden="true"
        className={`absolute inset-0 bg-obsidian/65 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className={`absolute right-0 top-0 flex h-[100dvh] w-full max-w-[440px] flex-col border-l border-blushline bg-shell text-plum shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-blushline px-5 py-4">
          <div>
            <p className="eyebrow-plum">{eyebrow}</p>
            <h2
              id="cart-drawer-title"
              className="mt-1 flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-plum"
            >
              {title}
              {step === STEP_BAG && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-plum px-1.5 font-chat text-[10px] font-bold text-shell">
                  {count}
                </span>
              )}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={handleClose}
            aria-label={t('cart.close')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-blushline text-plum-soft transition hover:border-plum/40 hover:text-plum"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {step !== STEP_DONE && (
          <div className="flex items-center gap-2 border-b border-blushline bg-shell-soft px-5 py-2.5 font-chat text-[10px] font-semibold uppercase tracking-[0.12em] text-plum-soft">
            <TruckIcon className="h-3.5 w-3.5 text-emerald" />
            {t('cart.shippingBar')}
          </div>
        )}

        {step === STEP_BAG && items.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-blushline bg-shell-soft text-plum-soft">
              <BagIcon className="h-7 w-7" />
            </span>
            <h3 className="mt-5 font-display text-2xl font-bold text-plum">
              {t('cart.emptyTitle')}{' '}
              <span className="text-[#BC7089]">{t('cart.emptyAccent')}</span>
            </h3>
            <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-plum-soft">
              {t('cart.emptyBody')}
            </p>
            <button type="button" onClick={handleClose} className="btn-plum mt-6">
              {t('cart.emptyCta')}
            </button>
            <a
              href={whatsappLink(t('wa.stock'))}
              target="_blank"
              rel="noreferrer"
              className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-plum-soft transition hover:text-plum"
            >
              {t('cart.emptyHelp')}
            </a>
          </div>
        )}

        {step === STEP_BAG && items.length > 0 && (
          <>
            <div className="scrollbar-hide flex-1 overflow-y-auto overscroll-contain px-5 pt-4">
              {items.map((item) => (
                <CartItem
                  key={item.lineId}
                  item={item}
                  onUpdateQty={onUpdateQty}
                  onRemove={onRemove}
                  t={t}
                />
              ))}
              <p className="pb-1 pt-4 text-[10px] leading-relaxed text-plum-soft">
                {t('checkout.helper')}
              </p>
            </div>

            <div className="border-t border-blushline bg-panel px-5 pb-5 pt-3">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow-plum">{t('cart.total')}</p>
                  <p className="mt-0.5 font-chat text-[9px] text-plum-soft">
                    {t(count === 1 ? 'cart.pairCount' : 'cart.pairsCount', { count })}
                  </p>
                </div>
                <p className="shrink-0 font-display text-xl font-extrabold tracking-tight text-plum">
                  {formatTZS(total)}
                </p>
              </div>
              <p className="mt-1 font-chat text-[9px] uppercase tracking-[0.1em] text-plum-soft">
                {delivery === 'dar' ? t('cart.deliveryFree') : t('cart.deliveryQuoted')}
              </p>

              <button
                type="button"
                onClick={() => setStep(STEP_CHECKOUT)}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-plum text-[11px] font-bold uppercase tracking-[0.16em] text-shell transition hover:bg-obsidian hover:text-rose active:scale-[0.99]"
              >
                <BagIcon className="h-4 w-4" />
                {t('cart.checkout')}
              </button>

              <a
                href={whatsappLink(supportMessage)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-plum-soft transition hover:text-plum"
              >
                <WhatsAppIcon className="h-3.5 w-3.5 text-emerald" />
                {t('cart.whatsappSupport')}
              </a>

              <button
                type="button"
                onClick={handleClose}
                className="mt-1 h-8 w-full text-[10px] font-semibold uppercase tracking-[0.18em] text-plum-soft transition hover:text-plum"
              >
                {t('cart.continue')}
              </button>

              <p className="mt-1 flex items-center justify-center gap-1.5 text-center text-[9px] text-plum-soft">
                <ShieldIcon className="h-3 w-3" />
                {t('cart.payOnDelivery')}
              </p>
            </div>
          </>
        )}
        {step === STEP_CHECKOUT && (
          <>
            <div className="scrollbar-hide flex-1 overflow-y-auto overscroll-contain px-5 pt-4">
              <CheckoutForm
                form={form}
                onFieldChange={setField}
                delivery={delivery}
                onDeliveryChange={setDeliveryOption}
                payment={payment}
                onPaymentChange={setPayment}
                errors={errors}
                submitError={submitError}
                submitting={submitting}
                onSubmit={handleSubmit}
                t={t}
              />
            </div>

            <div className="border-t border-blushline bg-panel px-5 pb-5 pt-3">
              <div className="space-y-1.5">
                <TotalRow label={t('receipt.subtotal')} value={formatTZS(subtotal)} />
                <TotalRow
                  label={t('receipt.delivery')}
                  value={
                    deliveryFee
                      ? formatTZS(deliveryFee)
                      : delivery === 'dar'
                        ? t('checkout.freeDelivery')
                        : t('checkout.feePending')
                  }
                  muted={!deliveryFee}
                />
                <TotalRow label={t('checkout.total')} value={formatTZS(total)} strong />
              </div>

              <button
                type="submit"
                form="ff-checkout"
                disabled={submitting}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald text-[11px] font-bold uppercase tracking-[0.16em] text-obsidian transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShieldIcon className="h-4 w-4" />
                {submitting
                  ? t('checkout.placing')
                  : t('checkout.placeOrder', { total: formatTZS(total) })}
              </button>

              <button
                type="button"
                onClick={() => setStep(STEP_BAG)}
                className="mt-2 h-9 w-full text-[10px] font-semibold uppercase tracking-[0.18em] text-plum-soft transition hover:text-plum"
              >
                {t('checkout.backToBag')}
              </button>
            </div>
          </>
        )}

        {step === STEP_DONE && placedOrder && (
          <div className="scrollbar-hide flex-1 overflow-y-auto overscroll-contain px-5 pt-4">
            <OrderReceipt
              order={placedOrder}
              t={t}
              lang={lang}
              onClose={handleClose}
              dispatched={dispatchOk}
            />
          </div>
        )}
      </aside>
    </div>
  )
}

