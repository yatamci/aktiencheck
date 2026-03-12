import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────────────────────
//  API helpers
// ─────────────────────────────────────────────────────────────
async function get(url: string): Promise<{ data: unknown; ok: boolean }> {
  try {
    const r    = await fetch(url, { cache: 'no-store' })
    const json = await r.json()
    return { data: json, ok: r.ok }
  } catch { return { data: null, ok: false } }
}

function first(v: unknown): Record<string,unknown> {
  if (!v) return {}
  if (Array.isArray(v)) return (v[0] ?? {}) as Record<string,unknown>
  if (typeof v === 'object') return v as Record<string,unknown>
  return {}
}

function num(obj: Record<string,unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && typeof v === 'number' && isFinite(v) && v !== 0) return v
    if (v != null && typeof v === 'string' && v.trim() !== '' && isFinite(Number(v)) && Number(v) !== 0) return Number(v)
  }
  return null
}

function str(obj: Record<string,unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k]
    if (v && typeof v === 'string' && v.trim() && v !== 'null' && v !== 'None') return v.trim()
  }
  return null
}

function isRateLimited(data: unknown): boolean {
  const s = JSON.stringify(data ?? '')
  return s.includes('limit') || s.includes('upgrade') || s.includes('429') || s.includes('Limit Reach')
}

// ─────────────────────────────────────────────────────────────
//  Ticker resolution: FMP search + fallback symbol list
// ─────────────────────────────────────────────────────────────
// Common company name → ticker map as fallback
const NAME_MAP: Record<string,string> = {
  'apple': 'AAPL', 'microsoft': 'MSFT', 'google': 'GOOGL', 'alphabet': 'GOOGL',
  'amazon': 'AMZN', 'tesla': 'TSLA', 'meta': 'META', 'facebook': 'META',
  'nvidia': 'NVDA', 'netflix': 'NFLX', 'xiaomi': '1810.HK', 'sap': 'SAP',
  'volkswagen': 'VOW3.DE', 'bmw': 'BMW.DE', 'mercedes': 'MBG.DE', 'siemens': 'SIE.DE',
  'allianz': 'ALV.DE', 'adidas': 'ADS.DE', 'bayer': 'BAYN.DE', 'basf': 'BAS.DE',
  'deutsche bank': 'DBK.DE', 'deutsche telekom': 'DTE.DE', 'lufthansa': 'LHA.DE',
  'samsung': '005930.KS', 'alibaba': 'BABA', 'tencent': '0700.HK',
  'berkshire': 'BRK.B', 'jpmorgan': 'JPM', 'johnson': 'JNJ',
  'visa': 'V', 'mastercard': 'MA', 'paypal': 'PYPL',
  'exxon': 'XOM', 'chevron': 'CVX', 'walmart': 'WMT', 'disney': 'DIS',
  'boeing': 'BA', 'airbus': 'AIR.PA', 'asml': 'ASML', 'lvmh': 'MC.PA',
  'ferrari': 'RACE', 'porsche': 'P911.DE', 'coinbase': 'COIN',
}

async function resolveTicker(query: string, fmpKey: string): Promise<string | null> {
  const q = query.trim()

  // 1. Check local name map first (instant, no API call needed)
  const ql = q.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  for (const [name, ticker] of Object.entries(NAME_MAP)) {
    if (ql === name || ql.startsWith(name) || name.startsWith(ql)) return ticker
  }

  // 2. FMP search
  const major = ['NASDAQ','NYSE','XETRA','LSE','HKG','SHH','SHZ','EURONEXT','AMEX','TSX','ASX']
  const { data } = await get(`https://financialmodelingprep.com/stable/search?query=${encodeURIComponent(q)}&limit=15&apikey=${fmpKey}`)
  const results = Array.isArray(data) ? data as Record<string,unknown>[] : []

  if (results.length > 0) {
    // Exact symbol
    const exact = results.find(r => String(r.symbol ?? '').toUpperCase() === q.toUpperCase())
    if (exact) return String(exact.symbol)
    // On major exchange
    const maj = results.find(r => major.includes(String(r.exchangeShortName ?? '').toUpperCase()))
    if (maj) return String(maj.symbol)
    // Name starts with query
    const starts = results.find(r => String(r.name ?? '').toLowerCase().startsWith(ql))
    if (starts) return String(starts.symbol)
    // First result
    return String(results[0].symbol ?? q.toUpperCase())
  }

  // 3. Last resort: assume it's already a ticker
  return q.toUpperCase()
}

// ─────────────────────────────────────────────────────────────
//  Multi-source data fetching
// ─────────────────────────────────────────────────────────────
async function fetchFMP(ticker: string, fmpKey: string) {
  // Normalize: FMP uses dots for some non-US (e.g. 1810.HK)
  const sym = ticker.replace('.DE','').replace('.PA','').replace('.HK','')
  const useSym = ['DE','PA','HK','KS'].some(s => ticker.includes('.')) ? ticker : ticker

  const [profileR, ratiosR, metricsR, growthR, techR, histR] = await Promise.all([
    get(`https://financialmodelingprep.com/stable/profile?symbol=${useSym}&apikey=${fmpKey}`),
    get(`https://financialmodelingprep.com/stable/ratios-ttm?symbol=${useSym}&apikey=${fmpKey}`),
    get(`https://financialmodelingprep.com/stable/key-metrics-ttm?symbol=${useSym}&apikey=${fmpKey}`),
    get(`https://financialmodelingprep.com/stable/financial-growth?symbol=${useSym}&limit=1&apikey=${fmpKey}`),
    get(`https://financialmodelingprep.com/stable/technical-indicator/daily?symbol=${useSym}&type=rsi&period=14&apikey=${fmpKey}`),
    get(`https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${useSym}&limit=250&apikey=${fmpKey}`),
  ])

  const p = first(profileR.data)
  const r = first(ratiosR.data)
  const m = first(metricsR.data)
  const g = first(growthR.data)

  let rsi: number | null = null
  if (Array.isArray(techR.data) && techR.data.length > 0) rsi = num(techR.data[0] as Record<string,unknown>, 'rsi','value')
  else rsi = num(first(techR.data), 'rsi','value')

  let hist: { date: string; close: number }[] = []
  if (Array.isArray(histR.data)) hist = histR.data as { date: string; close: number }[]
  else if (histR.data && typeof histR.data === 'object') {
    const h = (histR.data as Record<string,unknown>).historical
    if (Array.isArray(h)) hist = h as { date: string; close: number }[]
  }

  return {
    name:        str(p, 'companyName','name'),
    sector:      str(p, 'sector'),
    industry:    str(p, 'industry'),
    price:       num(p, 'price'),
    currency:    str(p, 'currency'),
    description: str(p, 'description'),
    ipoDate:     str(p, 'ipoDate'),
    city:        str(p, 'city'),
    country:     str(p, 'country'),
    employees:   p.fullTimeEmployees != null ? String(p.fullTimeEmployees) : null,
    ceo:         str(p, 'ceo'),

    pe:             num(r, 'peRatioTTM','peRatio','priceEarningsRatio'),
    ps:             num(r, 'priceToSalesRatioTTM','priceToSalesRatio','priceSalesRatio'),
    pb:             num(r, 'priceToBookRatioTTM','priceToBookRatio','priceBookRatio'),
    roe:            num(r, 'returnOnEquityTTM','returnOnEquity'),
    roa:            num(r, 'returnOnAssetsTTM','returnOnAssets'),
    grossMargin:    num(r, 'grossProfitMarginTTM','grossProfitMargin'),
    operatingMargin:num(r, 'operatingProfitMarginTTM','operatingProfitMargin','operatingIncomeMargin'),
    netMargin:      num(r, 'netProfitMarginTTM','netProfitMargin'),
    cashflow:       num(m, 'freeCashFlowPerShareTTM','freeCashFlowPerShare'),
    debt:           num(r, 'debtEquityRatioTTM','debtEquityRatio','debtToEquity'),
    currentRatio:   num(r, 'currentRatioTTM','currentRatio'),
    dividendYield:  num(r, 'dividendYieldTTM','dividendYield'),
    revenueGrowth:  num(g, 'revenueGrowth'),
    earningsGrowth: num(g, 'netIncomeGrowth'),
    rsi,
    hist,
  }
}

async function fetchFinnhub(ticker: string, finnhubKey: string) {
  // Finnhub uses . notation for some (e.g. SAP for SAP, 1810.HK for Xiaomi)
  const sym = ticker.replace('.DE','').replace('.PA','')

  const [profileR, metricsR, quoteR] = await Promise.all([
    get(`https://finnhub.io/api/v1/stock/profile2?symbol=${sym}&token=${finnhubKey}`),
    get(`https://finnhub.io/api/v1/stock/metric?symbol=${sym}&metric=all&token=${finnhubKey}`),
    get(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${finnhubKey}`),
  ])

  const p  = first(profileR.data)
  const q  = (metricsR.data as Record<string,unknown>)?.metric as Record<string,unknown> ?? {}
  const qt = first(quoteR.data)

  return {
    name:     str(p, 'name'),
    sector:   str(p, 'finnhubIndustry'),
    price:    num(qt, 'c','current'),

    pe:             num(q, 'peTTM','peBasicExclExtraTTM','peNormalizedAnnual'),
    ps:             num(q, 'psTTM','psAnnual'),
    pb:             num(q, 'pbAnnual','pbQuarterly'),
    roe:            num(q, 'roeTTM','roeRfy'),
    roa:            num(q, 'roaTTM','roaRfy'),
    grossMargin:    num(q, 'grossMarginTTM','grossMarginAnnual'),
    operatingMargin:num(q, 'operatingMarginTTM','operatingMarginAnnual'),
    netMargin:      num(q, 'netProfitMarginTTM','netProfitMarginAnnual'),
    currentRatio:   num(q, 'currentRatioAnnual','currentRatioQuarterly'),
    debt:           num(q, 'totalDebt/totalEquityAnnual','totalDebt/totalEquityQuarterly'),
    dividendYield:  num(q, 'dividendYieldIndicatedAnnual'),
    revenueGrowth:  num(q, 'revenueGrowthTTMYoy','revenueGrowth3Y','revenueGrowthQuarterlyYoy'),
    earningsGrowth: num(q, 'epsGrowthTTMYoy','epsGrowthQuarterlyYoy'),
    cashflow:       num(q, 'freeCashFlowPerShareTTM','fcfPerShareTTM'),
  }
}

async function fetchAlphaVantage(ticker: string, avKey: string) {
  // Alpha Vantage: overview has PE, EPS, ROE etc.
  const { data } = await get(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${avKey}`)
  const d = first(data)
  if (!d || isRateLimited(data)) return null

  return {
    name:        str(d, 'Name'),
    sector:      str(d, 'Sector'),
    industry:    str(d, 'Industry'),
    description: str(d, 'Description'),
    pe:          num(d, 'PERatio','TrailingPE'),
    pb:          num(d, 'PriceToBookRatio'),
    ps:          num(d, 'PriceToSalesRatioTTM'),
    roe:         num(d, 'ReturnOnEquityTTM'),
    roa:         num(d, 'ReturnOnAssetsTTM'),
    operatingMargin: num(d, 'OperatingMarginTTM'),
    netMargin:   num(d, 'ProfitMargin'),
    dividendYield: num(d, 'DividendYield'),
    revenueGrowth: num(d, 'QuarterlyRevenueGrowthYOY','RevenueGrowth'),
    earningsGrowth:num(d, 'QuarterlyEarningsGrowthYOY'),
  }
}

// ─────────────────────────────────────────────────────────────
//  Merge: prefer first non-null, take most recent
// ─────────────────────────────────────────────────────────────
function merge<T>(
  ...sources: (T | null | undefined)[]
): T {
  const result: Record<string,unknown> = {}
  for (const src of sources) {
    if (!src) continue
    for (const [k, v] of Object.entries(src as Record<string,unknown>)) {
      if (result[k] == null && v != null) result[k] = v
    }
  }
  return result as T
}

// ─────────────────────────────────────────────────────────────
//  MA calculation
// ─────────────────────────────────────────────────────────────
function sma(arr: number[], period: number): (number | null)[] {
  return arr.map((_, i) =>
    i + 1 < period ? null
      : arr.slice(i + 1 - period, i + 1).reduce((s, v) => s + v, 0) / period
  )
}

// ─────────────────────────────────────────────────────────────
//  Main handler
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const query   = (new URL(req.url).searchParams.get('symbol') ?? '').trim()
  const fmpKey  = process.env.FMP_API_KEY
  const fhKey   = process.env.FINNHUB_API_KEY   ?? ''
  const avKey   = process.env.ALPHA_VANTAGE_KEY ?? ''

  if (!query)  return NextResponse.json({ error: 'Kein Symbol angegeben.' }, { status: 400 })
  if (!fmpKey) return NextResponse.json({ error: 'FMP_API_KEY nicht gesetzt.' }, { status: 500 })

  // 1. Resolve ticker
  const ticker = await resolveTicker(query, fmpKey)
  if (!ticker) return NextResponse.json({ error: `Aktie "${query}" nicht gefunden.` }, { status: 404 })

  // 2. Fetch all sources in parallel
  const [fmpData, fxRaw, avData, fhData] = await Promise.all([
    fetchFMP(ticker, fmpKey),
    get(`https://financialmodelingprep.com/stable/fx-quotes?symbol=EURUSD&apikey=${fmpKey}`),
    avKey  ? fetchAlphaVantage(ticker, avKey)      : Promise.resolve(null),
    fhKey  ? fetchFinnhub(ticker, fhKey)           : Promise.resolve(null),
  ])

  // Check rate limit on FMP (primary source)
  if (isRateLimited(fmpData)) return NextResponse.json({ rateLimited: true })

  // 3. EUR/USD rate
  const fxArr = Array.isArray(fxRaw.data) ? fxRaw.data as Record<string,unknown>[] : []
  const eurusdRate = fxArr.length > 0 ? (num(fxArr[0], 'ask','bid','price') ?? null) : null

  // 4. Merge all sources (FMP primary, AV secondary, Finnhub tertiary)
  type Merged = ReturnType<typeof fetchFMP> extends Promise<infer T> ? T : never
  const d = merge(fmpData, avData ?? {}, fhData ?? {}) as typeof fmpData & typeof fhData

  // 5. EUR conversion
  const priceOrig = d.price
  const currency  = d.currency ?? 'USD'
  let priceEur: number | null = null
  if (priceOrig != null && eurusdRate != null && eurusdRate > 0) {
    const rates: Record<string,number> = {
      EUR: 1, USD: 1/eurusdRate, GBP: 1/eurusdRate * 0.86,
      GBX: 1/eurusdRate * 0.0086, HKD: 1/eurusdRate/7.8,
      CNY: 1/eurusdRate/7.25, KRW: 1/eurusdRate/1350, JPY: 1/eurusdRate/150,
    }
    const rate = rates[currency] ?? 1/eurusdRate
    priceEur = priceOrig * rate
  } else if (currency === 'EUR' && priceOrig != null) {
    priceEur = priceOrig
  }

  // 6. Description: trim at sentence boundary
  const rawDesc = d.description
  let shortDesc: string | null = null
  if (rawDesc) {
    if (rawDesc.length <= 400) {
      shortDesc = rawDesc
    } else {
      const chunk = rawDesc.slice(0, 460)
      let lastDot = -1
      for (let i = 0; i < chunk.length - 1; i++) {
        if ((chunk[i] === '.' || chunk[i] === '!' || chunk[i] === '?') &&
            (chunk[i+1] === ' ' || chunk[i+1] === '\n') && i <= 400) {
          lastDot = i + 1
        }
      }
      shortDesc = lastDot > 0 ? rawDesc.slice(0, lastDot).trim() : rawDesc.slice(0, 400).trim()
    }
  }

  // 7. MA chart
  const closesAsc = [...(d.hist ?? [])].reverse().map(h => h.close)
  const datesAsc  = [...(d.hist ?? [])].reverse().map(h => h.date)
  const ma50arr   = sma(closesAsc, 50)
  const ma200arr  = sma(closesAsc, 200)
  const chartData = datesAsc.map((date, i) => ({
    date, close: closesAsc[i] ?? null, ma50: ma50arr[i] ?? null, ma200: ma200arr[i] ?? null,
  }))
  const last   = closesAsc.length - 1
  const ma50L  = last >= 0 ? ma50arr[last]  ?? null : null
  const ma200L = last >= 0 ? ma200arr[last] ?? null : null
  const crossSignal: 'golden'|'death'|'none' = ma50L && ma200L
    ? (ma50L > ma200L ? 'golden' : 'death') : 'none'

  return NextResponse.json({
    name:        d.name ?? ticker,
    symbol:      ticker,
    sector:      d.sector,
    industry:    d.industry,
    price:       priceOrig,
    priceEur,
    currency,
    description: shortDesc,
    founded:     d.ipoDate?.slice(0, 4) ?? null,
    hq:          [d.city, d.country].filter(Boolean).join(', ') || null,
    employees:   d.employees ? Number(d.employees).toLocaleString('de-DE') : null,
    ceo:         d.ceo,

    // Sources used (for debugging)
    _sources: {
      fmp: !!fmpKey, av: !!avKey, finnhub: !!fhKey,
      eurusd: eurusdRate,
    },

    pe:             d.pe,
    ps:             d.ps,
    pb:             d.pb,
    roe:            d.roe,
    roa:            d.roa,
    grossMargin:    d.grossMargin,
    operatingMargin:d.operatingMargin,
    netMargin:      d.netMargin,
    cashflow:       d.cashflow,
    debt:           d.debt,
    currentRatio:   d.currentRatio,
    rsi:            d.rsi,
    dividendYield:  d.dividendYield,
    revenueGrowth:  d.revenueGrowth,
    earningsGrowth: d.earningsGrowth,

    chartData, crossSignal, ma50Latest: ma50L, ma200Latest: ma200L,
  })
}
