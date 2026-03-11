import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://financialmodelingprep.com/stable'

async function fmp(path: string, key: string): Promise<{ data: unknown; status: number }> {
  const sep = path.includes('?') ? '&' : '?'
  const url = `${BASE}/${path}${sep}apikey=${key}`
  try {
    const r    = await fetch(url, { cache: 'no-store' })
    const json = await r.json()
    return { data: json, status: r.status }
  } catch {
    return { data: null, status: 0 }
  }
}

function isRateLimited(json: unknown): boolean {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return false
  const msg = (json as Record<string,unknown>)['Error Message'] as string ?? ''
  return msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('upgrade')
}

function isError(json: unknown): boolean {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return false
  return !!((json as Record<string,unknown>)['Error Message'])
}

function first(v: unknown): Record<string, unknown> {
  if (!v) return {}
  if (Array.isArray(v)) return (v[0] ?? {}) as Record<string, unknown>
  if (typeof v === 'object') return v as Record<string, unknown>
  return {}
}

function num(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && typeof v === 'number' && isFinite(v)) return v
    if (v != null && typeof v === 'string' && v !== '' && isFinite(Number(v))) return Number(v)
  }
  return null
}

function str(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && typeof v === 'string' && v.trim() && v !== 'null') return v.trim()
  }
  return null
}

// Smart ticker resolution: try multiple strategies to find the right stock
async function resolveTicker(query: string, key: string): Promise<{ ticker: string; name: string; rateLimited: boolean }> {
  const q = query.trim()

  // Strategy 1: search with the query as-is
  const { data: raw1, status: s1 } = await fmp(`search?query=${encodeURIComponent(q)}&limit=10`, key)
  if (s1 !== 200 && s1 !== 0) return { ticker: q.toUpperCase(), name: q, rateLimited: isRateLimited(raw1) }

  const results1 = Array.isArray(raw1) ? raw1 as Record<string,unknown>[] : []

  if (results1.length > 0) {
    // Prefer: exact symbol match (case-insensitive)
    const exactSym = results1.find(s => String(s.symbol ?? '').toUpperCase() === q.toUpperCase())
    if (exactSym) return { ticker: String(exactSym.symbol), name: String(exactSym.name ?? q), rateLimited: false }

    // Prefer: major exchanges (NASDAQ, NYSE, XETRA, LSE, HKG, SHH, SHZ)
    const majorExchanges = ['NASDAQ','NYSE','XETRA','LSE','HKG','SHH','SHZ','EURONEXT','AMEX']
    const onMajor = results1.find(s => majorExchanges.includes(String(s.exchangeShortName ?? '').toUpperCase()))
    if (onMajor) return { ticker: String(onMajor.symbol), name: String(onMajor.name ?? q), rateLimited: false }

    // Prefer: name contains query words (e.g. "Apple" → "Apple Inc.")
    const queryLower = q.toLowerCase()
    const nameMatch = results1.find(s => String(s.name ?? '').toLowerCase().includes(queryLower))
    if (nameMatch) return { ticker: String(nameMatch.symbol), name: String(nameMatch.name ?? q), rateLimited: false }

    // Fall back to first result
    const first = results1[0]
    return { ticker: String(first.symbol ?? q.toUpperCase()), name: String(first.name ?? q), rateLimited: false }
  }

  // Strategy 2: if no results, try searching just the first word (for "Xiaomi Corp" → "Xiaomi")
  const firstWord = q.split(/\s+/)[0]
  if (firstWord.length > 2 && firstWord !== q) {
    const { data: raw2 } = await fmp(`search?query=${encodeURIComponent(firstWord)}&limit=10`, key)
    const results2 = Array.isArray(raw2) ? raw2 as Record<string,unknown>[] : []
    if (results2.length > 0) {
      const best = results2[0]
      return { ticker: String(best.symbol ?? q.toUpperCase()), name: String(best.name ?? q), rateLimited: false }
    }
  }

  return { ticker: q.toUpperCase(), name: q, rateLimited: false }
}

export async function GET(req: NextRequest) {
  const query = (new URL(req.url).searchParams.get('symbol') ?? '').trim()
  const key   = process.env.FMP_API_KEY

  if (!query) return NextResponse.json({ error: 'Kein Symbol angegeben.' }, { status: 400 })
  if (!key)   return NextResponse.json({ error: 'FMP_API_KEY nicht gesetzt.' }, { status: 500 })

  // 1. Resolve ticker
  const { ticker, name: resolvedName, rateLimited: searchLimited } = await resolveTicker(query, key)
  if (searchLimited) return NextResponse.json({ rateLimited: true })

  // 2. EUR/USD exchange rate
  const { data: fxRaw } = await fmp(`fx-quotes?symbol=EURUSD`, key)
  const fxArr = Array.isArray(fxRaw) ? fxRaw as Record<string,unknown>[] : []
  const eurusdRate = fxArr.length > 0 ? (num(fxArr[0], 'ask', 'bid', 'price') ?? null) : null

  // 3. Parallel fetch all data
  const results = await Promise.all([
    fmp(`profile?symbol=${ticker}`, key),
    fmp(`ratios-ttm?symbol=${ticker}`, key),
    fmp(`key-metrics-ttm?symbol=${ticker}`, key),
    fmp(`financial-growth?symbol=${ticker}&limit=1`, key),
    fmp(`technical-indicator/daily?symbol=${ticker}&type=rsi&period=14`, key),
    fmp(`historical-price-eod/full?symbol=${ticker}&limit=250`, key),
  ])

  // Check any rate limiting
  for (const { data } of results) {
    if (isRateLimited(data)) return NextResponse.json({ rateLimited: true })
  }

  const [profileRes, ratiosRes, metricsRes, growthRes, techRes, histRes] = results

  const p = first(profileRes.data)
  const r = first(ratiosRes.data)
  const m = first(metricsRes.data)
  const g = first(growthRes.data)

  // RSI – can be array or object
  let rsiVal: number | null = null
  const techData = techRes.data
  if (Array.isArray(techData) && techData.length > 0) {
    rsiVal = num(techData[0] as Record<string,unknown>, 'rsi', 'value')
  } else {
    rsiVal = num(first(techData), 'rsi', 'value')
  }

  // Historical
  let historicalArr: { date: string; close: number }[] = []
  const histData = histRes.data
  if (Array.isArray(histData)) {
    historicalArr = histData as { date: string; close: number }[]
  } else if (histData && typeof histData === 'object') {
    const h = (histData as Record<string,unknown>).historical
    if (Array.isArray(h)) historicalArr = h as { date: string; close: number }[]
  }

  const rv = (...keys: string[]) => num(r, ...keys)
  const mv = (...keys: string[]) => num(m, ...keys)

  // 4. MA50 / MA200
  const closesAsc = [...historicalArr].reverse().map(d => d.close)
  const datesAsc  = [...historicalArr].reverse().map(d => d.date)

  function sma(arr: number[], period: number): (number | null)[] {
    return arr.map((_, i) =>
      i + 1 < period ? null
        : arr.slice(i + 1 - period, i + 1).reduce((s, v) => s + v, 0) / period
    )
  }

  const ma50arr  = sma(closesAsc, 50)
  const ma200arr = sma(closesAsc, 200)
  const chartData = datesAsc.map((date, i) => ({
    date, close: closesAsc[i] ?? null, ma50: ma50arr[i] ?? null, ma200: ma200arr[i] ?? null,
  }))
  const last   = closesAsc.length - 1
  const ma50L  = last >= 0 ? (ma50arr[last]  ?? null) : null
  const ma200L = last >= 0 ? (ma200arr[last] ?? null) : null
  let crossSignal: 'golden' | 'death' | 'none' = 'none'
  if (ma50L !== null && ma200L !== null) crossSignal = ma50L > ma200L ? 'golden' : 'death'

  // 5. Company info
  const companyName = str(p, 'companyName', 'name') ?? resolvedName
  const rawDesc     = str(p, 'description')
  const shortDesc   = rawDesc
    ? (rawDesc.length > 380 ? rawDesc.slice(0, 380).replace(/\s\S+$/, '') + ' …' : rawDesc)
    : null

  // 6. Price + EUR conversion
  const priceOrig = num(p, 'price')
  const currency  = str(p, 'currency') ?? 'USD'
  let priceEur: number | null = null
  if (priceOrig != null && eurusdRate != null && eurusdRate > 0) {
    if (currency === 'EUR') priceEur = priceOrig
    else if (currency === 'USD') priceEur = priceOrig / eurusdRate
    else if (currency === 'GBP') priceEur = priceOrig / eurusdRate * 0.86
    else if (currency === 'GBX') priceEur = (priceOrig / 100) / eurusdRate * 0.86
    else if (currency === 'HKD') priceEur = priceOrig / eurusdRate / 8.65 // approx HKD→USD
    else if (currency === 'CNY') priceEur = priceOrig / eurusdRate / 7.24
    else priceEur = priceOrig / eurusdRate // best effort
  } else if (currency === 'EUR' && priceOrig != null) {
    priceEur = priceOrig
  }

  return NextResponse.json({
    name:        companyName,
    symbol:      ticker,
    sector:      str(p, 'sector'),
    industry:    str(p, 'industry'),
    price:       priceOrig,
    priceEur,
    currency,
    description: shortDesc,
    founded:     str(p, 'ipoDate')?.slice(0, 4) ?? null,
    hq:          [str(p, 'city'), str(p, 'country')].filter(Boolean).join(', ') || null,
    employees:   p.fullTimeEmployees != null ? Number(p.fullTimeEmployees).toLocaleString('de-DE') : null,
    ceo:         str(p, 'ceo'),

    pe: rv('peRatioTTM','peRatio','priceEarningsRatio'),
    ps: rv('priceToSalesRatioTTM','priceToSalesRatio','priceSalesRatio'),
    pb: rv('priceToBookRatioTTM','priceToBookRatio','priceBookRatio'),

    roe:             rv('returnOnEquityTTM','returnOnEquity'),
    roa:             rv('returnOnAssetsTTM','returnOnAssets'),
    grossMargin:     rv('grossProfitMarginTTM','grossProfitMargin'),
    operatingMargin: rv('operatingProfitMarginTTM','operatingProfitMargin','operatingIncomeMargin'),
    netMargin:       rv('netProfitMarginTTM','netProfitMargin'),

    cashflow:     mv('freeCashFlowPerShareTTM','freeCashFlowPerShare'),
    debt:         rv('debtEquityRatioTTM','debtEquityRatio','debtToEquity','totalDebtToEquity'),
    currentRatio: rv('currentRatioTTM','currentRatio'),

    rsi: rsiVal,

    dividendYield:  rv('dividendYieldTTM','dividendYield'),
    revenueGrowth:  typeof g.revenueGrowth   === 'number' ? g.revenueGrowth   : (typeof g.revenueGrowth   === 'string' ? parseFloat(g.revenueGrowth   as string) : null),
    earningsGrowth: typeof g.netIncomeGrowth === 'number' ? g.netIncomeGrowth : (typeof g.netIncomeGrowth === 'string' ? parseFloat(g.netIncomeGrowth as string) : null),

    chartData, crossSignal, ma50Latest: ma50L, ma200Latest: ma200L,
  })
}
