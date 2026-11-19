import { CATEGORIES } from '../data/products'
import { useI18n } from '../lib/i18n'

export default function CategoryPills({ category, onChange, className = '', variant = 'light' }) {
  const { t } = useI18n()
  const isDark = variant === 'dark'

  return (
    <div
      className={`scrollbar-hide flex items-center gap-2 overflow-x-auto ${className}`}
      role="tablist"
      aria-label={t('category.label')}
    >
      {CATEGORIES.map((item) => {
        const active = category === item.id
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`shrink-0 rounded-full border px-4 py-2 font-chat text-[11px] font-semibold uppercase tracking-[0.16em] transition-all duration-300 ${
              active
                ? 'border-blush bg-blush text-obsidian shadow-blush-btn'
                : isDark
                  ? 'border-white/15 bg-white/[0.06] text-white/60 hover:border-blush/50 hover:text-white'
                  : 'border-blushline bg-panel text-plum-soft hover:border-plum/35 hover:text-plum'
            }`}
          >
            {t(`category.${item.id}`)}
          </button>
        )
      })}
    </div>
  )
}
