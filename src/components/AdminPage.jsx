import { useCallback, useEffect, useState } from 'react'
import { ADMIN_PIN, ADMIN_SESSION_KEY, isSupabaseConfigured } from '../lib/config'
import { useCatalogue } from '../lib/catalogue'
import { ORDER_STATUSES, loadOrders, setOrderStatus, statusLabelKey } from '../lib/orders'
import { CHECKOUT_PAYMENTS, DELIVERY_OPTIONS, formatPhone, formatTZS } from '../lib/store'
import { useI18n } from '../lib/i18n'
import {
  BagIcon,
  CheckIcon,
  PhoneIcon,
  PinIcon,
  RefreshIcon,
  ShieldIcon,
  TruckIcon,
  UserIcon,
} from './Icons'

const FILTERS = ['all', ...ORDER_STATUSES]

const STATUS_STYLES = {
  pending: 'bg-blush/50 text-plum',
  out_for_delivery: 'bg-emerald/20 text-emerald',
  delivered: 'bg-plum text-shell',
}

function formatAdminDate(iso, lang) {
  try {
    return new Intl.DateTimeFormat(lang === 'sw' ? 'sw-TZ' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch (error) {
    return String(iso || '')
  }
}

function readUnlocked() {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY) === 'yes'
  } catch (error) {
    return false
  }
}

function OrderCard({ order, t, lang, busy, onStatusChange }) {
  const payment = CHECKOUT_PAYMENTS.find((method) => method.id === order.payment)
  const delivery = DELIVERY_OPTIONS.find((option) => option.id === order.delivery)
  const phone = order.customer.phone

  return (
    <article className="rounded-2xl border border-blushline bg-panel p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-chat text-xs font-bold tracking-[0.1em] text-plum">{order.id}</p>
          <p className="mt-0.5 text-[10px] text-plum-soft">
            {t('admin.placed', { date: formatAdminDate(order.createdAt, lang) })}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 font-chat text-[9px] font-bold uppercase tracking-[0.1em] ${
            STATUS_STYLES[order.status] || STATUS_STYLES.pending
          }`}
        >
          {t(statusLabelKey(order.status))}
        </span>
      </div>

      <div className="mt-3 grid gap-1.5 text-[11px]">
        <p className="flex items-center gap-2 text-plum">
          <UserIcon className="h-3.5 w-3.5 text-plum-soft" />
          <span className="font-semibold">{order.customer.name}</span>
        </p>
        <p className="flex items-center gap-2">
          <PhoneIcon className="h-3.5 w-3.5 text-plum-soft" />
          <a href={`tel:${phone}`} className="font-semibold text-plum hover:underline">
            {formatPhone(phone)}
          </a>
        </p>
        <p className="flex items-start gap-2 text-plum">
          <PinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-plum-soft" />
          <span>
            {order.customer.area}
            {order.customer.region ? `, ${order.customer.region}` : ''}
          </span>
        </p>
        <p className="flex items-center gap-2 text-plum-soft">
          <TruckIcon className="h-3.5 w-3.5" />
          {delivery ? t(delivery.labelKey) : order.delivery}
        </p>
        <p className="flex items-center gap-2 text-plum-soft">
          <ShieldIcon className="h-3.5 w-3.5" />
          {payment ? t(payment.labelKey) : order.payment}
        </p>
      </div>

      <ul className="mt-3 space-y-1 border-t border-blushline pt-2.5">
        {order.items.map((item) => (
          <li
            key={`${item.productId || item.name}-${item.size}`}
            className="flex items-baseline justify-between gap-2 text-[11px]"
          >
            <span className="min-w-0 truncate text-plum">{item.name}</span>
            <span className="shrink-0 font-chat text-[10px] text-plum-soft">
              {t('admin.sizeQty', { size: item.size, qty: item.qty })}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-baseline justify-between border-t border-blushline pt-2">
        <span className="font-chat text-[10px] font-bold uppercase tracking-[0.14em] text-plum-soft">
          {t('admin.total')}
        </span>
        <span className="font-display text-sm font-extrabold text-plum">{formatTZS(order.total)}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {ORDER_STATUSES.map((status) => {
          const active = order.status === status
          return (
            <button
              key={status}
              type="button"
              disabled={active || busy}
              onClick={() => onStatusChange(order.id, status)}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 font-chat text-[9px] font-bold uppercase tracking-[0.08em] transition disabled:cursor-default ${
                active
                  ? 'border-plum bg-plum text-shell'
                  : 'border-blushline bg-shell-soft text-plum-soft hover:border-plum/40 hover:text-plum disabled:opacity-60'
              }`}
            >
              {active && <CheckIcon className="h-2.5 w-2.5" />}
              {t(statusLabelKey(status))}
            </button>
          )
        })}
      </div>
    </article>
  )
}


export default function AdminPage() {
  const { t, lang } = useI18n()
  const catalogue = useCatalogue()
  const [unlocked, setUnlocked] = useState(readUnlocked)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [orders, setOrders] = useState([])
  const [source, setSource] = useState(isSupabaseConfigured ? 'cloud' : 'local')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState('all')
  const [busyId, setBusyId] = useState('')
  const [statusError, setStatusError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const result = await loadOrders()
      setOrders(result.orders)
      setSource(result.source)
    } catch (error) {
      setLoadError(t('admin.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (unlocked) load()
  }, [unlocked, load])

  const handleUnlock = (event) => {
    event.preventDefault()
    if (pin.trim() === ADMIN_PIN) {
      try {
        window.sessionStorage.setItem(ADMIN_SESSION_KEY, 'yes')
      } catch (error) {
        /* storage blocked — the session simply will not persist */
      }
      setUnlocked(true)
      setPin('')
      setPinError('')
      return
    }
    setPinError(t('admin.wrongPin'))
  }

  const handleLock = () => {
    try {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY)
    } catch (error) {
      /* ignore */
    }
    setUnlocked(false)
    setOrders([])
  }

  const handleStatus = async (id, status) => {
    setBusyId(id)
    setStatusError('')
    try {
      const updated = await setOrderStatus(id, status)
      setOrders((current) =>
        current.map((order) => (order.id === id ? { ...order, status: updated.status } : order)),
      )
    } catch (error) {
      setStatusError(t('admin.updateError'))
    } finally {
      setBusyId('')
    }
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-shell px-5 py-10 text-plum">
        <form
          onSubmit={handleUnlock}
          className="w-full max-w-sm rounded-3xl border border-blushline bg-panel p-7 shadow-soft"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blush/40 text-plum">
            <ShieldIcon className="h-6 w-6" />
          </span>
          <p className="eyebrow-plum mt-4">{t('admin.eyebrow')}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight">
            {t('admin.pinTitle')}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-plum-soft">{t('admin.pinCopy')}</p>

          <label className="mt-5 block">
            <span className="mb-1 block font-chat text-[10px] font-semibold uppercase tracking-[0.12em] text-plum-soft">
              {t('admin.pin')}
            </span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={pin}
              onChange={(event) => {
                setPin(event.target.value)
                setPinError('')
              }}
              placeholder={t('admin.pinPlaceholder')}
              className="field-light text-center text-lg tracking-[0.4em]"
            />
          </label>

          {pinError && (
            <p className="mt-2 rounded-xl border border-[#D79BAC] bg-blush/30 px-3 py-2 text-[11px] font-medium text-plum">
              {pinError}
            </p>
          )}

          <button type="submit" className="btn-plum mt-4 w-full">
            {t('admin.unlock')}
          </button>

          <p className="mt-3 text-center text-[9px] leading-relaxed text-plum-soft">
            {t('admin.pinHint')}
          </p>
          <a
            href="/"
            className="mt-2 block text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-plum-soft transition hover:text-plum"
          >
            {t('receipt.continue')}
          </a>
        </form>
      </div>
    )
  }

  const visible = filter === 'all' ? orders : orders.filter((order) => order.status === filter)

  return (
    <div className="min-h-screen bg-shell text-plum">
      <header className="border-b border-blushline bg-panel">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="eyebrow-plum">{t('admin.eyebrow')}</p>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight">
              {t('admin.title')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="flex h-9 items-center gap-1.5 rounded-full border border-blushline bg-shell-soft px-3 font-chat text-[10px] font-bold uppercase tracking-[0.12em] text-plum transition hover:border-plum/40 disabled:opacity-60"
            >
              <RefreshIcon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {t('admin.refresh')}
            </button>
            <button
              type="button"
              onClick={handleLock}
              className="flex h-9 items-center gap-1.5 rounded-full bg-plum px-3 font-chat text-[10px] font-bold uppercase tracking-[0.12em] text-shell transition hover:bg-obsidian hover:text-rose"
            >
              <ShieldIcon className="h-3.5 w-3.5" />
              {t('admin.lock')}
            </button>
          </div>
        </div>
      </header>

      <main className="container-page py-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-chat text-[9px] font-bold uppercase tracking-[0.1em] ${
              source === 'cloud' ? 'bg-emerald/15 text-emerald' : 'bg-blush/50 text-plum'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {source === 'cloud' ? t('admin.cloud') : t('admin.local')}
          </span>
          <span className="font-chat text-[10px] uppercase tracking-[0.12em] text-plum-soft">
            {t(orders.length === 1 ? 'admin.orderOne' : 'admin.orders', { count: orders.length })}
          </span>
          <span className="font-chat text-[10px] uppercase tracking-[0.12em] text-plum-soft">
            {t(catalogue.isCloud ? 'admin.catalogueCloud' : 'admin.catalogueLocal', {
              count: catalogue.products.length,
            })}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FILTERS.map((key) => {
            const value =
              key === 'all' ? orders.length : orders.filter((order) => order.status === key).length
            const active = filter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={active}
                className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                  active
                    ? 'border-plum bg-blush/30'
                    : 'border-blushline bg-panel hover:border-plum/30'
                }`}
              >
                <span className="block font-display text-xl font-extrabold tabular-nums text-plum">
                  {value}
                </span>
                <span className="mt-0.5 block font-chat text-[9px] font-semibold uppercase tracking-[0.1em] text-plum-soft">
                  {key === 'all' ? t('admin.all') : t(statusLabelKey(key))}
                </span>
              </button>
            )
          })}
        </div>

        {loadError && (
          <p className="mt-3 rounded-xl border border-[#D79BAC] bg-blush/30 px-3 py-2 text-[11px] font-medium text-plum">
            {loadError}
          </p>
        )}
        {statusError && (
          <p className="mt-3 rounded-xl border border-[#D79BAC] bg-blush/30 px-3 py-2 text-[11px] font-medium text-plum">
            {statusError}
          </p>
        )}

        {loading && orders.length === 0 ? (
          <p className="mt-10 flex items-center justify-center gap-2 text-xs text-plum-soft">
            <RefreshIcon className="h-4 w-4 animate-spin" />
            {t('admin.loading')}
          </p>
        ) : visible.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-3xl border border-dashed border-blushline bg-panel/70 px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-blushline bg-shell-soft text-plum-soft">
              <BagIcon className="h-6 w-6" />
            </span>
            <h2 className="mt-5 font-display text-2xl font-bold text-plum">
              {orders.length === 0 ? t('admin.empty') : t('admin.noOrdersHere')}
            </h2>
            {orders.length === 0 && (
              <p className="mt-2 max-w-sm text-sm text-plum-soft">{t('admin.emptyCopy')}</p>
            )}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {visible.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                t={t}
                lang={lang}
                busy={busyId === order.id}
                onStatusChange={handleStatus}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
