'use client'

import { useState, useCallback } from 'react'
import ThemeToggle from '../components/ThemeToggle'
import MetricCard  from '../components/MetricCard'
import SearchBar   from '../components/SearchBar'
import MAChart     from '../components/MAChart'
import { StockData, buildMetrics, calculateOverallScore, MetricResult } from '../lib/evaluate'

// ── Category definitions ────────────────────────────────────────────────────
// Left:  Bewertung (3) + Rentabilität (5) = 8 rows
// Right: Liquidität (3) + Dividende (3) + [spacer] + Technische (1) = 8 rows
// Spacer pushes RSI down so its bottom aligns with Nettomarge bottom
const LEFT_CATS = [
  { title: 'Bewertung',    keys: ['pe','ps','pb'] },
  { title: 'Rentabilität', keys: ['roe','roa','grossMargin','operatingMargin','netMargin'] },
]
const RIGHT_CATS = [
  { title: 'Liquidität & Verschuldung', keys: ['cashflow','debt','currentRatio'] },
  { title: 'Dividende & Wachstum',      keys: ['dividendYield','revenueGrowth','earningsGrowth'] },
  { title: 'Technische Analyse',        keys: ['rsi'] },
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
          style={{ transition:'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', transform:'rotate(-90deg)', transformOrigin:'45px 45px' }}
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
    data.sector    && `${data.sector}${data.industry ? ` · ${data.industry}` : ''}`,
    data.hq        && `📍 ${data.hq}`,
    data.founded   && `🗓 Börsengang ${data.founded}`,
    data.employees && `👥 ${data.employees} Mitarbeiter`,
    data.ceo       && `👤 CEO: ${data.ceo}`,
  ].filter(Boolean) as string[]

  return (
    <div className="company-info">
      {data.description && <p className="company-desc">{data.description}</p>}
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
  const [rateLimited, setRateLimited] = useState(false)

  const search = useCallback(async (symbol: string) => {
    setLoading(true); setError(null); setData(null); setRateLimited(false)
    try {
      const res  = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}`)
      const json: StockData & { rateLimited?: boolean } = await res.json()
      if (json.rateLimited) {
        setRateLimited(true)
      } else if (json.error) {
        setError(json.error)
      } else {
        setData(json)
      }
    } catch {
      setError('Netzwerkfehler. Bitte Verbindung prüfen.')
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
          <div className="spinner" />
          <p className="loading-text">Finanzdaten werden geladen …</p>
        </div>
      )}

      {rateLimited && !loading && (
        <div className="glass-card error-card fade-in">
          <p className="error-title">⏳ Tageslimit erreicht</p>
          <p className="error-msg">Das tägliche Abfragelimit der Datenquelle ist ausgeschöpft. Heute sind keine weiteren Abfragen möglich.</p>
          <p className="error-hint">Bitte versuche es morgen wieder. Das Limit wird täglich um Mitternacht (UTC) zurückgesetzt.</p>
        </div>
      )}

      {error && !loading && !rateLimited && (
        <div className="glass-card error-card fade-in">
          <p className="error-title">❌ Fehler beim Laden</p>
          <p className="error-msg">{error}</p>
          <p className="error-hint">Prüfe ob <strong>FMP_API_KEY</strong> in Vercel → Settings → Environment Variables gesetzt ist, dann neu deployen.</p>
        </div>
      )}

      {!data && !loading && !error && !rateLimited && (
        <div className="empty-state fade-in">
          <div className="empty-icon">🔍</div>
          <p className="empty-title">Aktie suchen und analysieren</p>
          <p className="empty-subtitle">Gib den Namen oder das Ticker-Symbol ein – z.&nbsp;B. Apple, AAPL, Tesla, Xiaomi, SAP …</p>
        </div>
      )}

      {data && !loading && (
        <div className="fade-in">

          {/* ── Stock Header ── */}
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
                        {data.currency === 'USD' ? '$' : data.currency === 'GBP' ? '£' : data.currency + '\u00a0'}
                        {Number(data.price).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="price-sep"> | </span>
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
            <div className="legend-item"><div className="legend-dot" style={{ background:'var(--good)' }} />Gut</div>
            <div className="legend-item"><div className="legend-dot" style={{ background:'var(--warn)' }} />Aufpassen</div>
            <div className="legend-item"><div className="legend-dot" style={{ background:'var(--bad)'  }} />Schlecht</div>
            <div className="legend-item"><div className="legend-dot" style={{ background:'var(--neutral)' }} />Keine Daten</div>
          </div>

          {/* ── Metrics: explicit 2-col grid with spacer for RSI alignment ── */}
          <div className="metrics-grid">

            {/* LEFT */}
            <div className="grid-col" id="grid-left">
              {LEFT_CATS.map(cat => (
                <CategorySection key={cat.title} title={cat.title}
                  metrics={cat.keys.map(k => metricsMap[k]).filter(Boolean)} />
              ))}
            </div>

            {/* RIGHT: Liquidität + Dividende + auto-spacer + Technische */}
            <div className="grid-col" id="grid-right">
              <CategorySection title="Liquidität & Verschuldung"
                metrics={RIGHT_CATS[0].keys.map(k => metricsMap[k]).filter(Boolean)} />
              <CategorySection title="Dividende & Wachstum"
                metrics={RIGHT_CATS[1].keys.map(k => metricsMap[k]).filter(Boolean)} />
              {/* Spacer grows to push RSI down until its bottom aligns with Nettomarge */}
              <div className="rsi-spacer" />
              <CategorySection title="Technische Analyse"
                metrics={RIGHT_CATS[2].keys.map(k => metricsMap[k]).filter(Boolean)} />
            </div>

          </div>

          {/* ── Bottom: Chart + Score ── */}
          <div className="bottom-grid">
            {data.chartData && data.chartData.length > 0 && (
              <div>
                <p className="section-title">Trendanalyse</p>
                <MAChart
                  data={data.chartData}
                  crossSignal={data.crossSignal ?? 'none'}
                  ma50Latest={data.ma50Latest   ?? null}
                  ma200Latest={data.ma200Latest ?? null}
                  currency={data.currency       ?? 'USD'}
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
                        <div className="score-breakdown-row"><div className="breakdown-dot" style={{ background:'var(--good)' }} />{goodCount} Kriterien gut</div>
                        <div className="score-breakdown-row"><div className="breakdown-dot" style={{ background:'var(--warn)' }} />{warnCount} im Grenzbereich</div>
                        <div className="score-breakdown-row"><div className="breakdown-dot" style={{ background:'var(--bad)'  }} />{badCount} Kriterien schlecht</div>
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
