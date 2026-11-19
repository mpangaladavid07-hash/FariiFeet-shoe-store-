// Dev-only smoke test for the on-site order engine (no browser required):
// order IDs, phone normalisation, totals and the localStorage fallback.
//   node orders-check.mjs        (or: npm run check:orders)
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: 'custom',
  logLevel: 'warn',
})

let failures = 0
const check = (label, condition, detail = '') => {
  if (condition) console.log(`OK    ${label}`)
  else {
    failures += 1
    console.log(`FAIL  ${label} ${detail}`)
  }
}

try {
  const {
    buildOrder,
    placeOrder,
    orderSummaryText,
    orderWhatsAppLink,
    ORDER_STATUSES,
    statusLabelKey,
  } = await vite.ssrLoadModule('/src/lib/orders.js')
  const {
    normalizePhone,
    formatPhone,
    cartTotal,
    deliveryFeeFor,
    paymentMethodsFor,
    defaultPaymentFor,
    paymentForDelivery,
    legacyPaymentId,
  } = await vite.ssrLoadModule('/src/lib/store.js')

  check('phone 0754…', normalizePhone('0754 623 904') === '+255754623904', normalizePhone('0754 623 904'))
  check('phone +255…', normalizePhone('+255 754 623 904') === '+255754623904')
  check('phone 255…', normalizePhone('255754623904') === '+255754623904')
  check('phone invalid → empty', normalizePhone('12345') === '')
  check('formatPhone', formatPhone('0754623904') === '+255 754 623 904', formatPhone('0754623904'))
  check('delivery fees default 0', deliveryFeeFor('dar') === 0 && deliveryFeeFor('countrywide') === 0)
  check('cartTotal', cartTotal([{ price: 145000, qty: 2 }], 'dar') === 290000)

  check(
    'Dar payments',
    paymentMethodsFor('dar')
      .map((method) => method.id)
      .join(',') === 'cod,momo',
    paymentMethodsFor('dar')
      .map((method) => method.id)
      .join(','),
  )
  check(
    'countrywide payments',
    paymentMethodsFor('countrywide')
      .map((method) => method.id)
      .join(',') === 'momo,lipa',
    paymentMethodsFor('countrywide')
      .map((method) => method.id)
      .join(','),
  )
  check('default payment · Dar', defaultPaymentFor('dar') === 'cod')
  check('default payment · countrywide', defaultPaymentFor('countrywide') === 'lipa')
  check('valid payment kept', paymentForDelivery('dar', 'momo') === 'momo')
  check('invalid payment reset', paymentForDelivery('dar', 'lipa') === 'cod')
  check(
    'legacy payment ids',
    legacyPaymentId('cod') === 'cash' && legacyPaymentId('lipa') === 'mpesa',
  )

  const order = buildOrder({
    items: [
      { id: 'a', name: 'Pair A', colorway: 'Silver', size: 38, qty: 2, price: 145000, image: '/x.jpg' },
      { id: 'b', name: 'Pair B', colorway: 'Black', size: 40, qty: 1, price: 98000, image: '/y.jpg' },
    ],
    customer: { name: '  Amina Juma ', phone: '0754 623 904', area: 'Mikocheni', region: '' },
    delivery: 'dar',
    payment: 'cod',
    lang: 'en',
  })

  check('order id format', /^FF-\d{4}-[A-Z0-9]{4}$/.test(order.id), order.id)
  check('order subtotal', order.subtotal === 388000, String(order.subtotal))
  check('order total', order.total === 388000, String(order.total))
  check('customer trimmed', order.customer.name === 'Amina Juma')
  check('customer phone normalised', order.customer.phone === '+255754623904')
  check('status starts pending', order.status === 'pending')
  check('two line items', order.items.length === 2 && order.items[0].size === 38)

  const summary = orderSummaryText(order, 'en')
  check('summary · order id', summary.includes(order.id), summary)
  check(
    'summary · customer + phone',
    summary.includes('Amina Juma') && summary.includes('+255 754 623 904'),
  )
  check('summary · delivery area', summary.includes('Mikocheni') && summary.includes('Dar es Salaam'))
  check('summary · payment', summary.includes('Cash on Delivery'))
  check(
    'summary · item lines',
    summary.includes('1. Pair A — EU 38 x 2 — TZS 290,000') &&
      summary.includes('2. Pair B — EU 40 x 1 — TZS 98,000'),
    summary,
  )
  check('summary · total', summary.includes('TZS 388,000'))

  const swSummary = orderSummaryText(order, 'sw')
  check('summary · Swahili', swSummary.includes('Namba ya oda') && swSummary.includes(order.id))

  const link = orderWhatsAppLink(order, 'en')
  check(
    'whatsapp · shop number',
    link.startsWith('https://wa.me/255754623904?text='),
    link.slice(0, 48),
  )
  check('whatsapp · prefilled text', link.includes(encodeURIComponent(order.id)))

  const countryOrder = buildOrder({
    items: [{ id: 'c', name: 'Pair C', colorway: 'Tan', size: 40, qty: 1, price: 145000 }],
    customer: { name: 'Juma Ally', phone: '0712 345 678', area: 'Njiro', region: 'Arusha' },
    delivery: 'countrywide',
    payment: 'lipa',
    lang: 'en',
  })
  const countrySummary = orderSummaryText(countryOrder, 'en')
  check(
    'summary · countrywide',
    countrySummary.includes('Arusha') &&
      countrySummary.includes('Lipa Namba / Mobile Money Transfer') &&
      countrySummary.includes('Bus / courier'),
    countrySummary,
  )
  check('summary · fee pending', countrySummary.includes('Confirmed by phone'))
  check('country order fee', countryOrder.total === 145000, String(countryOrder.total))

  const saved = await placeOrder({
    items: [{ id: 'a', name: 'Pair A', colorway: 'Silver', size: 38, qty: 1, price: 145000, image: '/x.jpg' }],
    customer: { name: 'Test Buyer', phone: '0754623904', area: 'Masaki', region: '' },
    delivery: 'dar',
    payment: 'momo',
    lang: 'en',
  })
  check('falls back to local source', saved.source === 'local', saved.source)

  check('statuses', ORDER_STATUSES.join(',') === 'pending,out_for_delivery,delivered')
  check('status labels', statusLabelKey('delivered') === 'admin.statusDelivered')
} finally {
  await vite.close()
}

process.exit(failures ? 1 : 0)
