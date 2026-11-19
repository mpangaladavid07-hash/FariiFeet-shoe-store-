import { useRef } from 'react'
import {
  BagIcon,
  CloseIcon,
  GlobeIcon,
  InstagramIcon,
  MoonIcon,
  SearchIcon,
  SlidersIcon,
  SunIcon,
} from './Icons'
import { INSTAGRAM_HANDLE } from '../lib/store'
import { LANGUAGES, useI18n } from '../lib/i18n'
import useThemeMode from '../lib/useThemeMode'
import CategoryPills from './CategoryPills'

export function SearchField({ value, onChange, className = '' }) {
  const inputRef = useRef(null)
  const { t } = useI18n()

  return (
    <div className={`relative ${className}`}>
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('nav.searchPlaceholder')}
        aria-label={t('nav.searchLabel')}
        className="field h-10 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
          aria-label={t('nav.clearSearch')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/45 transition hover:text-blush"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      ) : (
        <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-white/15 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-white/40 sm:flex">
          <SlidersIcon className="h-3 w-3" /> {t('common.live')}
        </span>
      )}
    </div>
  )
}

function ControlButton({ label, hint, onClick, active = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={hint || label}
      aria-pressed={active}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/60 transition hover:border-blush/60 hover:bg-white/[0.06] hover:text-blush sm:h-10 sm:w-10"
    >
      {children}
    </button>
  )
}

export default function Navbar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  cartCount,
  onOpenCart,
}) {
  const { t, lang, toggleLang } = useI18n()
  const { isDark, toggleTheme } = useThemeMode()
  const activeLanguage = LANGUAGES.find((entry) => entry.id === lang) || LANGUAGES[0]

  return (
    <header className="sticky top-0 z-40">
      <div className="border-b border-white/10 bg-navy/95 backdrop-blur-xl">
        <div className="container-page">
          <div className="flex h-[68px] items-center gap-2 sm:gap-3">
            <a href="#top" className="group flex shrink-0 items-center gap-2.5" aria-label={t('brand.home')}>
              <span className="relative h-10 w-10 overflow-hidden rounded-full ring-1 ring-blush/40 transition group-hover:ring-blush">
                <img
                  src="/brand-logo.jpeg"
                  alt={t('brand.logoAlt')}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="leading-none">
                <span className="block font-display text-[22px] font-extrabold tracking-tight text-rose">
                  Farii<span className="text-blush">Feet</span>
                </span>
                <span className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.3em] text-mocha sm:block">
                  {t('brand.tagline')}
                </span>
              </span>
            </a>

            <SearchField
              value={query}
              onChange={onQueryChange}
              className="ml-auto hidden max-w-sm flex-1 md:block lg:max-w-md"
            />

            <div className="ml-auto flex items-center gap-2 md:ml-0">
              <a
                href="#instagram"
                aria-label={t('nav.instagram')}
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/55 transition hover:border-blush/60 hover:text-blush lg:flex"
              >
                <InstagramIcon className="h-[18px] w-[18px]" />
              </a>

              <ControlButton
                label={`${t('nav.language')}: ${activeLanguage.label}`}
                hint={t('nav.languageSwitch')}
                onClick={toggleLang}
              >
                <span className="flex items-center gap-1">
                  <GlobeIcon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold tracking-wide">{activeLanguage.short}</span>
                </span>
              </ControlButton>

              <ControlButton
                label={isDark ? t('nav.themeLight') : t('nav.themeDark')}
                hint={t('nav.themeToggle')}
                onClick={toggleTheme}
                active={isDark}
              >
                {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              </ControlButton>

              <button
                type="button"
                onClick={onOpenCart}
                className="group flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 text-white transition hover:border-blush/60 hover:bg-white/10 sm:h-10 sm:px-4"
                aria-label={t('nav.openBag', { count: cartCount })}
              >
                <BagIcon className="h-[18px] w-[18px] transition group-hover:text-blush" />
                <span className="hidden text-xs font-semibold uppercase tracking-[0.16em] sm:block">
                  {t('common.bag')}
                </span>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blush px-1 text-[10px] font-bold text-obsidian">
                  {cartCount}
                </span>
              </button>
            </div>
          </div>

          <div className="pb-3 md:hidden">
            <SearchField value={query} onChange={onQueryChange} />
          </div>

          <div className="flex items-center gap-3 pb-3">
            <CategoryPills
              category={category}
              onChange={onCategoryChange}
              className="flex-1"
              variant="dark"
            />
            <span className="hidden shrink-0 text-[10px] uppercase tracking-[0.2em] text-white/40 lg:block">
              {query ? t('nav.liveResults') : INSTAGRAM_HANDLE}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
