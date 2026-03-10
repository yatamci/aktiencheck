'use client'

import { useState, useCallback } from 'react'
import ThemeToggle from '../components/ThemeToggle'
import MetricCard from '../components/MetricCard'
import SearchBar from '../components/SearchBar'
import MAChart from '../components/MAChart'
import {
  StockData,
  buildMetrics,
  calculateOverallScore,
} from '../lib/evaluate'

const SECTIONS = [
  { title: 'Bewertung',                   keys: ['pe', 'ps', 'pb'] },
  { title: 'Rentabilität',                keys: ['roe', 'roa', 'grossMargin', 'operatingMargin', 'netMargin'] },
  { title: 'Liquidität & Verschuldung',   keys: ['cashflow', 'debt', 'currentRatio'] },
  { title: 'Technische Analyse',          keys: ['rsi'] },
  { title: 'Dividende & Wachstum',        keys: ['dividendYield', 'revenueGrowth', 'earningsGrowth'] },
]

function ScoreRing({ pct, color }: { pct: number; color: string }) {
  const r = 32
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  return (
    <div className="score-ring">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" stroke="var(--border)" />
        <circle
          cx="40" cy="40" r={r} fill="none" strokeWidth="7"
          stroke={color}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="score-ring-text">
        <span className="score-ring-num" style={{ color }}>{Math.round(pct * 100)}%</span>
        <span className="score-ring-label">Score</span>
      </div>
    </div>
  )
}

export default function Home() {
  const [data, setData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (symbol: string) => {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}`)
      const json: StockData = await res.json()
      if (json.error) setError(json.error)
      else setData(json)
    } catch {
      setError('Netzwerkfehler. Bitte prüfe deine Verbindung.')
    } finally {
      setLoading(false)
    }
  }, [])

  const metrics    = data ? buildMetrics(data) : []
  const overall    = metrics.length > 0 ? calculateOverallScore(metrics) : null
  const goodCount  = metrics.filter((m) => m.score === 'good').length
  const warnCount  = metrics.filter((m) => m.score === 'warn').length
  const badCount   = metrics.filter((m) => m.score === 'bad').length

  return (
    <main className="page-container">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">📈</div>
          <h1 className="logo-text">Aktien<span>check</span></h1>
        </div>
        <ThemeToggle />
      </header>

      {/* Search */}
      <SearchBar onSearch={search} loading={loading} />

      {/* Loading */}
      {loading && (
        <div className="loading-wrapper fade-in">
          <div className="spinner" />
          <p className="loading-text">Finanzdaten werden geladen …</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="glass-card error-card fade-in">
          <p className="error-title">Fehler beim Laden</p>
          <p className="error-msg">{error}</p>
        </div>
      )}

      {/* Empty */}
      {!data && !loading && !error && (
        <div className="empty-state fade-in">
          <div className="empty-icon">🔍</div>
          <p className="empty-title">Aktie suchen und analysieren</p>
          <p className="empty-subtitle">
            Gib den Namen oder das Ticker-Symbol einer Aktie ein.<br />
            Alle wichtigen Kennzahlen werden sofort bewertet.
          </p>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="fade-in">
          {/* Stock Header */}
          <div className="glass-card stock-header">
            <div className="stock-identity">
              <span className="stock-name">{data.name || data.symbol}</span>
              <div className="stock-meta">
                {data.symbol && <span className="stock-symbol">{data.symbol}</span>}
                {data.sector && <span className="stock-sector">{data.sector}</span>}
              </div>
            </div>
            {data.price && (
              <div className="stock-price">
                <div className="price-value">
                  {data.currency === 'EUR' ? '€' : '$'}
                  {Number(data.price).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="price-label">Aktueller Kurs</div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--good)' }} />Gut</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--warn)' }} />Aufpassen</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--bad)'  }} />Schlecht</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--neutral)' }} />Keine Daten</div>
          </div>

          {/* Metric Sections */}
          {SECTIONS.map((section) => {
            const sectionMetrics = metrics.filter((m) => section.keys.includes(m.key))
            if (sectionMetrics.length === 0) return null
            return (
              <div key={section.title}>
                <p className="section-title">{section.title}</p>
                <div className="metrics-list stagger">
                  {sectionMetrics.map((metric) => (
                    <MetricCard key={metric.key} metric={metric} />
                  ))}
                </div>
              </div>
            )
          })}

          {/* MA Chart */}
          {data.chartData && data.chartData.length > 0 && (
            <>
              <p className="section-title" style={{ marginTop: 32 }}>Trendanalyse</p>
              <MAChart
                data={data.chartData}
                crossSignal={data.crossSignal ?? 'none'}
                ma50Latest={data.ma50Latest ?? null}
                ma200Latest={data.ma200Latest ?? null}
                currency={data.currency ?? 'USD'}
              />
            </>
          )}

          {/* Overall Score */}
          {overall && (
            <>
              <p className="section-title" style={{ marginTop: 32 }}>Gesamtbewertung</p>
              <div className="glass-card overall-card fade-in">
                <div className="overall-inner">
                  <div className="overall-left">
                    <h3>Aktiencheck-Score</h3>
                    <div className="overall-label" style={{ color: overall.color }}>
                      {overall.label}
                    </div>
                    <div className="score-breakdown" style={{ marginTop: 12 }}>
                      <div className="score-breakdown-row">
                        <div className="breakdown-dot" style={{ background: 'var(--good)' }} />
                        {goodCount} Kriterien gut
                      </div>
                      <div className="score-breakdown-row">
                        <div className="breakdown-dot" style={{ background: 'var(--warn)' }} />
                        {warnCount} im Grenzbereich
                      </div>
                      <div className="score-breakdown-row">
                        <div className="breakdown-dot" style={{ background: 'var(--bad)' }} />
                        {badCount} Kriterien schlecht
                      </div>
                    </div>
                  </div>
                  <div className="overall-right">
                    <ScoreRing
                      pct={overall.maxScore > 0 ? overall.score / overall.maxScore : 0}
                      color={overall.color}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <strong>⚠️ Risikohinweis & Haftungsausschluss:</strong> Diese Analyse wird vollautomatisch
        erstellt und dient ausschließlich zu Informationszwecken. KI-basierte Systeme können Fehler
        machen – alle Angaben ohne Gewähr. <strong>Dies ist keine Anlageberatung.</strong> Jede
        Investitionsentscheidung liegt in der alleinigen Verantwortung des Nutzers. Vergangene
        Wertentwicklungen sind kein Indikator für zukünftige Ergebnisse. Konsultiere bei
        Bedarf einen zugelassenen Finanzberater. Datenquelle: Financial Modeling Prep.
      </footer>
    </main>
  )
}
