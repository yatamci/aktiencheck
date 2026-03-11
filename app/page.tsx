'use client'

import { useState, useCallback } from 'react'
import ThemeToggle from '../components/ThemeToggle'
import MetricCard  from '../components/MetricCard'
import SearchBar   from '../components/SearchBar'
import MAChart     from '../components/MAChart'
import { StockData, buildMetrics, calculateOverallScore, MetricResult } from '../lib/evaluate'

// Left column: Bewertung + Rentabilität
// Right column: Liquidität + Dividende & Wachstum + Technische Analyse (so RSI aligns with Nettomarge)
const CATEGORIES = [
  { title: 'Bewertung',                 keys: ['pe','ps','pb'],                                          col: 'left'  },
  { title: 'Rentabilität',              keys: ['roe','roa','grossMargin','operatingMargin','netMargin'],  col: 'left'  },
  { title: 'Liquidität & Verschuldung', keys: ['cashflow','debt','currentRatio'],                        col: 'right' },
  { title: 'Dividende & Wachstum',      keys: ['dividendYield','revenueGrowth','earningsGrowth'],        col: 'right' },
  { title: 'Technische Analyse',        keys: ['rsi'],                                                   col: 'right' },
]

function ScoreRing({ pct, color }: { pct: number; color: string }) {
  const r = 36, circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(1, Math.max(0, pct)))
  return (
    <div className="score-ring">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" strokeWidth="7" stroke="var(--border)" />
        <circle cx="45" cy="45" r={r} fill="none" strokeWidth="7" stroke={color}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', transform: 'rotate(-90deg)', transformOrigin: '45px 45px' }}
        />
      </svg>
      <div className="score-ring-text">
        <span className="score-ring-num" style={{ color }}>{Math.round(pct * 100)}%</span>
        <span className="score-ring-label">Score</span>
      </div>
    </div>
  )
}

function CategorySection({ title, metrics }: { title: string; metrics: MetricResult[] }) {
  if (metrics.length === 0) return null
  return (
    <div className="category-section">
      <p className="section-title">{title}</p>
      <div className="metrics-col stagger">
        {metrics.map(m => <MetricCard key={m.key} metric={m} />)}
      </div>
    </div>
  )
}

function CompanyInfo({ data }: { data: StockData }) {
  const facts = [
    data.sector   && `${data.sector}${data.industry ? ` · ${data.industry}` : ''}`,
    data.hq       && `📍 ${data.hq}`,
    data.founded  && `🗓 Börsengang ${data.founded}`,
    data.employees && `👥 ${data.employees} Mitarbeiter`,
    data.ceo      && `👤 CEO: ${data.ceo}`,
  ].filter(Boolean) as string[]

  return (
    <div className="company-info">
      {data.description && (
        <div>
          <p className="company-desc">{data.description}</p>
          <p className="company-desc-note">ℹ️ Beschreibung von FMP (Englisch)</p>
        </div>
      )}
      {facts.length > 0 && (
        <div className="company-facts">
          {facts.map((f, i) => <span key={i} className="company-fact">{f}</span>)}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [data,    setData]    = useState<StockData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const search = useCallback(async (symbol: string) => {
    setLoading(true); setError(null); setData(null)
    try {
      const res  = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}`)
      const json: StockData = await res.json()
      if (json.error) setError(json.error)
      else            setData(json)
    } catch {
      setError('Netzwerkfehler.')
    } finally {
      setLoading(false)
    }
  }, [])

  const metrics    = data ? buildMetrics(data) : []
  const metricsMap = Object.fromEntries(metrics.map(m => [m.key, m]))
  const overall    = metrics.length > 0 ? calculateOverallScore(metrics) : null
  const goodCount  = metrics.filter(m => m.score === 'good').length
  const warnCount  = metrics.filter(m => m.score === 'warn').length
  const badCount   = metrics.filter(m => m.score === 'bad').length
  const leftCats   = CATEGORIES.filter(c => c.col === 'left')
  const rightCats  = CATEGORIES.filter(c => c.col === 'right')

  return (
    <main className="page-container">
      <header className="header">
        <div className="logo">
          <div className="logo-icon">📈</div>
          <h1 className="logo-text">Aktien<span>check</span></h1>
        </div>
        <ThemeToggle />
      </header>

      <SearchBar onSearch={search} loading={loading} />

      {loading && (
        <div className="loading-wrapper fade-in">
          <div className="spinner" /><p className="loading-text">Finanzdaten werden geladen …</p>
        </div>
      )}

      {error && !loading && (
        <div className="glass-card error-card fade-in">
          <p className="error-title">❌ Fehler beim Laden</p>
          <p className="error-msg">{error}</p>
          <p className="error-hint">Prüfe ob <strong>FMP_API_KEY</strong> in Vercel → Settings → Environment Variables gesetzt ist, dann neu deployen. Zum Testen: <code>/api/debug</code></p>
        </div>
      )}

      {!data && !loading && !error && (
        <div className="empty-state fade-in">
          <div className="empty-icon">🔍</div>
          <p className="empty-title">Aktie suchen und analysieren</p>
          <p className="empty-subtitle">Gib den Namen oder das Ticker-Symbol ein – z.&nbsp;B. Apple, AAPL, Tesla, SAP …</p>
        </div>
      )}

      {data && !loading && (
        <div className="fade-in">

          {/* ── Stock Header with Company Info ── */}
          <div className="glass-card stock-header">
            <div className="stock-header-top">
              <div className="stock-identity">
                <span className="stock-name">{data.name || data.symbol}</span>
                <div className="stock-meta">
                  {data.symbol && <span className="stock-symbol">{data.symbol}</span>}
                  {data.sector && <span className="stock-sector">{data.sector}</span>}
                </div>
              </div>
              {data.price != null && (
                <div className="stock-price">
                  <div className="price-value">
                    {data.priceEur != null && data.currency !== 'EUR' && (
                      <span className="price-orig">
                        {data.currency === 'USD' ? '$' : data.currency === 'GBP' ? '£' : (data.currency + ' ')}
                        {Number(data.price).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {' | '}
                      </span>
                    )}
                    <span className="price-eur">
                      €{Number(data.priceEur ?? data.price).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="price-label">Aktueller Kurs</div>
                </div>
              )}
            </div>
            <CompanyInfo data={data} />
          </div>

          {/* Legend */}
          <div className="legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--good)' }} />Gut</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--warn)' }} />Aufpassen</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--bad)'  }} />Schlecht</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--neutral)' }} />Keine Daten</div>
          </div>

          {/* ── Two-column metrics ── */}
          <div className="metrics-grid">
            <div className="grid-col">
              {leftCats.map(cat => (
                <CategorySection key={cat.title} title={cat.title}
                  metrics={cat.keys.map(k => metricsMap[k]).filter(Boolean)} />
              ))}
            </div>
            <div className="grid-col">
              {rightCats.map(cat => (
                <CategorySection key={cat.title} title={cat.title}
                  metrics={cat.keys.map(k => metricsMap[k]).filter(Boolean)} />
              ))}
            </div>
          </div>

          {/* ── Bottom: Chart left | Score right ── */}
          <div className="bottom-grid">
            {data.chartData && data.chartData.length > 0 && (
              <div>
                <p className="section-title">Trendanalyse</p>
                <MAChart
                  data={data.chartData}
                  crossSignal={data.crossSignal  ?? 'none'}
                  ma50Latest={data.ma50Latest    ?? null}
                  ma200Latest={data.ma200Latest  ?? null}
                  currency={data.currency        ?? 'USD'}
                />
              </div>
            )}
            {overall && (
              <div>
                <p className="section-title">Gesamtbewertung</p>
                <div className="glass-card overall-card">
                  <div className="overall-inner">
                    <div className="overall-left">
                      <h3>Aktiencheck-Score</h3>
                      <div className="overall-label" style={{ color: overall.color }}>{overall.label}</div>
                      <div className="score-breakdown">
                        <div className="score-breakdown-row"><div className="breakdown-dot" style={{ background: 'var(--good)' }} />{goodCount} Kriterien gut</div>
                        <div className="score-breakdown-row"><div className="breakdown-dot" style={{ background: 'var(--warn)' }} />{warnCount} im Grenzbereich</div>
                        <div className="score-breakdown-row"><div className="breakdown-dot" style={{ background: 'var(--bad)'  }} />{badCount} Kriterien schlecht</div>
                      </div>
                    </div>
                    <div className="overall-right">
                      <ScoreRing pct={overall.maxScore > 0 ? overall.score / overall.maxScore : 0} color={overall.color} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      <footer className="footer">
        <strong>⚠️ Risikohinweis &amp; Haftungsausschluss:</strong> Diese Analyse wird vollautomatisch
        erstellt und dient ausschließlich zu Informationszwecken. KI-basierte Systeme können Fehler
        machen – alle Angaben ohne Gewähr. <strong>Dies ist keine Anlageberatung.</strong> Jede
        Investitionsentscheidung liegt in der alleinigen Verantwortung des Nutzers. Vergangene
        Wertentwicklungen sind kein Indikator für zukünftige Ergebnisse. Bitte konsultiere einen
        zugelassenen Finanzberater. Datenquelle: Financial Modeling Prep.
      </footer>
    </main>
  )
}
