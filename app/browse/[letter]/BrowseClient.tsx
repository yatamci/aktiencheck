'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ThemeToggle from '../../../components/ThemeToggle'
import LanguageToggle from '../../../components/LanguageToggle'
import SearchBar from '../../../components/SearchBar'
import { useRouter } from 'next/navigation'
import type { Lang } from '../../../lib/evaluate'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

interface Stock { symbol: string; name: string; exchange: string }

interface Props { letter: string; stocks: Stock[] }

export default function BrowseClient({ letter, stocks }: Props) {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('de')

  useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang | null
    if (stored === 'en') setLang('en')
  }, [])

  function toggleLang() {
    const next: Lang = lang === 'de' ? 'en' : 'de'
    setLang(next)
    localStorage.setItem('lang', next)
  }

  function handleSearch(symbol: string) {
    router.push(`/?s=${encodeURIComponent(symbol)}`)
  }

  const placeholder = lang === 'de'
    ? 'Aktie suchen – z.B. Apple, AAPL, Tesla, SAP …'
    : 'Search stocks – e.g. Apple, AAPL, Tesla, SAP …'
  const analyzeLabel = lang === 'de' ? 'Analysieren' : 'Analyze'
  const title = lang === 'de' ? `Aktien – ${letter}` : `Stocks – ${letter}`
  const countLabel = lang === 'de' ? 'Einträge' : 'entries'
  const emptyText = lang === 'de'
    ? `Keine Aktien gefunden, die mit „${letter}" beginnen.`
    : `No stocks found starting with "${letter}".`

  return (
    <main className="page-container">
      {/* Same header as main page */}
      <header className="header">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div className="logo">
            <div className="logo-icon">📈</div>
            <h1 className="logo-text">
              {lang === 'de' ? <>Aktien<span>check</span></> : <>Stock<span>check</span></>}
            </h1>
          </div>
        </Link>
        <div style={{ display: 'flex', gap: '8px' }}>
          <LanguageToggle lang={lang} onToggle={toggleLang} />
          <ThemeToggle />
        </div>
      </header>

      {/* Same search bar */}
      <SearchBar
        key={lang}
        onSearch={handleSearch}
        loading={false}
        placeholder={placeholder}
        analyzeLabel={analyzeLabel}
      />

      {/* A–Z nav */}
      <div className="alpha-bar" style={{ marginTop: 12, marginBottom: 20 }}>
        {LETTERS.map(l => (
          <Link
            key={l}
            href={`/browse/${l}`}
            className={`alpha-btn${l === letter ? ' alpha-btn--active' : ''}`}
          >
            {l}
          </Link>
        ))}
      </div>

      {/* Results */}
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          {title}
          <span className="browse-count">{stocks.length} {countLabel}</span>
        </h2>

        {stocks.length === 0 ? (
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', padding: '24px 0' }}>{emptyText}</p>
        ) : (
          <div className="browse-grid">
            {stocks.map(s => (
              <Link
                key={s.symbol}
                href={`/?s=${encodeURIComponent(s.symbol)}`}
                className="browse-card"
              >
                <span className="browse-card-name">{s.name}</span>
                <span className="browse-card-meta">
                  <span className="browse-card-symbol">{s.symbol}</span>
                  <span className="browse-card-exchange">{s.exchange}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
