import Link from 'next/link'
import { tickerDb } from '../../api/search/tickerDb'

// Make this a static page rendered at build time
export function generateStaticParams() {
  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => ({ letter }))
}

export default function BrowsePage({ params }: { params: { letter: string } }) {
  const letter = params.letter.toUpperCase()
  const stocks = tickerDb
    .filter(s => s.name.toUpperCase().startsWith(letter) || s.symbol.toUpperCase().startsWith(letter))
    .sort((a, b) => a.name.localeCompare(b.name))

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  return (
    <div className="browse-page">
      <header className="browse-header">
        <Link href="/" className="browse-home-link">
          <span className="logo-icon">📈</span>
          <span className="logo-text">Aktien<span>check</span></span>
        </Link>
      </header>

      <div className="browse-alpha-nav">
        {letters.map(l => (
          <Link
            key={l}
            href={`/browse/${l}`}
            className={`alpha-btn${l === letter ? ' alpha-btn--active' : ''}`}
          >
            {l}
          </Link>
        ))}
      </div>

      <main className="browse-main">
        <h1 className="browse-title">
          Aktien – {letter}
          <span className="browse-count">{stocks.length} Einträge</span>
        </h1>

        {stocks.length === 0 ? (
          <p className="browse-empty">Keine Aktien gefunden, die mit „{letter}" beginnen.</p>
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
      </main>
    </div>
  )
}
