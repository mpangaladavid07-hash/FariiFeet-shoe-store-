/**
 * Instagram caption -> product fields.
 *
 * Pure functions with no network access, so `instagram-check.mjs` can prove
 * every rule without hitting Instagram or Supabase.
 *
 * The owner posts like this (see README -> "Instagram -> catalogue"):
 *
 *   Name: Air Force 1 '07
 *   TZS 145,000
 *   Colour: White / Grey
 *   Sizes: 38, 39, 40
 *   - Leather upper
 *   - Gum sole
 *   #sneakers #fariifeet
 *
 * `Name:` and `Colour:` labels are optional — the parser falls back to the first
 * meaningful line and to colour words found anywhere in the caption. A price is
 * mandatory: without it the post is skipped rather than added at TZS 0.
 */

export const ADULT_SIZES = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45]
export const KIDS_SIZES = [27, 28, 29, 30, 31, 32, 33, 34, 35, 36]
export const DEFAULT_CATEGORY = 'sneakers'
export const MAX_NAME_LENGTH = 120
export const MIN_PRICE = 5000
export const MAX_PRICE = 2000000

const MAX_BLURB = 140
const MAX_DESCRIPTION = 600
const MAX_DETAIL = 80
const MAX_DETAILS = 6

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{FE0F}\u{200D}]/gu
const CURRENCY = '(?:tzs|tshs|tsh|shs|shilingi|kshs|ksh)'

/* Words that never make a product name on their own ("only", "shop", …). */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'at', 'available', 'back', 'be', 'best', 'buy', 'call', 'dm',
  'for', 'from', 'get', 'going', 'in', 'is', 'it', 'just', 'landed', 'new', 'now',
  'of', 'on', 'only', 'or', 'order', 'our', 'out', 'price', 'restock', 'restocked',
  'shop', 'sizes', 'still', 'store', 'the', 'this', 'to', 'was', 'we', 'with', 'you',
])

const LEADING_FILLER =
  /^(?:new in|new drop|fresh drop|just in|just landed|now available|available now|restocked?|back in stock|hot|shop now|out now)\b[\s:–—-]*/i
const TRAILING_FILLER =
  /(?:\s*[|–—-]\s*)?(?:now in store|in store now|in store|available now|available in store|at fariifeet|fariifeet|shop now|dm to order|dm for price)\s*$/i
const NAME_LABEL = /^\s*(?:name|product|item|jina|bidhaa|model)\s*[:\-–—]\s*(.+)$/im
const COLOUR_LABEL = /^\s*(?:colou?rs?|rangi)\s*[:\-–—]\s*(.+)$/im

const COLOUR_WORDS = [
  'black', 'white', 'silver', 'gold', 'rose', 'blush', 'pink', 'red', 'wine',
  'burgundy', 'blue', 'cobalt', 'navy', 'midnight', 'green', 'emerald', 'olive',
  'cream', 'beige', 'sand', 'tan', 'camel', 'brown', 'cognac', 'mocha', 'grey',
  'gray', 'charcoal', 'purple', 'lilac', 'lavender', 'orange', 'tangerine',
  'amethyst', 'nude', 'ivory', 'champagne', 'crystal', 'patent', 'metallic',
]

/**
 * Silhouette words beat brand words, so "Nike slides" is filed under slides.
 * Ties are broken by where the word first appears in the caption.
 */
const CATEGORY_RULES = [
  {
    category: 'slides',
    weight: 3,
    words: [
      'slide', 'slides', 'slipper', 'slippers', 'flip flop', 'flipflop', 'flip-flop',
      'sandal', 'sandals', 'mule', 'mules', 'sliders', 'jandal', 'kupooza',
    ],
  },
  {
    category: 'heels',
    weight: 3,
    words: [
      'heel', 'heels', 'kitten', 'stiletto', 'stilettos', 'pump', 'pumps',
      'mary jane', 'ballet', 'ballerina', 'flat', 'flats', 'pointed',
      'point toe', 'point-toe', 'wedge', 'wedges', 'court shoe', 'block heel',
    ],
  },
  {
    category: 'sneakers',
    weight: 3,
    words: [
      'sneaker', 'sneakers', 'trainer', 'trainers', 'runner', 'runners', 'running',
      'lace up', 'lace-up', 'high top', 'low top', 'gum sole',
    ],
  },
  {
    category: 'sneakers',
    weight: 1,
    words: [
      'jordan', 'air force', 'airforce', 'dunk', 'new balance', 'nike', 'adidas',
      'puma', 'converse', 'vans', 'asics', 'reebok', 'skechers', 'yeezy', 'samba',
      'gazelle', 'campus', 'loafer', 'loafers', 'canvas', 'skate', 'chunky',
      'shoes', 'shoe', 'viatu', 'sneakerhead',
    ],
  },
]

const KIDS_WORDS = ['kids', 'kid', 'children', 'child', 'baby', 'toddler', 'watoto', 'mtoto', 'school']

/* ------------------------------------------------------------------ */
/* Small text helpers                                                  */
/* ------------------------------------------------------------------ */

const collapse = (value) => String(value ?? '').replace(/[\s\u00a0]+/g, ' ').trim()
const stripEmoji = (value) => String(value ?? '').replace(EMOJI, ' ')
const stripLinks = (value) => String(value ?? '').replace(/https?:\/\/\S+/gi, ' ')
const stripHandles = (value) => String(value ?? '').replace(/(^|\s)@[A-Za-z0-9_.]+/g, ' ')
const stripHashtags = (value) => String(value ?? '').replace(/(^|\s)#[A-Za-z0-9_]+/g, ' ')
const trimPunctuation = (value) =>
  String(value ?? '')
    .replace(/^[\s\-–—:,.;|/'"()]+/, '')
    .replace(/[\s\-–—:,.;|/'"()]+$/, '')

/** `145,000` / `145 000` / `1,250,000` -> `145000` / `145000` / `1250000`. */
export function joinThousands(text) {
  let out = String(text ?? '')
  for (let pass = 0; pass < 4; pass += 1) {
    const next = out.replace(/(\d)[,\s](?=\d{3}(?!\d))/g, '$1')
    if (next === out) break
    out = next
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Price                                                               */
/* ------------------------------------------------------------------ */

const PRICE_PATTERNS = [
  // TZS 145,000 · Tsh. 145000 · Shs: 145,000
  new RegExp(`(?<![\\d.])${CURRENCY}\\.?\\s*[:=]?\\s*(\\d{3,9})(?![\\d.])`, 'i'),
  // 145,000/= · 145000 TZS · 145000 shs
  new RegExp(`(?<![\\d.])(\\d{3,9})\\s*(?:\\/=|${CURRENCY})(?![\\d])`, 'i'),
  // /=145,000
  /\/=\s*(\d{3,9})(?![\d.])/,
  // Price: 145,000 · bei: 145000 · only 145,000
  /\b(?:price|bei|cost|only|going for|now)\b\s*[:=]?\s*(\d{3,9})(?![\d.])/i,
  // @ 145,000 (very common on IG)
  /@\s*(\d{3,9})(?![\d.])/,
  // 145k
  /(?<![\d.])(\d{2,4})\s*k\b/i,
]
const THOUSANDS_FALLBACK = /(?<![\d.])(\d{2,3}(?:,\d{3})+)(?![\d])/

const inPriceRange = (value) => Number.isFinite(value) && value >= MIN_PRICE && value <= MAX_PRICE

/**
 * Finds the selling price in a caption. Returns `null` when the caption carries
 * no believable TZS amount — the importer then skips the post.
 */
export function parsePrice(caption) {
  const normalised = joinThousands(String(caption ?? '').replace(/\r\n?/g, '\n'))

  for (let index = 0; index < PRICE_PATTERNS.length; index += 1) {
    const global = new RegExp(PRICE_PATTERNS[index].source, 'gi')
    let match = global.exec(normalised)
    while (match) {
      const digits = Number(match[1])
      // The last pattern is the shorthand "145k"; everything else is already TZS.
      const value = index === PRICE_PATTERNS.length - 1 ? digits * 1000 : digits
      if (inPriceRange(value)) return value
      match = global.exec(normalised)
    }
  }

  // Last resort: a comma-grouped amount with no currency marker ("45,000").
  const grouped = THOUSANDS_FALLBACK.exec(String(caption ?? ''))
  if (grouped) {
    const value = Number(grouped[1].replace(/,/g, ''))
    if (inPriceRange(value)) return value
  }

  return null
}

/* ------------------------------------------------------------------ */
/* Name                                                                */
/* ------------------------------------------------------------------ */

function capName(value) {
  if (value.length <= MAX_NAME_LENGTH) return value
  const sliced = value.slice(0, MAX_NAME_LENGTH + 1)
  const lastSpace = sliced.lastIndexOf(' ')
  return trimPunctuation(sliced.slice(0, lastSpace > 20 ? lastSpace : MAX_NAME_LENGTH))
}

/* Price shapes that must never leak into a product name. */
const PRICE_IN_NAME = [
  new RegExp(`(?:${CURRENCY})\\.?\\s*\\d[\\d,]*\\s*(?:\\/=)?`, 'gi'),
  /(?<![\d.])\d[\d,]*\s*\/=/g,
  /@\s*\d[\d,]*\s*k?\b/gi,
  /\b(?:price|bei|cost|only|going for)\b\s*[:=]?\s*\d[\d,]*\s*(?:\/=)?/gi,
  /(?<![\d.])\d{2,4}\s*k\b/gi,
  /\b(?:sizes?|saizi)\b\s*[:=]?\s*\d{2}(?:\s*[-–—]\s*\d{2})?/gi,
]
/* Connectors left dangling once the price is gone ("… from", "… at"). */
const TRAILING_CONNECTOR =
  /(?:\s+(?:from|at|for|in|on|with|now|only|starting|available|bei|price|na))+$/i

const stripPrices = (value) =>
  PRICE_IN_NAME.reduce((text, pattern) => text.replace(pattern, ' '), String(value ?? ''))

function cleanNameCandidate(rawLine) {
  let text = stripLinks(stripHandles(stripEmoji(String(rawLine ?? ''))))
  text = text.split(/\s*[|•·]\s*/)[0]
  for (const pattern of PRICE_IN_NAME) text = text.replace(pattern, ' ')
  text = stripHashtags(text)
  text = text.replace(LEADING_FILLER, '').replace(TRAILING_FILLER, '')
  text = collapse(text).replace(TRAILING_CONNECTOR, '')
  return capName(trimPunctuation(collapse(text)))
}

function isMeaningfulName(value) {
  if (!value) return false
  const words = value.split(/\s+/).filter((word) => /[a-z]/i.test(word))
  if (!words.length) return false
  const letters = words.join('').replace(/[^a-z]/gi, '')
  if (letters.length < 3) return false
  const meaningful = words.filter(
    (word) => !STOPWORDS.has(word.toLowerCase().replace(/[^a-z]/gi, '')),
  )
  if (!meaningful.length) return false
  // One word is only enough when it actually says something ("Jordan").
  return meaningful.length >= 2 || letters.length >= 6
}

/** Product name: `Name:` label first, then the first line that reads like one. */
export function extractName(caption) {
  const text = String(caption ?? '').replace(/\r\n?/g, '\n')
  const labelled = NAME_LABEL.exec(text)
  if (labelled) {
    const cleaned = cleanNameCandidate(labelled[1])
    if (isMeaningfulName(cleaned)) return cleaned
  }

  for (const line of text.split('\n')) {
    const cleaned = cleanNameCandidate(line)
    if (isMeaningfulName(cleaned)) return cleaned
  }

  const fallback = cleanNameCandidate(text)
  return isMeaningfulName(fallback) ? fallback : ''
}

/* ------------------------------------------------------------------ */
/* Category, sizes, colourway                                          */
/* ------------------------------------------------------------------ */

function hashtagWords(text) {
  const found = []
  const regex = /#([A-Za-z0-9_]+)/g
  let match = regex.exec(String(text ?? ''))
  while (match) {
    // #NewBalance530 -> "new balance 530"
    found.push(match[1].replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase())
    match = regex.exec(String(text ?? ''))
  }
  const inline = String(text ?? '').replace(/#[A-Za-z0-9_]+/g, ' ')
  return `${inline} ${found.join(' ')}`.toLowerCase()
}

/** Chooses sneakers / heels / slides from hashtags, brands and silhouette words. */
export function inferCategory(caption) {
  const haystack = ` ${collapse(hashtagWords(caption)).replace(/[^a-z0-9\s]/g, ' ')} `
  const scores = new Map()

  for (const rule of CATEGORY_RULES) {
    for (const word of rule.words) {
      if (!haystack.includes(` ${word}`)) continue
      const position = haystack.indexOf(` ${word}`)
      const current = scores.get(rule.category) || { score: 0, first: Number.POSITIVE_INFINITY }
      current.score += rule.weight
      current.first = Math.min(current.first, position)
      scores.set(rule.category, current)
    }
  }

  const ranked = [...scores.entries()].sort(
    (a, b) => b[1].score - a[1].score || a[1].first - b[1].first,
  )
  return ranked.length ? ranked[0][0] : DEFAULT_CATEGORY
}

const uniqSorted = (values) => [...new Set(values)].sort((a, b) => a - b)

export function isKidsCaption(caption) {
  const haystack = ` ${collapse(hashtagWords(caption))} `
  return KIDS_WORDS.some((word) => haystack.includes(` ${word}`))
}

/** `Sizes: 38, 39, 40` or `size 38-42`, else the adult run. */
export function parseSizes(caption) {
  const text = joinThousands(String(caption ?? '').replace(/\r\n?/g, '\n'))

  const range = /(?:sizes?|saizi|eu)\s*[:=]?\s*(\d{2})\s*(?:-|–|—|to|hadi|\/)\s*(\d{2})/i.exec(text)
  if (range) {
    const from = Number(range[1])
    const to = Number(range[2])
    if (from >= 25 && to <= 46 && to > from && to - from <= 12) {
      const expanded = []
      for (let size = from; size <= to; size += 1) expanded.push(size)
      return expanded
    }
  }

  const labelled = /(?:sizes?|saizi)\b([^\n]{0,60})/i.exec(text)
  if (labelled) {
    const numbers = (labelled[1].match(/\b\d{2}\b/g) || [])
      .map((value) => Number(value))
      .filter((value) => value >= 25 && value <= 46)
    if (numbers.length) return uniqSorted(numbers)
  }

  return isKidsCaption(text) ? [...KIDS_SIZES] : [...ADULT_SIZES]
}

const capColour = (value) => {
  const cleaned = collapse(value).replace(/[|#]/g, ' ').trim()
  if (!cleaned) return ''
  return cleaned.length > 40 ? `${cleaned.slice(0, 39).trim()}…` : cleaned
}

/** `Colour: Black patent` first, otherwise colour words found in the caption. */
export function extractColorway(caption) {
  const text = String(caption ?? '').replace(/\r\n?/g, '\n')
  const labelled = COLOUR_LABEL.exec(text)
  if (labelled) {
    const cleaned = capColour(trimPunctuation(collapse(stripHashtags(stripEmoji(labelled[1])))))
    if (cleaned) return cleaned
  }

  const haystack = collapse(hashtagWords(text))
  const found = COLOUR_WORDS.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(haystack))
  return found.length ? capColour(found.slice(0, 2).join(' / ')) : ''
}

/* ------------------------------------------------------------------ */
/* Copy blocks                                                         */
/* ------------------------------------------------------------------ */

const LABEL_LINE =
  /^\s*(?:name|product|item|jina|bidhaa|model|colou?rs?|rangi|sizes?|saizi|price|bei|cost)\s*[:\-–—]/i
const BULLET_LINE = /^\s*(?:[-*•·✔✅▪]|\d+[.)])\s*(.+)$/

/** Caption split into usable prose, with the `Name:` / `Price:` labels removed. */
function captionLines(caption) {
  return String(caption ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !LABEL_LINE.test(line))
    .map((line) => {
      const bullet = BULLET_LINE.exec(line)
      const text = collapse(
        stripPrices(stripHashtags(stripHandles(stripLinks(stripEmoji(bullet ? bullet[1] : line))))),
      )
      return { text, isBullet: Boolean(bullet) }
    })
    .filter((entry) => /[a-z]{3,}/i.test(entry.text))
}

/**
 * Product-page copy: real sentences from the caption. When the owner only wrote
 * a name, a price and bullets, the bullets become the description.
 */
export function extractDescription(caption) {
  const lines = captionLines(caption)
  const prose = collapse(
    lines
      .filter((entry) => !entry.isBullet && /[a-z]{3,}/i.test(entry.text))
      .map((entry) => entry.text)
      .join(' '),
  )
  const text = prose || lines.map((entry) => entry.text).join(' · ')
  return text.length > MAX_DESCRIPTION ? `${text.slice(0, MAX_DESCRIPTION - 1).trim()}…` : text
}

/** First sentence of the description — used for search and snippets. */
export function extractBlurb(caption) {
  const description = extractDescription(caption)
  if (!description) return ''
  const firstSentence = description.split(/(?<=[.!?])\s+/)[0] || description
  return firstSentence.length > MAX_BLURB
    ? `${firstSentence.slice(0, MAX_BLURB - 1).trim()}…`
    : firstSentence
}

/** Bullet lines the owner typed become the check-list on the product card. */
export function extractDetails(caption) {
  const details = []
  for (const line of String(caption ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const bullet = /^\s*(?:[-*•·✔✅▪]|\d+[.)])\s*(.+)$/.exec(line)
    if (!bullet) continue
    const cleaned = trimPunctuation(collapse(stripHashtags(stripEmoji(bullet[1]))))
    if (cleaned.length < 3) continue
    const capped = cleaned.length > MAX_DETAIL
      ? `${cleaned.slice(0, MAX_DETAIL - 1).trim()}…`
      : cleaned
    if (!details.includes(capped)) details.push(capped)
    if (details.length >= MAX_DETAILS) break
  }
  return details
}

/* ------------------------------------------------------------------ */
/* One caption -> one product draft                                    */
/* ------------------------------------------------------------------ */

/**
 * @param {string} caption
 * @returns {{ name: string, price: number|null, category: string, sizes: number[],
 *   colorway: string, blurb: string, description: string, details: string[] }}
 */
export function parseCaption(caption) {
  const text = String(caption ?? '')
  return {
    name: extractName(text),
    price: parsePrice(text),
    category: inferCategory(text),
    sizes: parseSizes(text),
    colorway: extractColorway(text),
    blurb: extractBlurb(text),
    description: extractDescription(text),
    details: extractDetails(text),
  }
}

/** URL-safe slug used for the `products.id` primary key. */
export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '')
}



