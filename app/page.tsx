'use client'

import { useState, useCallback, useEffect } from 'react'
import ThemeToggle from '../components/ThemeToggle'
import MetricCard  from '../components/MetricCard'
import SearchBar   from '../components/SearchBar'
import MAChart     from '../components/MAChart'
import { StockData, buildMetrics, calculateOverallScore, MetricResult } from '../lib/evaluate'

const LEFT_CATS = [
  { title: 'Bewertung',    keys: ['pe','ps','pb'] },
  { title: 'Rentabilität', keys: ['roe','roa','grossMargin','operatingMargin','netMargin'] },
]
const RIGHT_CATS = [
  { title: 'Liquidität & Verschuldung', keys: ['cashflow','debt','currentRatio'] },
  { title: 'Dividende & Wachstum',      keys: ['dividendYield','revenueGrowth','earningsGrowth'] },
  { title: 'Technische Analyse',        keys: ['rsi'] },
]

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ pct, color }: { pct: number; color: string }) {
  const r = 72, circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(1, Math.max(0, pct)))
  return (
    <div className="score-ring">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} fill="none" strokeWidth="10" stroke="var(--border)" />
        <circle cx="90" cy="90" r={r} fill="none" strokeWidth="10" stroke={color}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', transform:'rotate(-90deg)', transformOrigin:'90px 90px' }}
        />
      </svg>
      <div className="score-ring-text">
        <span className="score-ring-num" style={{ color }}>{Math.round(pct * 100)}%</span>
        <span className="score-ring-label">Score</span>
      </div>
    </div>
  )
}

// ── Category Section ──────────────────────────────────────────────────────────
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

// ── Company Info ──────────────────────────────────────────────────────────────
function CompanyInfo({ data }: { data: StockData }) {
  const facts = [
    data.sector    && `${data.sector}${data.industry ? ` · ${data.industry}` : ''}`,
    data.hq        && `📍 ${data.hq}`,
    data.founded   && `🗓 Börsengang ${data.founded}`,
    data.employees && `👥 ${data.employees} Mitarbeiter`,
    data.ceo       && `👤 CEO: ${data.ceo}`,
  ].filter(Boolean) as string[]

  // Build German Wikipedia URL from company name
  const wikiName  = (data.name ?? '').replace(/\s+/g, '_').replace(/&/g, '%26')
  const wikiUrl   = wikiName ? `https://de.wikipedia.org/wiki/${wikiName}` : null

  return (
    <div className="company-info">
      {data.description && (
        <p className="company-desc">
          {data.description}
          {wikiUrl && (
            <> – <a
              href={wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="wiki-link"
            >Wikipedia</a></>
          )}
        </p>
      )}
      {facts.length > 0 && (
        <div className="company-facts">
          {facts.map((f, i) => <span key={i} className="company-fact">{f}</span>)}
        </div>
      )}
    </div>
  )
}

// ── Buy/Hold/Sell Recommendation ──────────────────────────────────────────────
function getRecommendation(metrics: MetricResult[], crossSignal?: string): {
  action: 'Kaufen' | 'Halten' | 'Verkaufen'; color: string; text: string
} {
  const score = (key: string) => metrics.find(m => m.key === key)?.score ?? 'neutral'
  const val   = (key: string) => metrics.find(m => m.key === key)?.value ?? null
  const goodCount = metrics.filter(m => m.score === 'good').length
  const badCount  = metrics.filter(m => m.score === 'bad').length
  const relevant  = metrics.filter(m => m.score !== 'neutral').length
  const pct       = relevant > 0 ? (goodCount * 2 + metrics.filter(m => m.score === 'warn').length) / (relevant * 2) : 0
  const bullish   = crossSignal === 'golden'
  const bearish   = crossSignal === 'death'
  const rsi       = val('rsi') as number | null
  const oversold  = rsi != null && rsi < 35
  const overbought= rsi != null && rsi > 65
  const cheap     = score('pe') === 'good' && score('ps') === 'good'
  const pricey    = score('pe') === 'bad'  || score('ps') === 'bad'
  const profitable= score('roe') === 'good' || score('netMargin') === 'good'
  const growing   = score('revenueGrowth') === 'good' || score('earningsGrowth') === 'good'

  if (pct >= 0.65 && (bullish || !bearish) && !overbought) {
    const reasons = [profitable && 'solide Profitabilität', growing && 'starkes Wachstum', cheap && 'günstige Bewertung', bullish && 'positiver Kurstrend', oversold && 'überverkauft'].filter(Boolean).slice(0,2).join(' und ')
    return { action:'Kaufen', color:'var(--good)', text:`Starke Fundamentaldaten${reasons?' – '+reasons:''}. Aus Kennzahlenperspektive erscheint ein Einstieg attraktiv. Keine Anlageberatung – eigene Recherche empfohlen.` }
  }
  if (pct <= 0.3 || (bearish && badCount >= 3) || (overbought && pricey)) {
    const reasons = [pricey && 'hohe Bewertung', bearish && 'negativer Kurstrend', overbought && 'technisch überkauft', badCount >= 3 && `${badCount} schwache Kennzahlen`].filter(Boolean).slice(0,2).join(' und ')
    return { action:'Verkaufen', color:'var(--bad)', text:`Mehrere Warnsignale${reasons?' ('+reasons+')':''}. Eine Überprüfung der Position ist ratsam. Dies ist keine Anlageberatung.` }
  }
  return { action:'Halten', color:'var(--warn)', text:`Gemischtes Bild – Stärken und Schwächen halten sich die Waage.${bullish?' Aufwärtstrend positiv.':bearish?' Abwärtstrend beobachten.':''} Abwarten und Entwicklung verfolgen.` }
}

// ── Stock Logo ────────────────────────────────────────────────────────────────
const TICKER_DOMAINS: Record<string,string> = {
  AAPL:'apple.com', MSFT:'microsoft.com', GOOGL:'google.com', GOOG:'google.com',
  AMZN:'amazon.com', TSLA:'tesla.com', META:'meta.com', NVDA:'nvidia.com',
  NFLX:'netflix.com', INTC:'intel.com', AMD:'amd.com', ORCL:'oracle.com',
  CRM:'salesforce.com', ADBE:'adobe.com', PYPL:'paypal.com', UBER:'uber.com',
  ABNB:'airbnb.com', SPOT:'spotify.com', COIN:'coinbase.com', SHOP:'shopify.com',
  SNAP:'snap.com', PINS:'pinterest.com', RBLX:'roblox.com', PLTR:'palantir.com',
  NET:'cloudflare.com', DDOG:'datadoghq.com', CRWD:'crowdstrike.com',
  OKTA:'okta.com', ZS:'zscaler.com', NOW:'servicenow.com', HUBS:'hubspot.com',
  TEAM:'atlassian.com', TWLO:'twilio.com', MDB:'mongodb.com', SNOW:'snowflake.com',
  JPM:'jpmorganchase.com', BAC:'bankofamerica.com', WFC:'wellsfargo.com',
  GS:'goldmansachs.com', MS:'morganstanley.com', C:'citi.com', BLK:'blackrock.com',
  V:'visa.com', MA:'mastercard.com', AXP:'americanexpress.com',
  WMT:'walmart.com', TGT:'target.com', COST:'costco.com', HD:'homedepot.com',
  MCD:'mcdonalds.com', SBUX:'starbucks.com', NKE:'nike.com', DIS:'disney.com',
  CMCSA:'comcast.com', PG:'pg.com', KO:'coca-cola.com', PEP:'pepsico.com',
  JNJ:'jnj.com', PFE:'pfizer.com', MRK:'merck.com', ABBV:'abbvie.com',
  LLY:'lilly.com', AMGN:'amgen.com', GILD:'gilead.com', MRNA:'modernatx.com',
  UNH:'unitedhealthgroup.com', CVS:'cvshealth.com',
  XOM:'exxonmobil.com', CVX:'chevron.com', BA:'boeing.com',
  CAT:'caterpillar.com', HON:'honeywell.com', UPS:'ups.com', FDX:'fedex.com',
  SAP:'sap.com', ASML:'asml.com', TSM:'tsmc.com', TM:'toyota.com',
  SONY:'sony.com', BABA:'alibaba.com', BIDU:'baidu.com', NIO:'nio.com',
  RACE:'ferrari.com', NOK:'nokia.com', ERIC:'ericsson.com',
  T:'att.com', VZ:'verizon.com', TMUS:'t-mobile.com',
  '005930.KS':'samsung.com', '1810.HK':'mi.com', '0700.HK':'tencent.com',
  '9988.HK':'alibaba.com', '7203.T':'toyota.com', '6758.T':'sony.com',
  '9984.T':'softbank.jp', 'SMSN.L':'samsung.com',
  EBAY:'ebay.com', ETSY:'etsy.com', W:'wayfair.com',
  SBUX:'starbucks.com', CMG:'chipotle.com', YUM:'yum.com',
  DAL:'delta.com', UAL:'united.com', AAL:'aa.com', MAR:'marriott.com',
  HLT:'hilton.com', BKNG:'booking.com', EXPE:'expedia.com',
}

function StockLogo({ symbol, name }: { symbol?: string; name?: string }) {
  const [imgSrc, setImgSrc]   = useState<string | null>(null)
  const [fallbackIdx, setFallbackIdx] = useState(0)

  const domain = symbol ? (
    TICKER_DOMAINS[symbol.toUpperCase()] ??
    TICKER_DOMAINS[symbol] ??
    (() => {
      // Skip domain guessing for numeric/exchange tickers like 005930.KS
      if (/^\d/.test(symbol)) return null
      const base = (name ?? symbol)
        .toLowerCase()
        .replace(/\s+(inc\.?|corp\.?|ltd\.?|plc|ag|se|n\.v\.|s\.a\.|gmbh|holdings?|group|limited|co\.|llc)\s*$/i, '')
        .trim().replace(/[^a-z0-9]/g, '').slice(0, 20)
      return base ? base + '.com' : null
    })()
  ) : null

  const sources = domain ? [
    `https://logo.clearbit.com/${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ] : []

  useEffect(() => {
    if (sources.length > 0) { setImgSrc(sources[0]); setFallbackIdx(0) }
  }, [symbol, name])

  if (!imgSrc || fallbackIdx >= sources.length) return null

  return (
    <img
      src={sources[fallbackIdx]}
      alt=""
      className="stock-logo"
      onError={() => {
        const next = fallbackIdx + 1
        if (next < sources.length) { setFallbackIdx(next); setImgSrc(sources[next]) }
        else setImgSrc(null)
      }}
    />
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
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
      if (json.rateLimited) setRateLimited(true)
      else if (json.error)  setError(json.error)
      else                  setData(json)
    } catch { setError('Netzwerkfehler.') }
    finally   { setLoading(false) }
  }, [])

  const metrics    = data ? buildMetrics(data) : []
  const metricsMap = Object.fromEntries(metrics.map(m => [m.key, m]))
  const overall    = metrics.length > 0 ? calculateOverallScore(metrics) : null
  const goodCount  = metrics.filter(m => m.score === 'good').length
  const warnCount  = metrics.filter(m => m.score === 'warn').length
  const badCount   = metrics.filter(m => m.score === 'bad').length

  // Dynamically align RSI bottom with Nettomarge bottom
  useEffect(() => {
    if (!data) return
    const align = () => {
      const nettoEl = document.querySelector('[data-key="netMargin"]') as HTMLElement
      const rsiEl   = document.querySelector('[data-key="rsi"]') as HTMLElement
      const spacer  = document.querySelector('.rsi-spacer') as HTMLElement
      if (!nettoEl || !rsiEl || !spacer || window.innerWidth < 720) return
      const nettoBottom = nettoEl.getBoundingClientRect().bottom
      const rsiTop      = rsiEl.getBoundingClientRect().top
      const currentSpacer = spacer.offsetHeight
      // We want rsiEl bottom = nettoEl bottom → rsiTop = nettoBottom - rsiEl.offsetHeight
      const targetRsiTop = nettoBottom - rsiEl.offsetHeight
      const diff = targetRsiTop - rsiTop
      const newHeight = Math.max(0, currentSpacer + diff)
      spacer.style.flexGrow = '0'
      spacer.style.height = newHeight + 'px'
    }
    // Run after render and on resize
    const timer = setTimeout(align, 100)
    window.addEventListener('resize', align)
    return () => { clearTimeout(timer); window.removeEventListener('resize', align) }
  }, [data, metrics])

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
      {rateLimited && !loading && (
        <div className="glass-card error-card fade-in">
          <p className="error-title">⏳ Tageslimit erreicht</p>
          <p className="error-msg">Das tägliche Abfragelimit ist ausgeschöpft. Bitte morgen erneut versuchen.</p>
        </div>
      )}
      {error && !loading && !rateLimited && (
        <div className="glass-card error-card fade-in">
          <p className="error-title">❌ Fehler</p>
          <p className="error-msg">{error}</p>
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
              {/* Logo left + identity */}
              <div className="stock-identity-group">
                {data.symbol && (
                  <div className="stock-logo-wrap">
                    <StockLogo symbol={data.symbol} name={data.name} />
                  </div>
                )}
                <div className="stock-identity">
                  <span className="stock-name">{data.name || data.symbol}</span>
                  <div className="stock-meta">
                    {data.symbol && <span className="stock-symbol">{data.symbol}</span>}
                    {data.sector && <span className="stock-sector">{data.sector}</span>}
                  </div>
                </div>
              </div>

              {data.price != null && (
                <div className="stock-price">
                  <div className="price-value">
                    {data.priceEur != null && data.currency !== 'EUR' ? (
                      <>
                        {/* Desktop: side by side with | */}
                        <span className="price-desktop-only">
                          <span className="price-orig">{Number(data.price).toLocaleString('de-DE', { minimumFractionDigits:2, maximumFractionDigits:2 })}{' '}{data.currency}</span>
                          <span className="price-sep">{' | '}</span>
                          <span className="price-eur">{Number(data.priceEur).toLocaleString('de-DE', { minimumFractionDigits:2, maximumFractionDigits:2 })}{' €'}</span>
                        </span>
                        {/* Mobile: EUR on top, original below */}
                        <span className="price-mobile-only">
                          <span className="price-eur">{Number(data.priceEur).toLocaleString('de-DE', { minimumFractionDigits:2, maximumFractionDigits:2 })}{' €'}</span>
                          <span className="price-orig-sub">{Number(data.price).toLocaleString('de-DE', { minimumFractionDigits:2, maximumFractionDigits:2 })}{' '}{data.currency}</span>
                        </span>
                      </>
                    ) : (
                      <span className="price-eur">
                        {Number(data.price).toLocaleString('de-DE', { minimumFractionDigits:2, maximumFractionDigits:2 })}{' '}{data.currency ?? ''}
                      </span>
                    )}
                  </div>
                  {data.priceDate ? (
                    <div className="price-date">
                      Stand: {new Date(data.priceDate).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}, {new Date(data.priceDate).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr
                    </div>
                  ) : <div className="price-date">Aktueller Kurs</div>}
                </div>
              )}
            </div>
            <CompanyInfo data={data} />
          </div>

          {/* Legend */}
          <div className="legend">
            <div className="legend-item"><div className="legend-dot" style={{background:'var(--good)'}}/>Gut</div>
            <div className="legend-item"><div className="legend-dot" style={{background:'var(--warn)'}}/>Aufpassen</div>
            <div className="legend-item"><div className="legend-dot" style={{background:'var(--bad)'}} />Schlecht</div>
            <div className="legend-item"><div className="legend-dot" style={{background:'var(--neutral)'}}/>Keine Daten</div>
          </div>

          {/* ── Metrics grid ── */}
          <div className="metrics-grid">
            <div className="grid-col">
              {LEFT_CATS.map(cat => (
                <CategorySection key={cat.title} title={cat.title}
                  metrics={cat.keys.map(k => metricsMap[k]).filter(Boolean)} />
              ))}
            </div>
            <div className="grid-col">
              {RIGHT_CATS.map((cat) => (
                <CategorySection key={cat.title} title={cat.title}
                  metrics={cat.keys.map(k => metricsMap[k]).filter(Boolean)} />
              ))}
            </div>
          </div>

          {/* ── Bottom: Chart + Score ── */}
          <div className="bottom-grid">
            {data.chartData && data.chartData.length > 0 && (
              <div>
                <p className="section-title">Trendanalyse</p>
                <MAChart data={data.chartData} crossSignal={data.crossSignal??'none'}
                  ma50Latest={data.ma50Latest??null} ma200Latest={data.ma200Latest??null}
                  currency={data.currency??'USD'} />
              </div>
            )}
            {overall && (
              <div>
                <p className="section-title">Gesamtbewertung</p>
                <div className="glass-card overall-card">
                  {/* Top: label + ring side by side */}
                  <div className="overall-top">
                    <div className="overall-left">
                      <h3>Aktiencheck-Score</h3>
                      <div className="overall-label" style={{color:overall.color}}>{overall.label}</div>
                      <div className="score-breakdown">
                        <div className="score-breakdown-row"><div className="breakdown-dot" style={{background:'var(--good)'}}/>{goodCount} Kriterien gut</div>
                        <div className="score-breakdown-row"><div className="breakdown-dot" style={{background:'var(--warn)'}}/>{warnCount} im Grenzbereich</div>
                        <div className="score-breakdown-row"><div className="breakdown-dot" style={{background:'var(--bad)'}} />{badCount} Kriterien schlecht</div>
                      </div>
                    </div>
                    <div className="overall-right">
                      <ScoreRing pct={overall.maxScore > 0 ? overall.score/overall.maxScore : 0} color={overall.color} />
                    </div>
                  </div>
                  {/* Bottom: recommendation */}
                  {(() => {
                    const rec = getRecommendation(metrics, data?.crossSignal)
                    return (
                      <div className="recommendation">
                        <div className="rec-action" style={{color:rec.color}}>
                          {rec.action==='Kaufen'?'↑':rec.action==='Verkaufen'?'↓':'→'} {rec.action}
                        </div>
                        <p className="rec-text">{rec.text}</p>
                      </div>
                    )
                  })()}
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
        zugelassenen Finanzberater. Datenquelle: Financial Modeling Prep, Yahoo Finance, Alpha Vantage, Finnhub.
      </footer>

    </main>
  )
}
