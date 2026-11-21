import { ORDERS_STORAGE_KEY, SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from './config'
import {
  CHECKOUT_PAYMENTS,
  DELIVERY_OPTIONS,
  deliveryFeeFor,
  formatPhone,
  formatTZS,
  normalizePhone,
  whatsappLink,
} from './store'
import { translate } from './i18n'

/**
 * Order persistence for the on-site checkout.
 *
 * Primary store: Supabase (REST, no SDK dependency) — table defined in
 * `supabase/schema.sql`. When the VITE_SUPABASE_* keys are missing, or the
 * request fails, the order is written to `localStorage` instead and marked
 * `source: 'local'`, so a customer never loses an order during testing.
 */

export const ORDER_STATUSES = ['pending', 'out_for_delivery', 'delivered']

const STATUS_LABEL_KEYS = {
  pending: 'admin.statusPending',
  out_for_delivery: 'admin.statusOut',
  delivered: 'admin.statusDelivered',
}

export const statusLabelKey = (status) => STATUS_LABEL_KEYS[status] || STATUS_LABEL_KEYS.pending

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const REQUEST_TIMEOUT = 12000

/* ------------------------------------------------------------------ */
/* Order IDs — FF-2026-XXXX                                            */
/* ------------------------------------------------------------------ */

function randomBlock(length = 4) {
  const values = new Uint32Array(length)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(values)
  } else {
    for (let index = 0; index < length; index += 1) {
      values[index] = Math.floor(Math.random() * 4294967296)
    }
  }
  return Array.from(values, (value) => ID_ALPHABET[value % ID_ALPHABET.length]).join('')
}

/** `FF-2026-7K2Q` — short enough to quote over the phone. */
export function makeOrderId(date = new Date()) {
  return `FF-${date.getFullYear()}-${randomBlock(4)}`
}

/* ------------------------------------------------------------------ */
/* Supabase REST helpers                                               */
/* ------------------------------------------------------------------ */

const requestHeaders = (extra = {}) => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  ...extra,
})

async function supabaseRequest(path, options = {}) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT) : null

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      signal: controller?.signal,
      headers: requestHeaders(options.headers),
    })
    if (!response.ok) throw new Error(`Supabase responded ${response.status}`)
    if (response.status === 204) return null
    const text = await response.text()
    return text ? JSON.parse(text) : null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/* ------------------------------------------------------------------ */
/* Row ↔ order mapping                                                 */
/* ------------------------------------------------------------------ */

export function orderToRow(order) {
  return {
    id: order.id,
    created_at: order.createdAt,
    status: order.status,
    customer_name: order.customer.name,
    customer_phone: order.customer.phone,
    delivery_area: order.customer.area,
    region: order.customer.region || null,
    delivery_type: order.delivery,
    payment_method: order.payment,
    subtotal: order.subtotal,
    delivery_fee: order.deliveryFee,
    total: order.total,
    items: order.items,
    language: order.language || 'en',
    notes: order.notes || null,
  }
}

export function rowToOrder(row) {
  if (!row || typeof row !== 'object') return null
  return {
    id: row.id,
    createdAt: row.created_at,
    status: ORDER_STATUSES.includes(row.status) ? row.status : 'pending',
    customer: {
      name: row.customer_name || '',
      phone: row.customer_phone || '',
      area: row.delivery_area || '',
      region: row.region || '',
    },
    delivery: row.delivery_type || 'dar',
    payment: row.payment_method || 'cod',
    subtotal: Number(row.subtotal) || 0,
    deliveryFee: Number(row.delivery_fee) || 0,
    total: Number(row.total) || 0,
    items: Array.isArray(row.items) ? row.items : [],
    language: row.language || 'en',
    notes: row.notes || '',
    source: 'cloud',
  }
}

/* ------------------------------------------------------------------ */
/* localStorage fallback                                               */
/* ------------------------------------------------------------------ */

const hasStorage = () => {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage)
  } catch (error) {
    return false
  }
}

export function readLocalOrders() {
  if (!hasStorage()) return []
  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((order) => order && order.id) : []
  } catch (error) {
    return []
  }
}

function writeLocalOrders(orders) {
  if (!hasStorage()) return
  try {
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders))
  } catch (error) {
    /* storage full or blocked — the on-screen receipt still renders */
  }
}

function storeLocalOrder(order, source = 'local') {
  const existing = readLocalOrders().filter((entry) => entry.id !== order.id)
  writeLocalOrders([{ ...order, source }, ...existing])
}

function patchLocalOrder(id, patch) {
  const existing = readLocalOrders()
  if (!existing.some((entry) => entry.id === id)) return null
  let updated = null
  const next = existing.map((entry) => {
    if (entry.id !== id) return entry
    updated = { ...entry, ...patch }
    return updated
  })
  writeLocalOrders(next)
  return updated
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Builds the order object that the receipt and the database both use. */
export function buildOrder({ items, customer, delivery, payment, notes = '', lang = 'en' }) {
  const subtotal = items.reduce((total, item) => total + item.price * item.qty, 0)
  const deliveryFee = deliveryFeeFor(delivery)

  return {
    id: makeOrderId(),
    createdAt: new Date().toISOString(),
    status: 'pending',
    customer: {
      name: String(customer.name || '').trim(),
      phone: normalizePhone(customer.phone) || String(customer.phone || '').trim(),
      area: String(customer.area || '').trim(),
      region: String(customer.region || '').trim(),
    },
    delivery,
    payment,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    items: items.map((item) => ({
      productId: item.id,
      name: item.name,
      color: item.color || '',
      colorway: item.colorway || '',
      size: item.size,
      qty: item.qty,
      price: item.price,
      image: item.image || '',
    })),
    language: lang,
    notes: String(notes || '').trim(),
  }
}

/** Saves the order and returns it with `source: 'cloud' | 'local'`. */
export async function placeOrder(input) {
  const order = buildOrder(input)

  if (isSupabaseConfigured) {
    try {
      const rows = await supabaseRequest('orders', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(orderToRow(order)),
      })
      const row = Array.isArray(rows) ? rows[0] : rows
      const saved = row && row.id ? rowToOrder(row) : null
      const stored = { ...order, ...(saved || {}) }
      // Mirror to localStorage as well: the order must survive even if the
      // cloud copy is cleared or this browser is offline next time.
      storeLocalOrder(stored, 'cloud')
      return { ...stored, source: 'cloud' }
    } catch (error) {
      // Never block a sale because the database is unreachable.
    }
  }

  storeLocalOrder(order)
  return { ...order, source: 'local' }
}

/** Loads orders and reports where they came from. */
export async function loadOrders({ limit = 200 } = {}) {
  if (isSupabaseConfigured) {
    try {
      const rows = await supabaseRequest(`orders?select=*&order=created_at.desc&limit=${limit}`)
      if (Array.isArray(rows)) {
        return { orders: rows.map(rowToOrder).filter(Boolean), source: 'cloud' }
      }
    } catch (error) {
      // fall through to the local copy
    }
  }

  const orders = readLocalOrders()
    .map((order) => ({ ...order, source: order.source || 'local' }))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))

  return { orders, source: 'local' }
}

/** Newest first. Falls back to the local copy whenever Supabase is unavailable. */
export async function fetchOrders(options) {
  const { orders } = await loadOrders(options)
  return orders
}

/** Moves an order through Pending → Out for delivery → Delivered & Paid. */
export async function setOrderStatus(id, status) {
  if (!ORDER_STATUSES.includes(status)) {
    throw new Error(`Unknown order status: ${status}`)
  }

  let saved = null
  if (isSupabaseConfigured) {
    try {
      const rows = await supabaseRequest(`orders?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status }),
      })
      const row = Array.isArray(rows) ? rows[0] : rows
      if (row && row.id) saved = rowToOrder(row)
    } catch (error) {
      // keep the local copy in sync even when Supabase refuses
    }
  }

  const local = patchLocalOrder(id, { status })
  if (saved) return saved
  if (local) return { ...local, source: local.source || 'local' }
  throw new Error('Order not found')
}

/* ------------------------------------------------------------------ */
/* WhatsApp hand-off                                                   */
/* ------------------------------------------------------------------ */

/**
 * The itemised order text shared by WhatsApp and the receipt's
 * "Copy order details" button: order ID, customer name and phone, delivery
 * area, payment method, every pair with its EU size, quantity and line total,
 * then the TZS totals.
 */
export function orderSummaryText(order, lang = order.language || 'en') {
  const label = (key, vars) => translate(lang, `orderMessage.${key}`, vars)
  const customer = order.customer || {}
  const items = Array.isArray(order.items) ? order.items : []
  const delivery = DELIVERY_OPTIONS.find((option) => option.id === order.delivery)
  const payment = CHECKOUT_PAYMENTS.find((method) => method.id === order.payment)
  const area = [customer.area, customer.region].filter(Boolean).join(', ')
  const deliveryFee = order.deliveryFee
    ? formatTZS(order.deliveryFee)
    : translate(lang, order.delivery === 'dar' ? 'checkout.freeDelivery' : 'checkout.feePending')

  return [
    `${label('heading')} · FariiFeet`,
    `${label('orderId')}: ${order.id}`,
    `${label('customer')}: ${customer.name || ''}`,
    `${label('phone')}: ${formatPhone(customer.phone)}`,
    `${label('delivery')}: ${delivery ? translate(lang, delivery.labelKey) : order.delivery}`,
    `${label('area')}: ${area}`,
    `${label('payment')}: ${payment ? translate(lang, payment.labelKey) : order.payment}`,
    '',
    `${label('items')}:`,
    ...items.map((item, index) =>
      label('item', {
        index: index + 1,
        name: item.color ? `${item.name} (${item.color})` : item.name,
        size: item.size,
        qty: item.qty,
        price: formatTZS(item.price * item.qty),
      }),
    ),
    '',
    `${label('subtotal')}: ${formatTZS(order.subtotal)}`,
    `${label('deliveryFee')}: ${deliveryFee}`,
    `${label('total')}: ${formatTZS(order.total)}`,
    '',
    label('closing'),
    label('sentFrom'),
  ].join('\n')
}

/** `https://wa.me/255754623904?text=…`, pre-filled with the whole order. */
export function orderWhatsAppLink(order, lang = order.language || 'en') {
  return whatsappLink(orderSummaryText(order, lang))
}
