import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const symbol = new URL(req.url).searchParams.get('symbol') ?? ''
  const key    = process.env.FMP_API_KEY

  if (!symbol.trim()) return NextResponse.json({ error: 'Kein Symbol angegeben.' }, { status: 400 })
  if (!key)           return NextResponse.json({ error: 'FMP_API_KEY fehlt in den Umgebungsvariablen.' }, { status: 500 })

  const get = async (path: string) => {
    try {
      const r = await fetch(`https://financialmodelingprep.com/api/v3/${path}&apikey=${key}`)
      if (!r.ok) return null
      return await r.json()
    } catch { return null }
  }

  // 1. Resolve ticker
  const searchData = await get(`search?query=${encodeURIComponent(symbol)}&limit=1`)
  let ticker = symbol.toUpperCase().trim()
  let resolvedName = symbol

  if (Array.isArray(searchData) && searchData.length > 0) {
    ticker       = searchData[0].symbol
    resolvedName = searchData[0].name
  }

  // 2. Fetch all in parallel
  const [rttmRaw, rannRaw, mttmRaw, mannRaw, profileRaw, growthRaw, techRaw, histRaw] =
    await Promise.all([
      get(`ratios-ttm/${ticker}?`),
      get(`ratios/${ticker}?limit=1&`),
      get(`key-metrics-ttm/${ticker}?`),
      get(`key-metrics/${ticker}?limit=1&`),
      get(`profile/${ticker}?`),
      get(`financial-growth/${ticker}?limit=1&`),
      get(`technical_indicator/daily/${ticker}?period=14&type=rsi&limit=1&`),
      get(`historical-price-full/${ticker}?timeseries=250&`),
    ])

  // Normalise responses
  const rttm: Record<string, number> = Array.isArray(rttmRaw) ? (rttmRaw[0] ?? {}) : (rttmRaw ?? {})
  const rann: Record<string, number> = Array.isArray(rannRaw) ? (rannRaw[0] ?? {}) : {}
  const mttm: Record<string, number> = Array.isArray(mttmRaw) ? (mttmRaw[0] ?? {}) : (mttmRaw ?? {})
  const mann: Record<string, number> = Array.isArray(mannRaw) ? (mannRaw[0] ?? {}) : {}
  const p    = Array.isArray(profileRaw) ? (profileRaw[0] ?? {}) : (profileRaw ?? {})
  const g: Record<string, number>    = Array.isArray(growthRaw) ? (growthRaw[0] ?? {}) : {}
  const t: Record<string, number>    = Array.isArray(techRaw)   ? (techRaw[0]   ?? {}) : {}
  const historical: { date: string; close: number }[] = histRaw?.historical ?? []

  // Prefer TTM, fall back to annual
  const rv = (a: string, b: string): number | null => rttm[a] ?? rann[b] ?? null
  const mv = (a: string, b: string): number | null => mttm[a] ?? mann[b] ?? null

  // Compute MA50 / MA200 (oldest→newest)
  const closesAsc = [...historical].reverse().map((d) => d.close)

  function sma(arr: number[], period: number): (number | null)[] {
    return arr.map((_, i) =>
      i + 1 < period ? null
        : arr.slice(i + 1 - period, i + 1).reduce((s, v) => s + v, 0) / period
    )
  }
  const ma50arr  = sma(closesAsc, 50)
  const ma200arr = sma(closesAsc, 200)

  const datesAsc = [...historical].reverse().map((d) => d.date)
  const chartData = datesAsc.map((date, i) => ({
    date,
    close:  closesAsc[i] ?? null,
    ma50:   ma50arr[i]   ?? null,
    ma200:  ma200arr[i]  ?? null,
  }))

  const last   = closesAsc.length - 1
  const ma50L  = ma50arr[last]  ?? null
  const ma200L = ma200arr[last] ?? null
  const ma50P  = last > 0 ? (ma50arr[last - 1]  ?? null) : null
  const ma200P = last > 0 ? (ma200arr[last - 1] ?? null) : null

  let crossSignal: 'golden' | 'death' | 'none' = 'none'
  if (ma50L != null && ma200L != null) {
    crossSignal = ma50L > ma200L ? 'golden' : 'death'
    // Refine: only "fresh" cross if it happened in last 10 bars
    if (ma50P != null && ma200P != null) {
      const justCrossedGolden = ma50L > ma200L && ma50P <= ma200P
      const justCrossedDeath  = ma50L < ma200L && ma50P >= ma200P
      if (!justCrossedGolden && !justCrossedDeath) {
        crossSignal = ma50L > ma200L ? 'golden' : 'death'
      }
    }
  }

  return NextResponse.json({
    name:     p.companyName  ?? resolvedName,
    symbol:   ticker,
    sector:   p.sector       ?? null,
    industry: p.industry     ?? null,
    price:    p.price        ?? null,
    currency: p.currency     ?? 'USD',

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
    rsi:            t.rsi             ?? null,
    dividendYield:  rv('dividendYieldTTM','dividendYield'),
    revenueGrowth:  g.revenueGrowth   ?? null,
    earningsGrowth: g.netIncomeGrowth ?? null,

    chartData,
    crossSignal,
    ma50Latest:  ma50L,
    ma200Latest: ma200L,
  })
}
