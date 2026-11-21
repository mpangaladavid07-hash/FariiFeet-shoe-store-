import { useCallback, useEffect, useMemo, useState } from 'react'
import AnnouncementBar from './components/AnnouncementBar'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ProductGrid from './components/ProductGrid'
import InstagramGallery from './components/InstagramGallery'
import EditorialStory from './components/EditorialStory'
import ConciergeCTA from './components/ConciergeCTA'
import Footer from './components/Footer'
import ProductModal from './components/ProductModal'
import CartDrawer from './components/CartDrawer'
import { cartLineId, getCatalogueProduct, useCatalogue } from './lib/catalogue'
import { useI18n } from './lib/i18n'
import { cartCount, whatsappLink } from './lib/store'
import { WhatsAppIcon } from './components/Icons'

const BAG_STORAGE_KEY = 'fariifeet-bag-v1'

/* The bag is persisted as id + size + colour + qty, never as prices, so a price
   edit in the Supabase dashboard is picked up the next time the bag is hydrated. */
function readBagEntries() {
  try {
    const raw = window.localStorage.getItem(BAG_STORAGE_KEY)
    if (!raw) return []
    const saved = JSON.parse(raw)
    if (!Array.isArray(saved)) return []
    return saved.filter((entry) => entry && entry.productId)
  } catch {
    return []
  }
}

function resolveBagEntries(entries) {
  return entries
    .map((entry) => {
      const product = getCatalogueProduct(entry.productId)
      const qty = Number(entry.qty)
      const size = Number(entry.size)
      if (!product || !qty) return null
      if (!(product.sizes || []).includes(size)) return null
      const color = String(entry.color || '').trim()
      return {
        ...product,
        size,
        color,
        qty: Math.min(10, Math.max(1, qty)),
        lineId: entry.lineId || cartLineId(product.id, size, color),
      }
    })
    .filter(Boolean)
}

/** Keep quantities changed this session, but refresh the product snapshot. */
function mergeBagLines(resolved, current) {
  const lines = new Map(resolved.map((line) => [line.lineId, line]))
  current.forEach((line) => {
    const known = lines.get(line.lineId)
    lines.set(line.lineId, known ? { ...known, qty: line.qty } : line)
  })
  return Array.from(lines.values())
}


export default function App() {
  const { t } = useI18n()
  const { products, source: catalogueSource } = useCatalogue()
  const [bagEntries] = useState(readBagEntries)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [cartItems, setCartItems] = useState(() => resolveBagEntries(bagEntries))
  const [cartOpen, setCartOpen] = useState(false)

  const filteredProducts = useMemo(() => {
    const search = query.trim().toLowerCase()

    return products.filter((product) => {
      /* A search always sweeps the whole catalogue — even if a category tab was
         active when the shopper started typing — so results never dead-end. */
      if (search) {
        const haystack = [
          product.name,
          product.colorway,
          product.category,
          product.badge,
          product.blurb,
          product.description,
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(search)
      }

      if (category === 'all') return true
      return category === 'new' ? product.isNew : product.category === category
    })
  }, [query, category, products])

  const itemCount = cartCount(cartItems)

  useEffect(() => {
    try {
      const payload = cartItems.map(({ id, size, qty, lineId, color }) => ({
        productId: id,
        size,
        color: color || '',
        qty,
        lineId,
      }))
      window.localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* cart still works in memory when storage is unavailable */
    }
  }, [cartItems])

  /* When the Supabase catalogue lands — and every time a Realtime edit
     replaces it — re-resolve the saved bag so dashboard prices, colours and
     shoes added only in Supabase show up in the cart too. */
  useEffect(() => {
    if (catalogueSource !== 'cloud') return
    setCartItems((current) => mergeBagLines(resolveBagEntries(bagEntries), current))
  }, [catalogueSource, products, bagEntries])

  useEffect(() => {
    const locked = Boolean(selectedProduct) || cartOpen
    const previous = document.body.style.overflow
    if (locked) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [selectedProduct, cartOpen])

  const scrollToShop = useCallback(() => {
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleCategoryChange = useCallback(
    (nextCategory) => {
      setCategory(nextCategory)
      scrollToShop()
    },
    [scrollToShop],
  )

  /* Typing in the search box clears the category tab so the grid can match
     across every shoe instead of showing "0 pairs" inside one filter. */
  const handleQueryChange = useCallback((nextQuery) => {
    setQuery(nextQuery)
    if (nextQuery.trim()) setCategory('all')
  }, [])

  const handleShopAll = useCallback(() => {
    setCategory('all')
    scrollToShop()
  }, [scrollToShop])

  const handleReset = useCallback(() => {
    setQuery('')
    setCategory('all')
  }, [])

  const handleShopSimilar = useCallback(
    (post) => {
      const product = post?.productId ? getCatalogueProduct(post.productId) : null
      if (product) {
        setSelectedProduct(product)
        return
      }
      setCategory(post?.category && post.category !== 'all' ? post.category : 'all')
      scrollToShop()
    },
    [scrollToShop],
  )

  const openCart = useCallback(() => {
    setSelectedProduct(null)
    setCartOpen(true)
  }, [])

  const addToCart = useCallback((product, size, qty, color = '') => {
    const shade = String(color || '').trim()
    const lineId = cartLineId(product.id, size, shade)
    setCartItems((current) => {
      const existing = current.find((item) => item.lineId === lineId)
      if (existing) {
        return current.map((item) =>
          item.lineId === lineId ? { ...item, qty: Math.min(10, item.qty + qty) } : item,
        )
      }
      return [...current, { ...product, size, color: shade, qty, lineId }]
    })
    setSelectedProduct(null)
    setCartOpen(true)
  }, [])

  const updateQty = useCallback((lineId, nextQty) => {
    setCartItems((current) => {
      if (nextQty < 1) return current.filter((item) => item.lineId !== lineId)
      return current.map((item) =>
        item.lineId === lineId ? { ...item, qty: Math.min(10, nextQty) } : item,
      )
    })
  }, [])

  const removeItem = useCallback((lineId) => {
    setCartItems((current) => current.filter((item) => item.lineId !== lineId))
  }, [])

  const handleOrderPlaced = useCallback(() => {
    setCartItems([])
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <AnnouncementBar />
      <Navbar
        query={query}
        onQueryChange={handleQueryChange}
        category={category}
        onCategoryChange={handleCategoryChange}
        cartCount={itemCount}
        onOpenCart={openCart}
      />

      <main>
        <Hero onShopNow={handleShopAll} />
        <ProductGrid
          products={filteredProducts}
          category={category}
          onCategoryChange={handleCategoryChange}
          onSelect={setSelectedProduct}
          onAddToCart={addToCart}
          query={query}
          onReset={handleReset}
        />
        <InstagramGallery onShopSimilar={handleShopSimilar} />
        <EditorialStory onShopAll={handleShopAll} />
        <ConciergeCTA />
      </main>

      <Footer onCategorySelect={handleCategoryChange} />

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
      />
      <CartDrawer
        open={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onUpdateQty={updateQty}
        onRemove={removeItem}
        onOrderPlaced={handleOrderPlaced}
      />

      <a
        href={whatsappLink(t('wa.browse'))}
        target="_blank"
        rel="noreferrer"
        aria-label={t('footer.chatLabel')}
        className={`fixed bottom-5 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-emerald text-obsidian shadow-[0_18px_35px_-15px_rgba(16,185,129,0.9)] transition hover:scale-105 md:hidden ${
          selectedProduct || cartOpen ? 'hidden' : ''
        }`}
      >
        <WhatsAppIcon className="h-6 w-6" />
      </a>
    </div>
  )
}
