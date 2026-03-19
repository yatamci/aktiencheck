'use client'
import { Lang } from '../lib/i18n'

interface Props {
  lang: Lang
  onToggle: () => void
}

export default function LanguageToggle({ lang, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className="theme-toggle"
      aria-label="Sprache wechseln"
      title={lang === 'de' ? 'Switch to English' : 'Zu Deutsch wechseln'}
    >
      <span style={{ fontSize: '1.1rem' }}>{lang === 'de' ? '🇬🇧' : '🇩🇪'}</span>
    </button>
  )
}
