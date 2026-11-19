import { useCallback, useEffect, useMemo, useState } from 'react'
import AnnouncementBar from './components/AnnouncementBar'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import FeaturesStrip from './components/FeaturesStrip'
import ProductGrid from './components/ProductGrid'
import InstagramGallery from './components/InstagramGallery'
import EditorialStory from './components/EditorialStory'
import ConciergeCTA from './components/ConciergeCTA'
import Footer from './components/Footer'
import ProductModal from './components/ProductModal'
import CartDrawer from './components/CartDrawer'
import { getProductById, products } from './data/products'
import { useI18n } from './lib/i18n'
import { cartCount, whatsappLink } from './lib/store'
import { WhatsAppIcon } from './components/Icons'

const BAG_STORAGE_KEY = 'fariifeet-bag-v1'

function loadBag() {
  try {
    const raw = window.localStorage.getItem(BAG_STORAGE_KEY)
    if (!raw) return []
    const saved = JSON.parse(raw)
    if (!Array.isArray(saved)) return []

    return saved
      .map((entry) => {
        const product = getProductById(entry?.productId)
        const qty = Number(entry?.qty)
        const size = Number(entry?.size)
        if (!product || !product.sizes.includes(size) || !qty) return null
        return {
          ...product,
          size,
          qty: Math.min(10, Math.max(1, qty)),
          lineId: entry.lineId || `${product.id}-${size}`,
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

export default function App() {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [cartItems, setCartItems] = useState(loadBag)
  const [cartOpen, setCartOpen] = useState(false)

  const filteredProducts = useMemo(() => {
    const search = query.trim().toLowerCase()

    return products.filter((product) => {
      const inCategory =
        category === 'all' ||
        (category === 'new' ? product.isNew : product.category === category)
      if (!inCategory) return false
      if (!search) return true

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
    })
  }, [query, category])

  const itemCount = cartCount(cartItems)

  useEffect(() => {
    try {
      const payload = cartItems.map(({ id, size, qty, lineId }) => ({
        productId: id,
        size,
        qty,
        lineId,
      }))
      window.localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* cart still works in memory when storage is unavailable */
    }
  }, [cartItems])

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

  const handleShopNewDrops = useCallback(() => {
    setCategory('new')
    scrollToShop()
  }, [scrollToShop])

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
      const product = post?.productId ? getProductById(post.productId) : null
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

  const addToCart = useCallback((product, size, qty) => {
    const lineId = `${product.id}-${size}`
    setCartItems((current) => {
      const existing = current.find((item) => item.lineId === lineId)
      if (existing) {
        return current.map((item) =>
          item.lineId === lineId ? { ...item, qty: Math.min(10, item.qty + qty) } : item,
        )
      }
      return [...current, { ...product, size, qty, lineId }]
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
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={handleCategoryChange}
        cartCount={itemCount}
        onOpenCart={openCart}
      />

      <main>
        <Hero
          onShopNow={handleShopAll}
          onShopNewDrops={handleShopNewDrops}
          onViewProduct={setSelectedProduct}
        />
        <FeaturesStrip />
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
