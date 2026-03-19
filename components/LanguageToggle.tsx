'use client'
import { Lang } from '../lib/i18n'

export default function LanguageToggle({ lang, onToggle }: { lang: Lang; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="theme-toggle lang-toggle"
      aria-label="Sprache wechseln"
      title={lang === 'de' ? 'Switch to English' : 'Zu Deutsch wechseln'}
      style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.02em' }}
    >
      {lang === 'de' ? (
        <span style={{ fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif", fontSize:'1.2rem' }}>🇬🇧</span>
      ) : (
        <span style={{ fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif", fontSize:'1.2rem' }}>🇩🇪</span>
      )}
    </button>
  )
}
