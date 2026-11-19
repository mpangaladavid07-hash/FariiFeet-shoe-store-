import { createServer } from 'vite'
import { renderToString } from 'react-dom/server'
import React from 'react'

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const { default: App } = await server.ssrLoadModule('/src/App.jsx')
  const html = renderToString(React.createElement(App))

  const checks = [
    ['hero headline', 'Step into'],
    ['hero subtitle', 'Dar es Salaam boutique'],
    ['white CTA', 'Shop Now'],
    ['hero photo (New Balance)', '/shoes/new-balance.jpg'],
    ['hero photo (kitten heel)', '/shoes/tory-burch.jpg'],
    ['hero photo (slides)', '/shoes/simple-sandal-2.jpg'],
    ['catalog heading', 'The full edit'],
    ['real price TZS', 'TZS 145,000'],
    ['brand logo untouched', '/brand-logo.jpeg'],
    ['instagram section', 'id="instagram"'],
    ['gallery heading', 'Seen on Instagram'],
    ['fallback gallery photo', '/shoes/casual-loafers.jpg'],
    ['no external instagram link', 'instagram.com'],
  ]

  for (const [label, needle] of checks) {
    const found = html.includes(needle)
    const expected = label === 'no external instagram link' ? !found : found
    console.log(`${expected ? 'OK  ' : 'FAIL'}  ${label}`)
  }

  const galleryStart = html.indexOf('id="instagram"')
  const galleryHtml = galleryStart === -1 ? '' : html.slice(galleryStart)
  const tileCount = (galleryHtml.match(/Open Instagram photo/g) || []).length
  console.log(`${tileCount === 6 ? 'OK  ' : 'FAIL'}  gallery tiles rendered (${tileCount})`)
  console.log(
    `${galleryHtml.includes('Shop the look') || galleryHtml.includes('shop the look') ? 'OK  ' : 'FAIL'}  gallery copy`,
  )
  console.log(
    `${html.includes('/shoes/new-balance.jpg') ? 'OK  ' : 'FAIL'}  hero uses real NB photo`,
  )

  console.log('html length:', html.length)

  // Direct render of the lightbox (state-independent) to validate the modal markup.
  const [{ default: Lightbox }, { fallbackPosts }] = await Promise.all([
    server.ssrLoadModule('/src/components/InstagramLightbox.jsx'),
    server.ssrLoadModule('/src/lib/feedfusion.js'),
  ])

  const lightboxHtml = renderToString(
    React.createElement(Lightbox, {
      posts: fallbackPosts,
      index: 1,
      onClose: () => {},
      onNavigate: () => {},
      onShopSimilar: () => {},
    }),
  )

  const lightboxChecks = [
    ['lightbox caption', fallbackPosts[1].caption],
    ['lightbox shop button', 'Shop Similar Styles'],
    ['lightbox product name', 'Tory Burch'],
    ['lightbox real price', 'TZS 98,000'],
    ['lightbox prev/next', 'Next Instagram photo'],
    ['lightbox no redirect', 'instagram.com'],
  ]

  for (const [label, needle] of lightboxChecks) {
    const found = lightboxHtml.includes(needle)
    const expected = label === 'lightbox no redirect' ? !found : found
    console.log(`${expected ? 'OK  ' : 'FAIL'}  ${label}`)
  }
} finally {
  await server.close()
}
