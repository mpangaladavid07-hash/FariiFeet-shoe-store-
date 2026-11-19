import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Light / dark theme controller.
 *
 * The initial class is applied by an inline script in index.html (before first
 * paint) so there is never a flash of the wrong theme. This hook mirrors that
 * state in React, persists an explicit choice and follows the OS preference
 * only while the customer hasn't picked a side yet.
 */

const STORAGE_KEY = 'fariifeet-theme'
const THEME_COLOR = { light: '#FAF6F7', dark: '#141014' }

function readTheme() {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function hasStoredChoice() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark'
  } catch (error) {
    return false
  }
}

export default function useThemeMode() {
  const [theme, setTheme] = useState(readTheme)
  const themeRef = useRef(theme)

  themeRef.current = theme

  useEffect(() => {
    const root = document.documentElement
    const isDark = theme === 'dark'
    root.classList.toggle('dark', isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', THEME_COLOR[theme])
  }, [theme])

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event) => {
      if (hasStoredChoice()) return
      setTheme(event.matches ? 'dark' : 'light')
    }
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  const applyTheme = useCallback((next) => {
    themeRef.current = next
    setTheme(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch (error) {
      /* storage off — the UI still switches for this session */
    }
  }, [])

  const toggleTheme = useCallback(() => {
    applyTheme(themeRef.current === 'dark' ? 'light' : 'dark')
  }, [applyTheme])

  return { theme, isDark: theme === 'dark', setTheme: applyTheme, toggleTheme }
}
