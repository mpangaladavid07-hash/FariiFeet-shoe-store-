import { useEffect } from 'react'

/**
 * Writes a 0 → 1 scroll progress value into a CSS custom property on the given
 * element, so parallax layers can move with plain CSS transforms (no animation
 * library required).
 *
 * - One rAF-throttled, passive scroll listener (plus resize)
 * - Writes straight to the DOM node, so React never re-renders while scrolling
 * - Honours `prefers-reduced-motion` and stops listening when it is enabled
 */
export function useHeroScroll(ref, { property = '--hero-scroll' } = {}) {
  useEffect(() => {
    const node = ref?.current
    if (!node || typeof window === 'undefined') return undefined

    const motionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null

    let frame = 0
    let active = false

    const apply = () => {
      frame = 0
      const rect = node.getBoundingClientRect()
      const span = rect.height > 0 ? rect.height : 1
      const travelled = -rect.top / span
      const progress = Math.min(1, Math.max(0, travelled))
      node.style.setProperty(property, progress.toFixed(4))
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(apply)
    }

    const start = () => {
      if (active) return
      active = true
      apply()
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll)
    }

    const stop = () => {
      active = false
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) {
        window.cancelAnimationFrame(frame)
        frame = 0
      }
      node.style.setProperty(property, '0')
    }

    const onMotionChange = (event) => {
      if (event.matches) stop()
      else start()
    }

    if (motionQuery?.matches) {
      stop()
    } else {
      start()
    }

    if (motionQuery) {
      if (typeof motionQuery.addEventListener === 'function') {
        motionQuery.addEventListener('change', onMotionChange)
      } else if (typeof motionQuery.addListener === 'function') {
        motionQuery.addListener(onMotionChange)
      }
    }

    return () => {
      stop()
      if (motionQuery) {
        if (typeof motionQuery.removeEventListener === 'function') {
          motionQuery.removeEventListener('change', onMotionChange)
        } else if (typeof motionQuery.removeListener === 'function') {
          motionQuery.removeListener(onMotionChange)
        }
      }
    }
  }, [ref, property])
}

export default useHeroScroll
