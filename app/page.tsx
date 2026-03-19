'use client'

import { useState, useCallback, useEffect } from 'react'
import ThemeToggle    from '../components/ThemeToggle'
import LanguageToggle from '../components/LanguageToggle'
import MetricCard     from '../components/MetricCard'
import SearchBar      from '../components/SearchBar'
import MAChart        from '../components/MAChart'
import MiniChart      from '../components/MiniChart'
import { StockData, buildMetrics, calculateOverallScore, MetricResult } from '../lib/evaluate'
import { Lang, T, Translations } from '../lib/i18n'

// ── Category definitions ───────────────────────────────────────────────────
const LEFT_CATS  = [
  { titleKey: 'Bewertung',    keys: ['pe','ps','pb'] },
  { titleKey: 'Rentabilität', keys: ['roe','roa','grossMargin','operatingMargin','netMargin'] },
]
const RIGHT_CATS = [
  { titleKey: 'Liquidität & Verschuldung', keys: ['cashflow','debt','currentRatio'] },
  { titleKey: 'Dividende & Wachstum',      keys: ['dividendYield','revenueGrowth','earningsGrowth'] },
  { titleKey: 'Technische Analyse',        keys: ['rsi'] },
]

// ── Score Ring ─────────────────────────────────────────────────────────────
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

// ── Category Section ───────────────────────────────────────────────────────
function CategorySection({ title, metrics, lang, historicalMetrics }: {
  title: string; metrics: MetricResult[]; lang: Lang
  historicalMetrics?: StockData['historicalMetrics']
}) {
  if (metrics.length === 0) return null
  return (
    <div className="category-section">
      <p className="section-title">{title}</p>
      <div className="metrics-col stagger">
        {metrics.map(m => (
          <MetricCard key={m.key} metric={m} lang={lang}
            historicalData={historicalMetrics?.[m.key as keyof NonNullable<StockData['historicalMetrics']>]} />
        ))}
      </div>
    </div>
  )
}

// ── Company Info ───────────────────────────────────────────────────────────
function CompanyInfo({ data, t, lang }: { data: StockData; t: Translations; lang: Lang }) {
  const [translated, setTranslated] = useState<Record<string,string>>({})

  // Auto-translate whenever lang changes
  useEffect(() => {
    if (!data.description) return
    if (translated[lang]) return // already have it
    // English description is original – no need to translate to 'en'
    const isEnglishOrig = true // FMP always returns English
    if (lang === 'en' && isEnglishOrig) return
    let cancelled = false
    async function run() {
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(data.description!)}`
        const r   = await fetch(url)
        const json = await r.json()
        const text = (json[0] as [string,string,unknown,unknown][]).map(s => s[0]).join('')
        if (!cancelled) setTranslated(prev => ({ ...prev, [lang]: text }))
      } catch { /* ignore */ }
    }
    run()
    return () => { cancelled = true }
  }, [lang, data.description])

  const desc = (lang === 'en' ? data.description : translated[lang]) ?? data.description

  const facts = [
    data.sector    && `${data.sector}${data.industry ? ` · ${data.industry}` : ''}`,
    data.hq        && `📍 ${data.hq}`,
    data.founded   && `🗓 ${t.ipoLabel} ${data.founded}`,
    data.employees && `👥 ${data.employees} ${t.employeesLabel}`,
    data.ceo       && `👤 ${t.ceoLabel}: ${data.ceo}`,
  ].filter(Boolean) as string[]

  const wikiName = (data.name ?? '').replace(/\s+/g, '_').replace(/&/g, '%26')
  const wikiUrl  = wikiName ? `https://de.wikipedia.org/wiki/${wikiName}` : null

  return (
    <div className="company-info">
      {desc && (
        <p className="company-desc">
          {desc}
          {wikiUrl && <> – <a href={wikiUrl} target="_blank" rel="noopener noreferrer" className="wiki-link">{t.wikiMore}</a></>}
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

// ── Stock Logo ─────────────────────────────────────────────────────────────
const TICKER_DOMAINS: Record<string,string> = {
  AAPL:'apple.com',MSFT:'microsoft.com',GOOGL:'google.com',GOOG:'google.com',
  AMZN:'amazon.com',TSLA:'tesla.com',META:'meta.com',NVDA:'nvidia.com',
  NFLX:'netflix.com',INTC:'intel.com',AMD:'amd.com',ORCL:'oracle.com',
  CRM:'salesforce.com',ADBE:'adobe.com',PYPL:'paypal.com',UBER:'uber.com',
  ABNB:'airbnb.com',SPOT:'spotify.com',COIN:'coinbase.com',SHOP:'shopify.com',
  SNAP:'snap.com',PINS:'pinterest.com',NET:'cloudflare.com',DDOG:'datadoghq.com',
  CRWD:'crowdstrike.com',OKTA:'okta.com',NOW:'servicenow.com',HUBS:'hubspot.com',
  TEAM:'atlassian.com',TWLO:'twilio.com',MDB:'mongodb.com',SNOW:'snowflake.com',
  JPM:'jpmorganchase.com',BAC:'bankofamerica.com',WFC:'wellsfargo.com',
  GS:'goldmansachs.com',MS:'morganstanley.com',C:'citi.com',BLK:'blackrock.com',
  V:'visa.com',MA:'mastercard.com',AXP:'americanexpress.com',
  WMT:'walmart.com',TGT:'target.com',COST:'costco.com',HD:'homedepot.com',
  MCD:'mcdonalds.com',SBUX:'starbucks.com',NKE:'nike.com',DIS:'disney.com',
  KO:'coca-cola.com',PEP:'pepsico.com',PG:'pg.com',
  JNJ:'jnj.com',PFE:'pfizer.com',MRK:'merck.com',ABBV:'abbvie.com',LLY:'lilly.com',
  AMGN:'amgen.com',GILD:'gilead.com',MRNA:'modernatx.com',UNH:'unitedhealthgroup.com',
  XOM:'exxonmobil.com',CVX:'chevron.com',BA:'boeing.com',CAT:'caterpillar.com',
  HON:'honeywell.com',UPS:'ups.com',FDX:'fedex.com',
  SAP:'sap.com',ASML:'asml.com',TSM:'tsmc.com',TM:'toyota.com',SONY:'sony.com',
  BABA:'alibaba.com',BIDU:'baidu.com',NIO:'nio.com',RACE:'ferrari.com',
  T:'att.com',VZ:'verizon.com',TMUS:'t-mobile.com',
  EBAY:'ebay.com',ETSY:'etsy.com',
  DAL:'delta.com',UAL:'united.com',MAR:'marriott.com',HLT:'hilton.com',BKNG:'booking.com',
  '005930.KS':'samsung.com','1810.HK':'mi.com','0700.HK':'tencent.com',
  '9988.HK':'alibaba.com','7203.T':'toyota.com','6758.T':'sony.com',
  'SIE.DE':'siemens.com','ALV.DE':'allianz.com','BMW.DE':'bmw.com',
  'MBG.DE':'mercedes-benz.com','VOW3.DE':'volkswagen.de','ADS.DE':'adidas.com',
  'BAYN.DE':'bayer.com','DTE.DE':'telekom.com','SAP':'sap.com',
  'MC.PA':'lvmh.com','OR.PA':'loreal.com','AIR.PA':'airbus.com',
}

function StockLogo({ symbol, name }: { symbol?: string; name?: string }) {
  const [imgSrc, setImgSrc]     = useState<string|null>(null)
  const [fallbackIdx, setFb]    = useState(0)

  const domain = symbol ? (
    TICKER_DOMAINS[symbol.toUpperCase()] ??
    TICKER_DOMAINS[symbol] ??
    (() => {
      if (/^\d/.test(symbol)) return null
      const base = (name ?? symbol)
        .toLowerCase()
        .replace(/\s+(inc\.?|corp\.?|ltd\.?|plc|ag|se|n\.v\.|s\.a\.|gmbh|holdings?|group|limited|co\.|llc)\s*$/i,'')
        .trim().replace(/[^a-z0-9]/g,'').slice(0,20)
      return base ? base + '.com' : null
    })()
  ) : null

  const sources = domain ? [
    `https://logo.clearbit.com/${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
  ] : []

  useEffect(() => {
    if (sources.length > 0) { setImgSrc(sources[0]); setFb(0) }
  }, [symbol, name])

  if (!imgSrc || fallbackIdx >= sources.length) return null
  return (
    <img src={sources[fallbackIdx]} alt="" className="stock-logo"
      onError={() => { const n=fallbackIdx+1; if(n<sources.length){setFb(n);setImgSrc(sources[n])}else setImgSrc(null) }} />
  )
}

// ── Price target estimation ────────────────────────────────────────────────
function PriceTarget({ data, t, lang }: { data: StockData; t: Translations; lang: Lang }) {
  const price     = data.price ?? 0
  const priceEur  = data.priceEur ?? price
  const currency  = data.currency ?? 'USD'

  // DCF: simplified – use earnings growth + margin as proxy for intrinsic value
  const eps        = price > 0 && data.pe && data.pe > 0 ? price / data.pe : null
  const growthRate = data.earningsGrowth ?? data.revenueGrowth ?? 0.05
  const discRate   = 0.09 // 9% discount rate
  const termGrowth = 0.025
  const dcfValue   = eps && eps > 0
    ? (eps * (1 + growthRate) * (1 - Math.pow((1 + growthRate) / (1 + discRate), 10))) / (discRate - growthRate)
      + (eps * Math.pow(1 + growthRate, 10) * (1 + termGrowth)) / ((discRate - termGrowth) * Math.pow(1 + discRate, 10))
    : null

  // Peter Lynch: fair P/E = growth rate × 100; fair value = EPS × fair P/E
  const lynchPE    = growthRate > 0 ? Math.min(growthRate * 100, 50) : null
  const lynchValue = eps && lynchPE ? eps * lynchPE : null

  if (!dcfValue && !lynchValue) return null

  const avg       = dcfValue && lynchValue ? (dcfValue + lynchValue) / 2 : dcfValue ?? lynchValue ?? 0
  const pctDiff   = price > 0 ? ((avg - price) / price) * 100 : 0
  const upside    = pctDiff > 0
  const fmt       = (v: number) => Number(v).toLocaleString('de-DE', { minimumFractionDigits:2, maximumFractionDigits:2 })
  const fmtEur    = (v: number) => {
    if (currency === 'EUR' || !data.priceEur) return `${fmt(v)} ${currency}`
    const rate = data.priceEur / (data.price ?? 1)
    return `${fmt(v * rate)} € (${fmt(v)} ${currency})`
  }

  // Format: EUR value bold, USD value light, % on own line
  const fmtRow = (v: number) => {
    const eurVal = currency === 'EUR' || !data.priceEur ? v : v * (data.priceEur / (data.price ?? 1))
    const origVal = currency !== 'EUR' && data.priceEur ? v : null
    return { eur: fmt(eurVal), orig: origVal ? fmt(v) : null }
  }
  const dcfRow   = dcfValue   ? fmtRow(dcfValue)   : null
  const lynchRow = lynchValue ? fmtRow(lynchValue)  : null
  const avgRow   = fmtRow(avg)

  return (
    <div className="glass-card price-target-card">
      <div className="pt-grid">
        {/* Header row */}
        <div className="pt-header-row">
          <span className="pt-col-label">{lang === 'de' ? 'Modell' : 'Model'}</span>
          {dcfRow?.orig && <span className="pt-col-header">{currency}</span>}
          <span className="pt-col-header">EUR</span>
        </div>
        {dcfRow && (
          <div className="pt-row">
            <span className="pt-label">{t.dcfModel}</span>
            {dcfRow.orig && <span className="pt-val-orig">{dcfRow.orig}</span>}
            <span className="pt-val-eur">{dcfRow.eur} €</span>
          </div>
        )}
        {lynchRow && (
          <div className="pt-row">
            <span className="pt-label">{t.lynchModel}</span>
            {lynchRow.orig && <span className="pt-val-orig">{lynchRow.orig}</span>}
            <span className="pt-val-eur">{lynchRow.eur} €</span>
          </div>
        )}
        <div className="pt-row pt-avg-row">
          <span className="pt-label pt-label-bold">{t.fairValueLabel}</span>
          {avgRow.orig && <span className="pt-val-orig">{avgRow.orig}</span>}
          <div className="pt-val-eur-wrap">
            <span className="pt-val-eur pt-val-eur-bold" style={{ color: upside ? 'var(--good)' : 'var(--bad)' }}>{avgRow.eur} €</span>
            <span className="pt-pct" style={{ color: upside ? 'var(--good)' : 'var(--bad)' }}>{upside ? '+' : ''}{pctDiff.toFixed(1)} %</span>
          </div>
        </div>
      </div>
      <p className="pt-disclaimer">
        {lang === 'de'
          ? 'Vereinfachte Modellschätzung. Kein Ersatz für professionelle Analyse.'
          : 'Simplified model estimate. Not a substitute for professional analysis.'}
      </p>
    </div>
  )
}

// ── Recommendation ─────────────────────────────────────────────────────────
function getRecommendation(metrics: MetricResult[], crossSignal: string|undefined, t: Translations) {
  const score = (key: string) => metrics.find(m => m.key === key)?.score ?? 'neutral'
  const val   = (key: string) => metrics.find(m => m.key === key)?.value ?? null
  const good  = metrics.filter(m => m.score === 'good').length
  const bad   = metrics.filter(m => m.score === 'bad').length
  const rel   = metrics.filter(m => m.score !== 'neutral').length
  const pct   = rel > 0 ? (good*2 + metrics.filter(m=>m.score==='warn').length) / (rel*2) : 0
  const bull  = crossSignal === 'golden'
  const bear  = crossSignal === 'death'
  const rsi   = val('rsi') as number|null
  const over  = rsi != null && rsi < 35
  const overbought = rsi != null && rsi > 65
  const cheap = score('pe')==='good' && score('ps')==='good'
  const pricey= score('pe')==='bad'  || score('ps')==='bad'
  const prof  = score('roe')==='good' || score('netMargin')==='good'
  const grow  = score('revenueGrowth')==='good' || score('earningsGrowth')==='good'
  if (pct >= 0.65 && (bull || !bear) && !overbought) {
    const r = [prof&&(t as any).profitDesc, grow&&(t as any).growthDesc, cheap&&(t as any).cheapDesc, bull&&(t as any).bullDesc, over&&(t as any).oversoldDesc].filter(Boolean).slice(0,2).join(' & ')
    const txt = `${lang==='de'?'Starke Fundamentaldaten':'Strong fundamentals'}${r?' – '+r:''}. ${lang==='de'?'Aus Kennzahlenperspektive erscheint ein Einstieg attraktiv.':'From a metrics perspective, entry looks attractive.'}`
    return { action: t.buy, color: 'var(--good)', text: txt + (lang==='de'?' Keine Anlageberatung.':' Not investment advice.') }
  }
  if (pct <= 0.3 || (bear && bad >= 3) || (overbought && pricey)) {
    const txt = lang==='de'?`Mehrere Warnsignale (${bad} schwache Kennzahlen${bear?', Abwärtstrend':''}). Überprüfung ratsam. Keine Anlageberatung.`
      :`Multiple warning signs (${bad} weak metrics${bear?', downtrend':''}). Review recommended. Not investment advice.`
    return { action: t.sell, color: 'var(--bad)', text: txt }
  }
  return {
    action: t.hold, color: 'var(--warn)',
    text: lang==='de'
      ? `Gemischtes Bild.${bull?' Aufwärtstrend positiv.':bear?' Abwärtstrend beobachten.':''} Abwarten empfohlen.`
      : `Mixed picture.${bull?' Uptrend positive.':bear?' Monitor downtrend.':''} Wait and observe recommended.`
  }
}

// We need lang in getRecommendation – use a module-level variable
let lang: Lang = 'de'

// ── Main component ─────────────────────────────────────────────────────────
export default function Home() {
  const [data,         setData]         = useState<StockData | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [rateLimited,  setRateLimited]  = useState(false)
  const [langState,    setLangState]    = useState<Lang>('de')

  // Sync module-level lang
  lang = langState

  const t = T[langState]

  // Language persistence
  useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang | null
    if (stored === 'en' || stored === 'de') setLangState(stored)
  }, [])

  function toggleLang() {
    const next: Lang = langState === 'de' ? 'en' : 'de'
    setLangState(next)
    localStorage.setItem('lang', next)
  }

  const search = useCallback(async (symbol: string) => {
    setLoading(true); setError(null); setData(null); setRateLimited(false)
    try {
      const res  = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}`)
      const json: StockData & { rateLimited?: boolean } = await res.json()
      if (json.rateLimited) setRateLimited(true)
      else if (json.error)  setError(json.error)
      else                  setData(json)
    } catch { setError(langState === 'de' ? 'Netzwerkfehler.' : 'Network error.') }
    finally   { setLoading(false) }
  }, [langState])

  const metrics    = data ? buildMetrics(data) : []
  const metricsMap = Object.fromEntries(metrics.map(m => [m.key, m]))
  const overall    = metrics.length > 0 ? calculateOverallScore(metrics) : null
  const goodCount  = metrics.filter(m => m.score === 'good').length
  const warnCount  = metrics.filter(m => m.score === 'warn').length
  const badCount   = metrics.filter(m => m.score === 'bad').length

  // RSI alignment
  useEffect(() => {
    if (!data) return
    const align = () => {
      if (window.innerWidth < 720) return
      const nettoEl = document.querySelector('[data-key="netMargin"]') as HTMLElement
      const rsiEl   = document.querySelector('[data-key="rsi"]') as HTMLElement
      const spacer  = document.querySelector('.rsi-spacer') as HTMLElement
      if (!nettoEl || !rsiEl || !spacer) return
      spacer.style.flexGrow = '0'; spacer.style.height = '0px'
      requestAnimationFrame(() => {
        const diff = nettoEl.getBoundingClientRect().bottom - rsiEl.getBoundingClientRect().bottom
        if (diff !== 0) spacer.style.height = Math.max(0, diff) + 'px'
      })
    }
    const timers = [50,200,500].map(d => setTimeout(align, d))
    window.addEventListener('resize', align)
    return () => { timers.forEach(clearTimeout); window.removeEventListener('resize', align) }
  }, [data, metrics])

  return (
    <main className="page-container">
      <header className="header">
        <div className="logo">
          <div className="logo-icon">📈</div>
          <h1 className="logo-text">{langState === 'de' ? <>Aktien<span>check</span></> : <>Stock<span>check</span></>}</h1>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <LanguageToggle lang={langState} onToggle={toggleLang} />
          <ThemeToggle />
        </div>
      </header>

      <SearchBar onSearch={search} loading={loading} placeholder={t.searchPlaceholder} analyzeLabel={t.analyze} />

      {loading && (
        <div className="loading-wrapper fade-in">
          <div className="spinner" /><p className="loading-text">{t.loading}</p>
        </div>
      )}
      {rateLimited && !loading && (
        <div className="glass-card error-card fade-in">
          <p className="error-title">{t.rateLimitTitle}</p>
          <p className="error-msg">{t.rateLimitMsg}</p>
        </div>
      )}
      {error && !loading && !rateLimited && (
        <div className="glass-card error-card fade-in">
          <p className="error-title">{t.errorTitle}</p>
          <p className="error-msg">{error}</p>
        </div>
      )}
      {!data && !loading && !error && !rateLimited && (
        <div className="empty-state fade-in">
          <div className="empty-icon">🔍</div>
          <p className="empty-title">{t.emptyTitle}</p>
          <p className="empty-subtitle">{t.emptySubtitle}</p>
        </div>
      )}

      {data && !loading && (
        <div className="fade-in">

          {/* ── Stock Header ── */}
          <div className="glass-card stock-header">
            <div className="stock-header-top">
              {data.symbol && <div className="stock-logo-wrap"><StockLogo symbol={data.symbol} name={data.name} /></div>}
              <div className="stock-identity">
                <span className="stock-name">{data.name || data.symbol}</span>
                <div className="stock-meta">
                  {data.symbol && <span className="stock-symbol">{data.symbol}</span>}
                  {data.sector && <span className="stock-sector">{data.sector}</span>}
                </div>
              </div>
              {data.price != null && (
                <div className="stock-price">
                  {/* Row 1: Desktop = USD | EUR  /  Mobile = EUR bold */}
                  {data.priceEur != null && data.currency !== 'EUR' ? (
                    <>
                      {/* Desktop row 1: orig USD */}
                      <div className="price-orig-main price-desktop-row1">
                        {Number(data.price).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})}{'\u00a0'}{data.currency}
                      </div>
                      {/* Desktop row 2: EUR */}
                      <div className="price-eur-main price-desktop-row2">
                        {Number(data.priceEur).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})}{'\u00a0'}€
                      </div>
                    </>
                  ) : (
                    <div className="price-eur-main">
                      {Number(data.priceEur ?? data.price).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})}{'\u00a0'}{data.currency ?? '€'}
                    </div>
                  )}
                  <div className="price-date">
                    {data.priceDate ? (
                      <>
                        {t.standPrefix}{' '}
                        {new Date(data.priceDate).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}
                        <span className="price-time-desktop">, {new Date(data.priceDate).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr</span>
                      </>
                    ) : t.currentPrice}
                  </div>
                </div>
              )}
            </div>
            <CompanyInfo data={data} t={t} lang={langState} />
          </div>

          {/* Legend */}
          <div className="legend">
            <div className="legend-item"><div className="legend-dot" style={{background:'var(--good)'}}/>{ t.legend.good}</div>
            <div className="legend-item"><div className="legend-dot" style={{background:'var(--warn)'}}/>{ t.legend.warn}</div>
            <div className="legend-item"><div className="legend-dot" style={{background:'var(--bad)'}} />{ t.legend.bad}</div>
            <div className="legend-item"><div className="legend-dot" style={{background:'var(--neutral)'}}/>{ t.legend.neutral}</div>
          </div>

          {/* ── Metrics grid ── */}
          <div className="metrics-grid">
            <div className="grid-col">
              {LEFT_CATS.map(cat => (
                <CategorySection key={cat.titleKey} title={t.cats[cat.titleKey as keyof typeof t.cats] ?? cat.titleKey}
                  metrics={cat.keys.map(k=>metricsMap[k]).filter(Boolean)} lang={langState}
                  historicalMetrics={data.historicalMetrics} />
              ))}
            </div>
            <div className="grid-col">
              {RIGHT_CATS.map(cat => (
                <CategorySection key={cat.titleKey} title={t.cats[cat.titleKey as keyof typeof t.cats] ?? cat.titleKey}
                  metrics={cat.keys.map(k=>metricsMap[k]).filter(Boolean)} lang={langState}
                  historicalMetrics={data.historicalMetrics} />
              ))}
              <div className="rsi-spacer" />
            </div>
          </div>

          {/* ── Bottom: Chart + Score ── */}
          <div className="bottom-grid">
            {data.chartData && data.chartData.length > 0 && (
              <div>
                <p className="section-title">{t.trend}</p>
                <MAChart data={data.chartData} crossSignal={data.crossSignal??'none'}
                  ma50Latest={data.ma50Latest??null} ma200Latest={data.ma200Latest??null}
                  currency={data.currency??'USD'} />
              </div>
            )}
            {overall && (
              <div>
                <p className="section-title">{t.overall}</p>
                <div className="glass-card overall-card">
                  <div className="overall-top">
                    <div className="overall-left">
                      <h3>{t.scoreTitle}</h3>
                      <div className="overall-label" style={{color:overall.color}}>{overall.label}</div>
                      <div className="score-breakdown">
                        <div className="score-breakdown-row"><div className="breakdown-dot" style={{background:'var(--good)'}}/>{goodCount} {t.criteriaGood}</div>
                        <div className="score-breakdown-row"><div className="breakdown-dot" style={{background:'var(--warn)'}}/>{warnCount} {t.criteriaMid}</div>
                        <div className="score-breakdown-row"><div className="breakdown-dot" style={{background:'var(--bad)'}} />{badCount} {t.criteriaBad}</div>
                      </div>
                    </div>
                    <div className="overall-right">
                      <ScoreRing pct={overall.maxScore>0?overall.score/overall.maxScore:0} color={overall.color} />
                    </div>
                  </div>
                  {(() => {
                    const rec = getRecommendation(metrics, data?.crossSignal, t)
                    return (
                      <div className="recommendation">
                        <div className="rec-action" style={{color:rec.color}}>
                          {rec.action===t.buy?'↑':rec.action===t.sell?'↓':'→'} {rec.action}
                        </div>
                        <p className="rec-text">{rec.text}</p>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* ── Price target ── */}
          <div className="pt-outer">
            <p className="section-title">{t.valuation}</p>
            <PriceTarget data={data} t={t} lang={langState} />
          </div>

        </div>
      )}

      <footer className="footer">
        <strong>{t.disclaimer}</strong>{' '}
        {t.disclaimerText}{' '}
        <span style={{opacity:0.7}}>Sources: FMP, Yahoo Finance, Alpha Vantage, Finnhub, Stooq.</span>
      </footer>
    </main>
  )
}
