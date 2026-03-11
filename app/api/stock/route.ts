import { NextRequest, NextResponse } from 'next/server'

// FMP "stable" base (new non-legacy endpoints)
const BASE = 'https://financialmodelingprep.com/stable'

async function fmp(path: string, key: string): Promise<unknown> {
  const sep = path.includes('?') ? '&' : '?'
  const url = `${BASE}/${path}${sep}apikey=${key}`
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    const json = await r.json()
    if (json && !Array.isArray(json) && (json as Record<string,unknown>)['Error Message']) return null
    return json
  } catch { return null }
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
  }
  return null
}

function str(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

export async function GET(req: NextRequest) {
  const query = (new URL(req.url).searchParams.get('symbol') ?? '').trim()
  const key   = process.env.FMP_API_KEY

  if (!query) return NextResponse.json({ error: 'Kein Symbol angegeben.' }, { status: 400 })
  if (!key)   return NextResponse.json({ error: 'FMP_API_KEY nicht gesetzt.' }, { status: 500 })

  // 1. Search to resolve ticker + full name
  let ticker = query.toUpperCase()
  let resolvedName = query

  const searchRaw = await fmp(`search?query=${encodeURIComponent(query)}&limit=1`, key)
  const searchArr = Array.isArray(searchRaw) ? searchRaw : []
  if (searchArr.length > 0) {
    ticker       = String(searchArr[0].symbol ?? ticker)
    resolvedName = String(searchArr[0].name   ?? query)
  }

  // 2. Parallel fetch – new stable endpoints
  const [profileRaw, ratiosTTMRaw, metricsTTMRaw, growthRaw, techRaw, histRaw] =
    await Promise.all([
      fmp(`profile?symbol=${ticker}`, key),
      fmp(`ratios-ttm?symbol=${ticker}`, key),
      fmp(`key-metrics-ttm?symbol=${ticker}`, key),
      fmp(`financial-growth?symbol=${ticker}&limit=1`, key),
      fmp(`technical-indicator?symbol=${ticker}&type=rsi&period=14&limit=1`, key),
      fmp(`historical-price-eod/full?symbol=${ticker}&limit=250`, key),
    ])

  const p    = first(profileRaw)
  const r    = first(ratiosTTMRaw)
  const m    = first(metricsTTMRaw)
  const g    = first(growthRaw)
  const t    = first(techRaw)

  // historical can be { historical: [...] } or directly an array
  let historicalArr: { date: string; close: number }[] = []
  if (Array.isArray(histRaw)) {
    historicalArr = histRaw as { date: string; close: number }[]
  } else if (histRaw && typeof histRaw === 'object') {
    const h = (histRaw as Record<string, unknown>).historical
    if (Array.isArray(h)) historicalArr = h as { date: string; close: number }[]
  }

  const rv = (...keys: string[]) => num(r, ...keys)
  const mv = (...keys: string[]) => num(m, ...keys)

  // 3. MA50 / MA200
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

  // 4. Company info
  const companyName = str(p, 'companyName', 'name') ?? resolvedName
  const rawDesc     = str(p, 'description')
  const shortDesc   = rawDesc
    ? (rawDesc.length > 320 ? rawDesc.slice(0, 320).replace(/\s\S+$/, '') + ' …' : rawDesc)
    : null
  const ipoDate   = str(p, 'ipoDate')
  const founded   = ipoDate ? ipoDate.slice(0, 4) : null
  const city      = str(p, 'city')
  const country   = str(p, 'country')
  const hq        = [city, country].filter(Boolean).join(', ') || null
  const empRaw    = p.fullTimeEmployees
  const employees = empRaw != null ? Number(empRaw).toLocaleString('de-DE') : null

  return NextResponse.json({
    name:        companyName,
    symbol:      ticker,
    sector:      str(p, 'sector'),
    industry:    str(p, 'industry'),
    price:       typeof p.price === 'number' ? p.price : null,
    currency:    str(p, 'currency') ?? 'USD',
    description: shortDesc,
    founded,
    hq,
    employees,
    ceo:         str(p, 'ceo'),

    // Bewertung
    pe: rv('peRatio', 'priceEarningsRatio'),
    ps: rv('priceToSalesRatio', 'priceSalesRatio'),
    pb: rv('priceToBookRatio',  'priceBookRatio'),

    // Rentabilität
    roe:             rv('returnOnEquity'),
    roa:             rv('returnOnAssets'),
    grossMargin:     rv('grossProfitMargin'),
    operatingMargin: rv('operatingProfitMargin'),
    netMargin:       rv('netProfitMargin'),

    // Liquidität & Verschuldung
    cashflow:     mv('freeCashFlowPerShare'),
    debt:         rv('debtToEquity', 'debtEquityRatio'),
    currentRatio: rv('currentRatio'),

    // Technisch
    rsi: typeof t.rsi === 'number' ? t.rsi : null,

    // Dividende & Wachstum
    dividendYield:  rv('dividendYield'),
    revenueGrowth:  typeof g.revenueGrowth   === 'number' ? g.revenueGrowth   : null,
    earningsGrowth: typeof g.netIncomeGrowth === 'number' ? g.netIncomeGrowth : null,

    chartData, crossSignal, ma50Latest: ma50L, ma200Latest: ma200L,
  })
}
