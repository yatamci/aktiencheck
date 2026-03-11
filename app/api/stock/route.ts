import { NextRequest, NextResponse } from 'next/server'

async function fmp(endpoint: string, key: string): Promise<unknown> {
  const sep = endpoint.includes('?') ? '&' : '?'
  const url = `https://financialmodelingprep.com/api/v3/${endpoint}${sep}apikey=${key}`
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    const json = await r.json()
    if (json && !Array.isArray(json) && json['Error Message']) return null
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

export async function GET(req: NextRequest) {
  const query = (new URL(req.url).searchParams.get('symbol') ?? '').trim()
  const key   = process.env.FMP_API_KEY

  if (!query) return NextResponse.json({ error: 'Kein Symbol angegeben.' }, { status: 400 })
  if (!key)   return NextResponse.json({ error: 'API-Key fehlt. Bitte FMP_API_KEY in Vercel → Settings → Environment Variables setzen und neu deployen.' }, { status: 500 })

  // 1. Resolve ticker from name or symbol
  let ticker = query.toUpperCase()
  let resolvedName = query

  const searchResult = await fmp(`search?query=${encodeURIComponent(query)}&limit=1`, key)
  if (Array.isArray(searchResult) && searchResult.length > 0) {
    ticker       = String(searchResult[0].symbol ?? ticker)
    resolvedName = String(searchResult[0].name   ?? query)
  }

  // 2. Parallel fetch
  const [rttmRaw, rannRaw, mttmRaw, mannRaw, profileRaw, growthRaw, techRaw, histRaw] =
    await Promise.all([
      fmp(`ratios-ttm/${ticker}`, key),
      fmp(`ratios/${ticker}?limit=1`, key),
      fmp(`key-metrics-ttm/${ticker}`, key),
      fmp(`key-metrics/${ticker}?limit=1`, key),
      fmp(`profile/${ticker}`, key),
      fmp(`financial-growth/${ticker}?limit=1`, key),
      fmp(`technical_indicator/daily/${ticker}?period=14&type=rsi&limit=1`, key),
      fmp(`historical-price-full/${ticker}?timeseries=250`, key),
    ])

  const rttm = first(rttmRaw)
  const rann = first(rannRaw)
  const mttm = first(mttmRaw)
  const mann = first(mannRaw)
  const p    = first(profileRaw)
  const g    = first(growthRaw)
  const t    = first(techRaw)
  const historical: { date: string; close: number }[] =
    (histRaw as Record<string,unknown>)?.historical as { date: string; close: number }[] ?? []

  const rv = (...keys: string[]) => num(rttm, ...keys) ?? num(rann, ...keys)
  const mv = (...keys: string[]) => num(mttm, ...keys) ?? num(mann, ...keys)

  // 3. MA50 / MA200
  const closesAsc = [...historical].reverse().map(d => d.close)
  const datesAsc  = [...historical].reverse().map(d => d.date)

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

  // 4. Company description helpers
  const founded = p.ipoDate ? String(p.ipoDate).slice(0, 4) : null
  const country = p.country ? String(p.country) : null
  const city    = p.city    ? String(p.city)    : null
  const hq      = [city, country].filter(Boolean).join(', ') || null
  const employees = typeof p.fullTimeEmployees === 'number'
    ? p.fullTimeEmployees.toLocaleString('de-DE')
    : typeof p.fullTimeEmployees === 'string' ? p.fullTimeEmployees : null
  const description = p.description ? String(p.description) : null
  // Shorten description to ~300 chars
  const shortDesc = description
    ? (description.length > 300 ? description.slice(0, 300).replace(/\s\S+$/, '') + ' …' : description)
    : null

  return NextResponse.json({
    name:        String(p.companyName ?? resolvedName),
    symbol:      ticker,
    sector:      p.sector   ? String(p.sector)   : null,
    industry:    p.industry ? String(p.industry) : null,
    price:       typeof p.price    === 'number' ? p.price    : null,
    currency:    typeof p.currency === 'string' ? p.currency : 'USD',
    // Company info for header card
    description: shortDesc,
    founded,
    hq,
    employees,
    ceo:         p.ceo ? String(p.ceo) : null,
    website:     p.website ? String(p.website) : null,

    pe:             rv('peRatioTTM',            'priceEarningsRatio'),
    ps:             rv('priceToSalesRatioTTM',  'priceToSalesRatio'),
    pb:             rv('priceToBookRatioTTM',   'priceToBookRatio'),
    roe:            rv('returnOnEquityTTM',     'returnOnEquity'),
    roa:            rv('returnOnAssetsTTM',     'returnOnAssets'),
    grossMargin:    rv('grossProfitMarginTTM',  'grossProfitMargin'),
    operatingMargin:rv('operatingProfitMarginTTM','operatingProfitMargin'),
    netMargin:      rv('netProfitMarginTTM',    'netProfitMargin'),
    cashflow:       mv('freeCashFlowPerShareTTM','freeCashFlowPerShare'),
    debt:           rv('debtEquityRatioTTM',    'debtEquityRatio'),
    currentRatio:   rv('currentRatioTTM',       'currentRatio'),
    rsi:            typeof t.rsi === 'number' ? t.rsi : null,
    dividendYield:  rv('dividendYieldTTM',      'dividendYield'),
    revenueGrowth:  typeof g.revenueGrowth   === 'number' ? g.revenueGrowth   : null,
    earningsGrowth: typeof g.netIncomeGrowth === 'number' ? g.netIncomeGrowth : null,
    chartData, crossSignal, ma50Latest: ma50L, ma200Latest: ma200L,
  })
}
