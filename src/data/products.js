export const ADULT_SIZES = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45]
export const KIDS_SIZES = [27, 28, 29, 30, 31, 32, 33, 34, 35, 36]

export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'sneakers', label: 'Sneakers' },
  { id: 'heels', label: 'Heels & Sandals' },
  { id: 'slides', label: 'Slides' },
  { id: 'new', label: 'New Drops' },
]

const adults = ADULT_SIZES
const kids = KIDS_SIZES

export const products = [
  {
    id: 'new-balance-530',
    name: 'New Balance 530 — Silver Storm',
    category: 'sneakers',
    price: 145000,
    compareAt: 175000,
    image: '/shoes/new-balance.jpg',
    colorway: 'Silver / White / Black',
    sizes: adults,
    soldOut: [36, 45],
    isNew: true,
    badge: 'Icon',
    rating: 4.9,
    blurb: 'The cult-favourite 530 in an icy silver finish.',
    description:
      'A true street-style icon, reworked in silver mesh and leather. The chunky ABZORB sole keeps every step cushioned while the metallic panels catch the Dar es Salaam sun.',
    details: ['Mesh & leather upper', 'ABZORB cushioning', 'True to size — go half up for a roomier fit'],
  },
  {
    id: 'tory-burch-kitten',
    name: 'Tory Burch Suede Kitten Heel',
    category: 'heels',
    price: 98000,
    compareAt: 120000,
    image: '/shoes/tory-burch.jpg',
    colorway: 'Amethyst / Black / Camel',
    sizes: adults,
    soldOut: [36, 45],
    isNew: true,
    badge: 'Icon',
    rating: 4.8,
    blurb: 'Soft suede, a sharp point and a walkable heel.',
    description:
      'An everyday heel that behaves like a flat. Buttery suede, a refined pointed toe and a 5cm kitten heel — polished enough for the office, easy enough for after-work plans.',
    details: ['Genuine suede upper', '5cm kitten heel', 'Comfort-padded footbed'],
  },
  {
    id: 'simple-raba-suede',
    name: 'Simple Raba Suede Trainer',
    category: 'sneakers',
    price: 85000,
    image: '/shoes/simple-raba.jpg',
    colorway: 'Cobalt / Rose / Burgundy',
    sizes: adults,
    soldOut: [36, 45],
    isNew: true,
    badge: 'New Drop',
    rating: 4.9,
    blurb: 'Retro suede trainers in three statement shades.',
    description:
      'Our most-photographed pair. A slim retro silhouette in soft brushed suede, finished with tonal laces and a gum sole. Choose the colour that matches your mood.',
    details: ['Brushed suede upper', 'Gum rubber outsole', 'Unisex-leaning fit — take your usual EU size'],
  },
  {
    id: 'mid-heel-01',
    name: 'Aaron Fair Pointed Kitten Heel',
    category: 'heels',
    price: 65000,
    image: '/shoes/mid-heel-01.jpg',
    colorway: 'Emerald / Blush / Black / Tangerine / Cobalt / Wine',
    sizes: adults,
    soldOut: [36, 44, 45],
    isNew: true,
    badge: 'New Drop',
    rating: 4.8,
    blurb: 'Six colours. One endlessly wearable point.',
    description:
      'The point-toe pump, softened. A low kitten heel and stitched vamp detail make this the pair you reach for on busy mornings — with six colourways to rotate.',
    details: ['Smooth leather-look upper', '4.5cm kitten heel', 'Pointed toe with stitch detail'],
  },
  {
    id: 'raba-retro-heritage',
    name: 'Raba Retro Runner — Heritage Trio',
    category: 'sneakers',
    price: 85000,
    image: '/shoes/raba-shoes-1.jpg',
    colorway: 'Navy / White / Sand',
    sizes: adults,
    soldOut: [45],
    isNew: false,
    badge: 'Everyday',
    rating: 4.7,
    blurb: 'A throwback runner in three easy neutrals.',
    description:
      'A 70s-inspired runner built for long days on your feet. Suede overlays, a foam wedge sole and the kind of neutral palette that goes with everything in your wardrobe.',
    details: ['Suede & mesh upper', 'Foam wedge midsole', 'Lightweight everyday wear'],
  },
  {
    id: 'brand-impo-flat',
    name: 'Impo Buckle Ballerina',
    category: 'heels',
    price: 60000,
    image: '/shoes/brand-impo.jpg',
    colorway: 'Plum / Mocha / Black / Rose / Blush',
    sizes: adults,
    soldOut: [45],
    isNew: true,
    badge: 'New Drop',
    rating: 4.7,
    blurb: 'Soft square-toe flats with a sculptural buckle.',
    description:
      'The flat you can wear from morning meetings to evening plans. A square toe, cushioned lining and an oversized buckle that makes the simplest outfit feel considered.',
    details: ['Patent-look upper', 'Square toe with metal buckle', 'Low block heel for support'],
  },
  {
    id: 'butterfly-slide',
    name: 'Gold Butterfly Slide',
    category: 'slides',
    price: 55000,
    image: '/shoes/simple-sandal-2.jpg',
    colorway: 'Black / Gold crystal',
    sizes: adults,
    soldOut: [36, 44],
    isNew: true,
    badge: 'New Drop',
    rating: 4.8,
    blurb: 'Crystal butterfly slides for the evening.',
    description:
      'A flat slide with a little drama. A crystal-embellished butterfly wings across a padded leather-look band — pair with denim or a slip dress and let them do the talking.',
    details: ['Crystal butterfly embellishment', 'Padded slip-on band', 'Flat, flexible sole'],
  },
  {
    id: 'cobalt-loafer',
    name: 'Cobalt Driving Loafer',
    category: 'sneakers',
    price: 75000,
    image: '/shoes/casual-loafers.jpg',
    colorway: 'Cobalt blue',
    sizes: adults,
    soldOut: [36, 37, 45],
    isNew: true,
    badge: 'New Drop',
    rating: 4.7,
    blurb: 'A colour-pop loafer on a sporty white sole.',
    description:
      'A driving loafer with extra bounce. Cobalt leather, contrast stitching and a lightweight white tread sole make it the easiest way to add colour to denim and tailoring.',
    details: ['Smooth leather-look upper', 'Chunky white tread sole', 'Gold-tone snaffle trim'],
  },
  {
    id: 'blueberry-kitten',
    name: 'Blueberry Kitten Pump — Noir',
    category: 'heels',
    price: 65000,
    image: '/shoes/blueberry-shoes.jpg',
    colorway: 'Black leather',
    sizes: adults,
    soldOut: [36, 44, 45],
    isNew: false,
    badge: 'Core',
    rating: 4.9,
    blurb: 'The little black heel that never misses.',
    description:
      'A pointed kitten pump with a gentle 5cm heel and a soft leather finish. The shoe that quietly finishes every outfit — desk to dinner without a second thought.',
    details: ['Soft leather-look upper', '5cm covered kitten heel', 'Pointed toe'],
  },
  {
    id: 'ben-bu-canvas',
    name: 'Ben Bu Low-Top — Crimson',
    category: 'sneakers',
    price: 55000,
    image: '/shoes/ben-bu.jpg',
    colorway: 'Crimson / White',
    sizes: adults,
    soldOut: [44, 45],
    isNew: false,
    badge: 'Everyday',
    rating: 4.6,
    blurb: 'Cherry-red canvas with a chunky gummy sole.',
    description:
      'Weekend-ready canvas low-tops in a rich crimson. The padded collar and grippy sole make them ideal for errands, travel and everything in between.',
    details: ['Cotton canvas upper', 'Chunky gum rubber sole', 'Padded ankle collar'],
  },
  {
    id: 'chachacha-sandal',
    name: 'Chachacha Woven Sandal',
    category: 'heels',
    price: 55000,
    image: '/shoes/chachacha-sandals.jpg',
    colorway: 'Terracotta / Navy / Gold / Burgundy',
    sizes: adults,
    soldOut: [44, 45],
    isNew: false,
    badge: 'Bestseller',
    rating: 4.8,
    blurb: 'Hand-woven caged sandals in four finishes.',
    description:
      'An intricate woven upper on a flat, flexible sole. The kind of sandal that works for brunch, market runs and holidays — and looks just as good in gold as it does in leather.',
    details: ['Woven leather-look straps', 'Adjustable ankle buckle', 'Flat sole for all-day wear'],
  },
  {
    id: 'two-tone-buckle-point',
    name: 'Two-Tone Buckle Point',
    category: 'heels',
    price: 62000,
    image: '/shoes/simple-shoes.jpg',
    colorway: 'Stone/Navy / Black/Navy',
    sizes: adults,
    soldOut: [36, 45],
    isNew: true,
    badge: 'New Drop',
    rating: 4.7,
    blurb: 'Colour-blocked points with a square buckle.',
    description:
      'A pointed flat with a two-tone twist. The square buckle and contrast toe give a classic silhouette a modern edge — polished enough for the office, easy enough for the weekend.',
    details: ['Two-tone leather-look upper', 'Square buckle detail', 'Cushioned flat footbed'],
  },
  {
    id: 'shef-mamie-slipon',
    name: 'Shef Mamie Slip-On — Mono',
    category: 'sneakers',
    price: 60000,
    image: '/shoes/shef-mamie.jpg',
    colorway: 'Black / White',
    sizes: adults,
    soldOut: [37, 45],
    isNew: false,
    badge: 'Everyday',
    rating: 4.6,
    blurb: 'The slip-on that goes with absolutely everything.',
    description:
      'Clean, minimal and made for moving. A low-profile slip-on in black or white with a padded insole and a flexible sole. No laces, no effort, all comfort.',
    details: ['Smooth leather-look upper', 'Elastic side gores', 'Flexible rubber sole'],
  },
  {
    id: 'wage-ballet',
    name: 'Wage Round-Toe Ballet',
    category: 'heels',
    price: 58000,
    image: '/shoes/wage-shoes.jpg',
    colorway: 'Black / Wine / Cobalt',
    sizes: adults,
    soldOut: [45],
    isNew: false,
    badge: 'Core',
    rating: 4.7,
    blurb: 'The round-toe flat, refined.',
    description:
      'A softly rounded ballet flat with a textured vamp band and a low wedge for support. The pair you keep by the door because it works with every single thing.',
    details: ['Leather-look upper', 'Low supportive wedge', 'Textured vamp band'],
  },
  {
    id: 'raba-retro-white',
    name: 'Raba Retro Runner — Cloud White',
    category: 'sneakers',
    price: 85000,
    image: '/shoes/raba-shoes-2.jpg',
    colorway: 'White / Black',
    sizes: adults,
    soldOut: [44, 45],
    isNew: false,
    badge: 'Everyday',
    rating: 4.7,
    blurb: 'A crisp all-white runner with black stripes.',
    description:
      'The cleanest pair in the edit. White suede-look panels, black side stripes and a gum-tinted sole — a fail-safe finish for denim, dresses and everything else.',
    details: ['Suede-look & mesh upper', 'Contrast side stripes', 'Cushioned foam midsole'],
  },
  {
    id: 'mesh-buckle-ballet',
    name: 'Mesh Buckle Ballet',
    category: 'heels',
    price: 60000,
    image: '/shoes/simple-shoes-02.jpg',
    colorway: 'Rose / Black / Mocha',
    sizes: adults,
    soldOut: [44],
    isNew: false,
    badge: 'Trending',
    rating: 4.8,
    blurb: 'Breathable mesh with a statement buckle strap.',
    description:
      'The mesh flat that is suddenly everywhere. Lightweight, breathable and finished with an adjustable buckle strap — a modern take on a ballet classic.',
    details: ['Breathable mesh upper', 'Adjustable buckle strap', 'Flexible flat sole'],
  },
  {
    id: 'tommy-bar-slide',
    name: 'Tommy Bar Slide',
    category: 'slides',
    price: 58000,
    image: '/shoes/simple-sandal.jpg',
    colorway: 'Cognac / Black / White',
    sizes: adults,
    soldOut: [45],
    isNew: false,
    badge: 'Core',
    rating: 4.7,
    blurb: 'A clean leather slide with polished hardware.',
    description:
      'The everyday slide, elevated. A wide leather-look band with a polished metal bar and a lightly padded footbed. Throw them on with denim, linen or a swimsuit cover-up.',
    details: ['Leather-look band', 'Metal bar hardware', 'Padded footbed'],
  },
  {
    id: 'raba-retro-midnight',
    name: 'Raba Retro Runner — Midnight',
    category: 'sneakers',
    price: 85000,
    image: '/shoes/raba-shoes-3.jpg',
    colorway: 'Midnight navy / Cream',
    sizes: adults,
    soldOut: [45],
    isNew: false,
    badge: 'Everyday',
    rating: 4.7,
    blurb: 'A deep navy runner with cream accents.',
    description:
      'Navy suede-look panels, cream stripes and a sculpted sole — a retro runner that reads polished, not sporty. An easy pairing with tailored trousers or weekend denim.',
    details: ['Suede-look upper', 'Sculpted foam midsole', 'Contrast cream stripes'],
  },
  {
    id: 'fitkids-laceup',
    name: 'FitKids Lace-Up School Shoe',
    category: 'sneakers',
    price: 48000,
    image: '/shoes/fit-kids-2.jpg',
    colorway: 'Black',
    sizes: kids,
    soldOut: [27, 35, 36],
    isNew: false,
    badge: 'Kids',
    rating: 4.8,
    blurb: 'Sturdy, smart and scuff-resistant for school days.',
    description:
      'A proper school shoe built to survive the playground. Durable leather-look upper, secure laces and a flexible, grippy sole for growing feet.',
    details: ['Kids EU sizing 27–36', 'Durable leather-look upper', 'Grippy school-day sole'],
  },
  {
    id: 'fitkids-mary-jane',
    name: 'FitKids Patent Mary Jane',
    category: 'sneakers',
    price: 45000,
    image: '/shoes/fit-kids.jpg',
    colorway: 'Black patent',
    sizes: kids,
    soldOut: [28, 31, 36],
    isNew: false,
    badge: 'Kids',
    rating: 4.8,
    blurb: 'A glossy Mary Jane with a comfortable ripple sole.',
    description:
      'A smart black patent Mary Jane with a sweet cut-out detail and a lightweight ripple sole. Made for school, church and every special occasion in between.',
    details: ['Kids EU sizing 27–36', 'Patent-look upper', 'Lightweight ripple sole'],
  },
  {
    id: 'crabkids-school',
    name: 'CrabKids School Mary Jane',
    category: 'sneakers',
    price: 45000,
    image: '/shoes/crab-shoes.jpg',
    colorway: 'Black / Pink sole',
    sizes: kids,
    soldOut: [27, 29, 30, 36],
    isNew: false,
    badge: 'Kids',
    rating: 4.7,
    blurb: 'Hard-wearing school shoes with a fun pink sole.',
    description:
      'Built for busy school days. A durable black upper with a buckle strap, scuff-resistant toe and a bright pink tread that kids love.',
    details: ['Kids EU sizing 27–36', 'Adjustable buckle strap', 'Scuff-resistant toe'],
  },
]

export const featuredProduct = products[0]

export const getProductById = (id) => products.find((product) => product.id === id)

export const getSizeOptions = (product) => product.sizes || ADULT_SIZES

export const isSizeAvailable = (product, size) =>
  getSizeOptions(product).includes(size) && !(product.soldOut || []).includes(size)

export const availableSizeCount = (product) =>
  getSizeOptions(product).filter((size) => isSizeAvailable(product, size)).length

/**
 * Colours a shopper can pick. Catalogue rows from Supabase carry a parsed
 * `colors` array; the built-in list only has a `colorway` string such as
 * `"Silver / White / Black"`, so it is split on the usual separators.
 */
export const getColorOptions = (product) => {
  const explicit = Array.isArray(product?.colors) ? product.colors.filter(Boolean) : []
  if (explicit.length) return explicit
  return String(product?.colorway || '')
    .split(/\s*[,;/|]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** `"38 - 45"`, `"27 - 36"`, or the single size of a one-size pair. */
export const getSizeRangeLabel = (product) => {
  const label = String(product?.sizeRange || '').trim()
  if (label) return label
  const sizes = getSizeOptions(product)
  if (!sizes.length) return ''
  return sizes.length === 1 ? String(sizes[0]) : `${sizes[0]} - ${sizes[sizes.length - 1]}`
}

/** False when `in_stock` is switched off in Supabase, or when every size is sold out. */
export const isProductInStock = (product) =>
  product?.inStock !== false && availableSizeCount(product) > 0

/**
 * Title-case label for a category the owner typed in Supabase that has no
 * translation yet, e.g. `'loafers'` → `'Loafers'`, `'kids-shoes'` → `'Kids Shoes'`.
 */
export const categoryLabel = (category) =>
  String(category || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

