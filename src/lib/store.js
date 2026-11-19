import { translate } from './i18n'

export const WHATSAPP_NUMBER = '255754623904'
export const WHATSAPP_DISPLAY = '+255 754 623 904'
export const INSTAGRAM_URL = 'https://www.instagram.com/fariifeet'
export const INSTAGRAM_HANDLE = '@fariifeet'

export const formatTZS = (value) =>
  `TZS ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`

export const cartSubtotal = (items) =>
  items.reduce((total, item) => total + item.price * item.qty, 0)

export const cartCount = (items) =>
  items.reduce((total, item) => total + item.qty, 0)

export const whatsappLink = (message) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`

/* ------------------------------------------------------------------ */
/* Delivery & payment choices (labels are translated at render time)   */
/* ------------------------------------------------------------------ */

export const DELIVERY_OPTIONS = [
  { id: 'dar', labelKey: 'cart.deliveryDar', noteKey: 'cart.deliveryDarNote' },
  { id: 'countrywide', labelKey: 'cart.deliveryCountry', noteKey: 'cart.deliveryCountryNote' },
]

export const PAYMENT_METHODS = [
  { id: 'mpesa', labelKey: 'cart.paymentMpesa', noteKey: 'cart.paymentMpesaNote' },
  { id: 'cash', labelKey: 'cart.paymentCash', noteKey: 'cart.paymentCashNote' },
  { id: 'bank', labelKey: 'cart.paymentBank', noteKey: 'cart.paymentBankNote' },
]

export const DEFAULT_DELIVERY = DELIVERY_OPTIONS[0].id
export const DEFAULT_PAYMENT = PAYMENT_METHODS[0].id

/* ------------------------------------------------------------------ */
/* On-site checkout: pay-on-delivery options, fees and phone helpers    */
/* ------------------------------------------------------------------ */

/**
 * How a website order can be paid for. `delivery` limits where an option is
 * offered: cash is collected by the Dar rider, while Lipa Namba / mobile-money
 * transfer is for countrywide orders that are paid before the bus or courier
 * leaves.
 */
export const CHECKOUT_PAYMENTS = [
  { id: 'cod', labelKey: 'checkout.payCod', noteKey: 'checkout.payCodNote', delivery: ['dar'] },
  {
    id: 'momo',
    labelKey: 'checkout.payMomo',
    noteKey: 'checkout.payMomoNote',
    delivery: ['dar', 'countrywide'],
  },
  {
    id: 'lipa',
    labelKey: 'checkout.payLipa',
    noteKey: 'checkout.payLipaNote',
    delivery: ['countrywide'],
  },
]

export const DEFAULT_CHECKOUT_PAYMENT = 'cod'

/** Payment options offered for a delivery choice, in display order. */
export const paymentMethodsFor = (deliveryId = DEFAULT_DELIVERY) =>
  CHECKOUT_PAYMENTS.filter((method) => method.delivery.includes(deliveryId))

/** Cash for the Dar rider, Lipa Namba for countrywide orders. */
export const defaultPaymentFor = (deliveryId = DEFAULT_DELIVERY) =>
  deliveryId === 'countrywide' ? 'lipa' : DEFAULT_CHECKOUT_PAYMENT

/** Keeps the chosen payment valid when the shopper switches delivery option. */
export const paymentForDelivery = (deliveryId, paymentId) =>
  paymentMethodsFor(deliveryId).some((method) => method.id === paymentId)
    ? paymentId
    : defaultPaymentFor(deliveryId)

/** Maps an on-site payment id to the legacy WhatsApp `PAYMENT_METHODS` id. */
export const legacyPaymentId = (id) => (id === 'cod' ? 'cash' : 'mpesa')

/**
 * Delivery fees in TZS, keyed by DELIVERY_OPTIONS id.
 * Dar es Salaam is free; the countrywide courier rate is quoted on the phone,
 * so it stays 0 until the shop sets its own figure here.
 */
export const DELIVERY_FEES = { dar: 0, countrywide: 0 }

export const deliveryFeeFor = (deliveryId) => Number(DELIVERY_FEES[deliveryId] ?? 0)

/** Subtotal + delivery fee, the amount shown in the bag and on the receipt. */
export const cartTotal = (items, deliveryId = DEFAULT_DELIVERY) =>
  cartSubtotal(items) + deliveryFeeFor(deliveryId)

const PHONE_PREFIX = '+255'

/**
 * Accepts `0754 623 904`, `754 623 904`, `+255 754 623 904` or `255754623904`
 * and returns the canonical `+255754623904`, or `''` when it is not a valid
 * Tanzanian mobile number.
 */
export function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  let local = digits
  if (local.startsWith('255')) local = local.slice(3)
  else if (local.startsWith('0') && local.length > 9) local = local.slice(1)
  if (!/^[67]\d{8}$/.test(local)) return ''
  return `${PHONE_PREFIX}${local}`
}

/** `+255 754 623 904` — display form for receipts and the order desk. */
export function formatPhone(value) {
  const normalized = normalizePhone(value)
  if (!normalized) return String(value || '').trim()
  const local = normalized.slice(PHONE_PREFIX.length)
  return `${PHONE_PREFIX} ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
}

/* ------------------------------------------------------------------ */
/* WhatsApp order messages                                             */
/* ------------------------------------------------------------------ */

const ORDER_COPY = {
  en: {
    heading: '🛍️ NEW ORDER — FariiFeet',
    customer: 'Customer',
    phone: 'WhatsApp',
    area: 'Delivery area',
    notProvided: 'not provided yet',
    orderCart: 'Hello FariiFeet 👋 I’d like to place an order:',
    orderSingle: 'Hello FariiFeet 👋 I’d like to order:',
    colourway: 'Colourway',
    subtotal: 'Subtotal',
    delivery: 'Delivery',
    payment: 'Payment',
    paymentPending: 'to confirm on WhatsApp',
    deliveryFee: 'delivery fee confirmed on WhatsApp',
    total: 'Total',
    closing: 'Please confirm availability and delivery details.',
    sentFrom: 'Sent from the FariiFeet website.',
  },
  sw: {
    heading: '🛍️ ODA MPYA — FariiFeet',
    customer: 'Mteja',
    phone: 'WhatsApp',
    area: 'Eneo la uwasilishaji',
    notProvided: 'bado haijatolewa',
    orderCart: 'Habari FariiFeet 👋 Ningependa kuweka oda:',
    orderSingle: 'Habari FariiFeet 👋 Ningependa kuagiza:',
    colourway: 'Rangi',
    subtotal: 'Jumla ndogo',
    delivery: 'Uwasilishaji',
    payment: 'Malipo',
    paymentPending: 'kuthibitisha kwa WhatsApp',
    deliveryFee: 'ada ya uwasilishaji huthibitishwa kwa WhatsApp',
    total: 'Jumla',
    closing: 'Tafadhali thibitisha upatikanaji na maelezo ya uwasilishaji.',
    sentFrom: 'Imetumwa kutoka tovuti ya FariiFeet.',
  },
}

function orderCopy(lang) {
  return ORDER_COPY[lang] || ORDER_COPY.en
}

function deliveryLine(lang, deliveryId) {
  const option = DELIVERY_OPTIONS.find((entry) => entry.id === deliveryId) || DELIVERY_OPTIONS[0]
  const label = translate(lang, option.labelKey)
  const note = translate(lang, option.noteKey)
  return `${label} (${note}) — ${orderCopy(lang).deliveryFee}`
}

function paymentLine(lang, paymentId) {
  const method = PAYMENT_METHODS.find((entry) => entry.id === paymentId) || PAYMENT_METHODS[0]
  const label = translate(lang, method.labelKey)
  const note = translate(lang, method.noteKey)
  return `${label} — ${note}`
}

function customerBlock(lang, customer = {}) {
  const copy = orderCopy(lang)
  const name = String(customer.name || '').trim()
  const phone = String(customer.phone || '').trim()
  const area = String(customer.area || '').trim()
  const who = [name, phone].filter(Boolean).join(' · ') || copy.notProvided

  const lines = [`${copy.customer}: ${who}`]
  if (area) lines.push(`${copy.area}: ${area}`)
  return lines
}

/**
 * Structured order hand-off for WhatsApp: who ordered, what they ordered,
 * how they want it delivered and which payment method they picked.
 * Online payment is not wired yet, so the message states the method and
 * leaves the confirmation step to the shop.
 */
export function buildOrderMessage({
  items = [],
  lang = 'en',
  delivery = DEFAULT_DELIVERY,
  payment = DEFAULT_PAYMENT,
  customer = {},
  single = false,
} = {}) {
  const copy = orderCopy(lang)
  const lines = items.map((item, index) => {
    const row = `${index + 1}. ${item.name} — EU ${item.size} × ${item.qty} — ${formatTZS(
      item.price * item.qty,
    )}`
    return item.colorway ? `${row}\n   ${copy.colourway}: ${item.colorway}` : row
  })

  const subtotal = cartSubtotal(items)

  return [
    copy.heading,
    ...customerBlock(lang, customer),
    '',
    single ? copy.orderSingle : copy.orderCart,
    '',
    ...lines,
    '',
    `${copy.subtotal}: ${formatTZS(subtotal)}`,
    `${copy.delivery}: ${deliveryLine(lang, delivery)}`,
    `${copy.payment}: ${paymentLine(lang, payment)}`,
    `${copy.total}: ${formatTZS(subtotal)} + ${copy.deliveryFee}`,
    '',
    copy.closing,
    copy.sentFrom,
  ].join('\n')
}

export function singleItemOrderMessage(product, size, qty, options = {}) {
  return buildOrderMessage({
    ...options,
    single: true,
    items: [
      {
        name: product.name,
        colorway: product.colorway,
        size,
        qty,
        price: product.price,
      },
    ],
  })
}

export function cartOrderMessage(items, options = {}) {
  return buildOrderMessage({ ...options, items })
}

export function openWhatsApp(message) {
  window.open(whatsappLink(message), '_blank', 'noopener,noreferrer')
}

