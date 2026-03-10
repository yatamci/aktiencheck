import { NextRequest, NextResponse } from 'next/server'

// Node.js runtime for reliability (no edge timeout issues)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('symbol') ?? ''
  const key = process.env.FMP_API_KEY

  if (!query.trim()) {
    return NextResponse.json({ error: 'Kein Symbol angegeben.' }, { status: 400 })
  }
  if (!key) {
    return NextResponse.json(
      { error: 'API-Key fehlt. Bitte FMP_API_KEY als Umgebungsvariable setzen.' },
      { status: 500 }
    )
  }

  const fmp = (path: string) =>
    fetch(`https://financialmodelingprep.com/api/v3/${path}${path.includes('?') ? '&' : '?'}apikey=${key}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)

  try {
    // 1. Resolve ticker symbol
    const searchData = await fmp(`search?query=${encodeURIComponent(query)}&limit=1`)
    let symbol = query.toUpperCase().trim()
    let resolvedName = query

    if (Array.isArray(searchData) && searchData.length > 0) {
      symbol = searchData[0].symbol
      resolvedName = searchData[0].name
    }

    // 2. Fetch everything in parallel
    const [rttmRaw, rannRaw, mttmRaw, mannRaw, profileRaw, growthRaw, techRaw, histRaw] =
      await Promise.all([
        fmp(`ratios-ttm/${symbol}`),
        fmp(`ratios/${symbol}?limit=1`),
        fmp(`key-metrics-ttm/${symbol}`),
        fmp(`key-metrics/${symbol}?limit=1`),
        fmp(`profile/${symbol}`),
        fmp(`financial-growth/${symbol}?limit=1`),
        fmp(`technical_indicator/daily/${symbol}?period=14&type=rsi&limit=1`),
        // 200 trading days for MA chart
        fmp(`historical-price-full/${symbol}?timeseries=200`),
      ])

    // Normalise – ratios-ttm returns a plain object OR an array
    const rttm: Record<string, number> = Array.isArray(rttmRaw) ? (rttmRaw[0] ?? {}) : (rttmRaw ?? {})
    const rann: Record<string, number> = Array.isArray(rannRaw) ? (rannRaw[0] ?? {}) : {}
    const mttm: Record<string, number> = Array.isArray(mttmRaw) ? (mttmRaw[0] ?? {}) : (mttmRaw ?? {})
    const mann: Record<string, number> = Array.isArray(mannRaw) ? (mannRaw[0] ?? {}) : {}
    const p:    Record<string, unknown> = Array.isArray(profileRaw) ? (profileRaw[0] ?? {}) : {}
    const g:    Record<string, number>  = Array.isArray(growthRaw)  ? (growthRaw[0]  ?? {}) : {}
    const t:    Record<string, number>  = Array.isArray(techRaw)    ? (techRaw[0]    ?? {}) : {}
    // historical-price-full returns { historical: [...] }
    const historicalArr: { date: string; close: number }[] =
      histRaw?.historical ?? []

    // Helper: TTM first, then annual
    const rv = (ttmKey: string, annKey: string): number | null =>
      rttm[ttmKey] ?? rann[annKey] ?? null
    const mv = (ttmKey: string, annKey: string): number | null =>
      mttm[ttmKey] ?? mann[annKey] ?? null

    // 3. Compute MA50 and MA200 from historical data (newest first from FMP)
    const closes = historicalArr.map((d) => d.close)   // newest → oldest
    const closesAsc = [...closes].reverse()              // oldest → newest

    function sma(arr: number[], period: number): (number | null)[] {
      return arr.map((_, i) =>
        i + 1 < period
          ? null
          : arr.slice(i + 1 - period, i + 1).reduce((s, v) => s + v, 0) / period
      )
    }

    const ma50arr  = sma(closesAsc, 50)
    const ma200arr = sma(closesAsc, 200)

    // Build chart data: last 200 points, keep only where we have meaningful values
    const chartDates = [...historicalArr.map((d) => d.date)].reverse()
    const chartData = chartDates.map((date, i) => ({
      date,
      close:  closesAsc[i] ?? null,
      ma50:   ma50arr[i]   ?? null,
      ma200:  ma200arr[i]  ?? null,
    })).filter((d) => d.close !== null)

    // Golden/Death cross: compare latest MA50 vs MA200
    const lastIdx = closesAsc.length - 1
    const ma50Latest  = ma50arr[lastIdx]
    const ma200Latest = ma200arr[lastIdx]
    const ma50Prev    = lastIdx > 0 ? ma50arr[lastIdx - 1]  : null
    const ma200Prev   = lastIdx > 0 ? ma200arr[lastIdx - 1] : null

    let crossSignal: 'golden' | 'death' | 'none' = 'none'
    if (ma50Latest != null && ma200Latest != null) {
      if (ma50Latest > ma200Latest) {
        // Currently above – check if it just crossed
        if (ma50Prev != null && ma200Prev != null && ma50Prev <= ma200Prev) {
          crossSignal = 'golden'
        } else {
          crossSignal = 'golden' // MA50 above MA200 = bullish territory
        }
      } else {
        crossSignal = 'death'
      }
    }

    return NextResponse.json({
      name:     String(p.companyName ?? resolvedName),
      symbol,
      sector:   p.sector   ? String(p.sector)   : null,
      industry: p.industry ? String(p.industry) : null,
      price:    typeof p.price === 'number' ? p.price : null,
      currency: p.currency ? String(p.currency) : 'USD',

      // Valuation
      pe: rv('peRatioTTM',            'priceEarningsRatio'),
      ps: rv('priceToSalesRatioTTM',  'priceToSalesRatio'),
      pb: rv('priceToBookRatioTTM',   'priceToBookRatio'),

      // Profitability
      roe:             rv('returnOnEquityTTM',        'returnOnEquity'),
      roa:             rv('returnOnAssetsTTM',        'returnOnAssets'),
      grossMargin:     rv('grossProfitMarginTTM',     'grossProfitMargin'),
      operatingMargin: rv('operatingProfitMarginTTM', 'operatingProfitMargin'),
      netMargin:       rv('netProfitMarginTTM',       'netProfitMargin'),

      // Cash & Debt
      cashflow:     mv('freeCashFlowPerShareTTM', 'freeCashFlowPerShare'),
      debt:         rv('debtEquityRatioTTM',      'debtEquityRatio'),
      currentRatio: rv('currentRatioTTM',         'currentRatio'),

      // Technical
      rsi: t.rsi ?? null,

      // Dividend & Growth
      dividendYield:  rv('dividendYieldTTM',  'dividendYield'),
      revenueGrowth:  g.revenueGrowth  ?? null,
      earningsGrowth: g.netIncomeGrowth ?? null,

      // Chart data
      chartData,
      crossSignal,
      ma50Latest:  ma50Latest  ?? null,
      ma200Latest: ma200Latest ?? null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    console.error('Stock API error:', err)
    return NextResponse.json({ error: `Fehler: ${message}` }, { status: 500 })
  }
}
