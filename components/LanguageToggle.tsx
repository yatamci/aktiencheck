'use client'
import { Lang } from '../lib/i18n'

export default function LanguageToggle({ lang, onToggle }: { lang: Lang; onToggle: () => void }) {
  // Use emoji with text fallback – always centered via CSS
  const label = lang === 'de' ? '🇬🇧' : '🇩🇪'
  const title = lang === 'de' ? 'Switch to English' : 'Zu Deutsch wechseln'

  return (
    <button
      onClick={onToggle}
      className="theme-toggle lang-toggle"
      aria-label={title}
      title={title}
    >
      {label}
    </button>
  )
}
