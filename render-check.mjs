// Dev-only smoke test: renders <LanguageProvider><App /></LanguageProvider> through
// Vite's SSR module loader with a minimal DOM mock. Catches runtime crashes that
// static JSX/i18n checks cannot see (e.g. a missing import -> blank page).
//   node render-check.mjs        (or: npm run check:render)
import { createServer } from 'vite'

const store = new Map()
const classList = {
  _set: new Set(),
  contains(name) {
    return this._set.has(name)
  },
  add(name) {
    this._set.add(name)
  },
  remove(name) {
    this._set.delete(name)
  },
  toggle(name, force) {
    const next = force === undefined ? !this._set.has(name) : Boolean(force)
    if (next) this._set.add(name)
    else this._set.delete(name)
    return next
  },
}

const mediaQuery = {
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
}

try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { language: 'en-US' },
    configurable: true,
    writable: true,
  })
} catch {
  /* recent Node versions ship a read-only navigator; its language is fine */
}

globalThis.matchMedia = () => mediaQuery
globalThis.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  },
  navigator: globalThis.navigator,
  matchMedia: globalThis.matchMedia,
  location: { href: 'http://localhost:5173/' },
  devicePixelRatio: 1,
  addEventListener() {},
  removeEventListener() {},
  requestAnimationFrame: (callback) => setTimeout(() => callback(Date.now()), 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  setInterval: (...args) => setInterval(...args),
  clearInterval: (id) => clearInterval(id),
  scrollTo() {},
  open() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
}
globalThis.document = {
  documentElement: { lang: 'en', classList, style: {} },
  body: { style: {}, classList },
  visibilityState: 'visible',
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  addEventListener() {},
  removeEventListener() {},
  createElement: () => ({ style: {}, classList, setAttribute() {}, appendChild() {} }),
}

const vite = await createServer({
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: 'custom',
  logLevel: 'warn',
})

let failed = false

try {
  const React = (await import('react')).default
  const { renderToString } = await import('react-dom/server')
  const { default: App } = await vite.ssrLoadModule('/src/App.jsx')
  const { default: ProductModal } = await vite.ssrLoadModule('/src/components/ProductModal.jsx')
  const { default: ProductCard } = await vite.ssrLoadModule('/src/components/ProductCard.jsx')
  const { default: CartDrawer, CheckoutForm, OrderReceipt } = await vite.ssrLoadModule(
    '/src/components/CartDrawer.jsx',
  )
  const { default: AdminPage } = await vite.ssrLoadModule('/src/components/AdminPage.jsx')
  const { LanguageProvider, translate } = await vite.ssrLoadModule('/src/lib/i18n.jsx')
  const { products } = await vite.ssrLoadModule('/src/data/products.js')

  const h = React.createElement
  const noop = () => {}
  const first = products[0]
  const second = products[1]
  const bag = [
    { ...first, size: first.sizes[0], qty: 2, lineId: `${first.id}-${first.sizes[0]}` },
    { ...second, size: second.sizes[0], qty: 1, lineId: `${second.id}-${second.sizes[0]}` },
  ]

  const tEn = (key, vars) => translate('en', key, vars)
  const demoOrder = {
    id: 'FF-2026-TEST',
    createdAt: new Date().toISOString(),
    status: 'pending',
    customer: { name: 'Amina Juma', phone: '+255754623904', area: 'Mikocheni', region: '' },
    delivery: 'dar',
    payment: 'cod',
    subtotal: first.price,
    deliveryFee: 0,
    total: first.price,
    items: [
      {
        productId: first.id,
        name: first.name,
        colorway: first.colorway,
        size: first.sizes[0],
        qty: 1,
        price: first.price,
        image: first.image,
      },
    ],
    language: 'en',
    source: 'local',
  }

  const cases = [
    { name: 'App · EN', lang: 'en', element: h(App), min: 50000, probes: ['Step into', 'Shop Now', 'FariiFeet', 'Add to bag'] },
    { name: 'App · SW', lang: 'sw', element: h(App), min: 50000, probes: ['FariiFeet'] },
    {
      name: 'ProductModal',
      lang: 'en',
      element: h(ProductModal, { product: first, onClose: noop, onAddToCart: noop }),
      min: 2000,
      probes: [first.name, 'Select EU size', 'Select colour', 'Silver', 'EU 36 - 45'],
    },
    {
      name: 'CartDrawer',
      lang: 'en',
      element: h(CartDrawer, {
        open: true,
        items: bag,
        onClose: noop,
        onUpdateQty: noop,
        onRemove: noop,
        onOrderPlaced: noop,
      }),
      min: 2000,
      probes: [first.name, 'Continue to checkout'],
    },
    {
      name: 'ProductCard + quick add',
      lang: 'en',
      element: h(ProductCard, { product: first, onSelect: noop, onAddToCart: noop, index: 0 }),
      min: 1500,
      probes: ['Add to bag', 'Select size', first.name, '36 - 45', 'Silver / White / Black'],
    },
    {
      name: 'AdminPage (locked)',
      lang: 'en',
      element: h(AdminPage),
      min: 800,
      probes: ['Enter your staff PIN'],
    },
    {
      name: 'CheckoutForm · countrywide',
      lang: 'en',
      element: h(CheckoutForm, {
        form: { name: '', phone: '', area: '', region: '' },
        onFieldChange: noop,
        delivery: 'countrywide',
        onDeliveryChange: noop,
        payment: 'lipa',
        onPaymentChange: noop,
        errors: {},
        submitError: '',
        submitting: false,
        onSubmit: noop,
        t: tEn,
      }),
      min: 3000,
      probes: [
        'Mobile Money on Delivery',
        'Lipa Namba / Mobile Money Transfer',
        'Region / town',
        'Arusha · Mwanza · Dodoma · Mbeya',
      ],
      absent: ['Cash on Delivery', 'Kinondoni · Mikocheni'],
    },
    {
      name: 'CheckoutForm · Dar',
      lang: 'en',
      element: h(CheckoutForm, {
        form: { name: '', phone: '', area: '', region: '' },
        onFieldChange: noop,
        delivery: 'dar',
        onDeliveryChange: noop,
        payment: 'cod',
        onPaymentChange: noop,
        errors: {},
        submitError: '',
        submitting: false,
        onSubmit: noop,
        t: tEn,
      }),
      min: 3000,
      probes: ['Cash on Delivery', 'Mobile Money on Delivery', 'Kinondoni · Mikocheni'],
      absent: ['Lipa Namba', 'Region / town'],
    },
    {
      name: 'OrderReceipt',
      lang: 'en',
      element: h(OrderReceipt, { order: demoOrder, t: tEn, lang: 'en', onClose: noop }),
      min: 2000,
      probes: [
        'FF-2026-TEST',
        first.name,
        'Order confirmed',
        'Copy order details',
        'Send this order on WhatsApp',
      ],
    },
  ]

  for (const scenario of cases) {
    try {
      store.set('fariifeet-language-v1', scenario.lang)
      const html = renderToString(h(LanguageProvider, null, scenario.element))
      const missing = scenario.probes.filter((probe) => !html.includes(probe))
      const leaked = (scenario.absent || []).filter((probe) => html.includes(probe))
      if (html.length < scenario.min || missing.length || leaked.length) {
        failed = true
        console.log(
          `FAIL  ${scenario.name}: ${html.length} chars${
            missing.length ? `, missing ${JSON.stringify(missing)}` : ''
          }${leaked.length ? `, should be absent ${JSON.stringify(leaked)}` : ''}`,
        )
      } else {
        console.log(`OK    ${scenario.name} rendered ${html.length} chars`)
      }
    } catch (error) {
      failed = true
      console.log(`FAIL  ${scenario.name}: ${error?.message || error}`)
    }
  }
} catch (error) {
  failed = true
  console.log('FAIL  could not load the app modules')
  console.log(error?.stack || error)
} finally {
  await vite.close()
}

process.exit(failed ? 1 : 0)
