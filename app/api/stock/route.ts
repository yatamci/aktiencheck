import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('symbol')
  const key = process.env.FMP_API_KEY

  if (!query) {
    return NextResponse.json({ error: 'Kein Symbol angegeben.' }, { status: 400 })
  }

  if (!key) {
    return NextResponse.json({ error: 'API-Key fehlt. Bitte FMP_API_KEY in den Umgebungsvariablen setzen.' }, { status: 500 })
  }

  try {
    // Resolve symbol from name/query
    const searchRes = await fetch(
      `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(query)}&limit=1&apikey=${key}`
    )
    const searchData = await searchRes.json()

    let symbol = query.toUpperCase()
    let name = query

    if (Array.isArray(searchData) && searchData.length > 0) {
      symbol = searchData[0].symbol
      name = searchData[0].name
    }

    // Fetch all data in parallel – TTM as primary, annual as fallback
    const [rttmRes, rannRes, mttmRes, mannRes, profileRes, growthRes, techRes] = await Promise.allSettled([
      fetch(`https://financialmodelingprep.com/api/v3/ratios-ttm/${symbol}?apikey=${key}`),
      fetch(`https://financialmodelingprep.com/api/v3/ratios/${symbol}?limit=1&apikey=${key}`),
      fetch(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${symbol}?apikey=${key}`),
      fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?limit=1&apikey=${key}`),
      fetch(`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${key}`),
      fetch(`https://financialmodelingprep.com/api/v3/financial-growth/${symbol}?limit=1&apikey=${key}`),
      fetch(`https://financialmodelingprep.com/api/v3/technical_indicator/daily/${symbol}?period=14&type=rsi&limit=1&apikey=${key}`),
    ])

    const safe = async (res: PromiseSettledResult<Response>) =>
      res.status === 'fulfilled' ? res.value.json().catch(() => []) : []

    const [rttmRaw, rannArr, mttmRaw, mannArr, profileArr, growthArr, techArr] = await Promise.all([
      safe(rttmRes), safe(rannRes), safe(mttmRes), safe(mannRes),
      safe(profileRes), safe(growthRes), safe(techRes),
    ])

    // FMP ratios-ttm / key-metrics-ttm return a single object OR an array with one object
    const rttm: Record<string, number> = Array.isArray(rttmRaw) ? (rttmRaw[0] ?? {}) : (rttmRaw ?? {})
    const rann: Record<string, number> = Array.isArray(rannArr) ? (rannArr[0] ?? {}) : {}
    const mttm: Record<string, number> = Array.isArray(mttmRaw) ? (mttmRaw[0] ?? {}) : (mttmRaw ?? {})
    const mann: Record<string, number> = Array.isArray(mannArr) ? (mannArr[0] ?? {}) : {}
    const p = Array.isArray(profileArr) ? (profileArr[0] ?? {}) : {}
    const g: Record<string, number> = Array.isArray(growthArr) ? (growthArr[0] ?? {}) : {}
    const t: Record<string, number> = Array.isArray(techArr)   ? (techArr[0]   ?? {}) : {}

    // Helper: prefer TTM value, fall back to annual key name variants
    const rv = (ttmKey: string, annKey: string): number | null =>
      rttm[ttmKey] ?? rann[annKey] ?? rann[ttmKey] ?? null
    const mv = (ttmKey: string, annKey: string): number | null =>
      mttm[ttmKey] ?? mann[annKey] ?? mann[ttmKey] ?? null

    return NextResponse.json({
      name:     p.companyName || name,
      symbol,
      sector:   p.sector   ?? null,
      industry: p.industry ?? null,
      price:    p.price    ?? null,
      currency: p.currency || 'USD',

      // Valuation
      pe:  rv('peRatioTTM',            'priceEarningsRatio'),
      ps:  rv('priceToSalesRatioTTM',  'priceToSalesRatio'),
      pb:  rv('priceToBookRatioTTM',   'priceToBookRatio'),

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
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: `Fehler beim Laden der Daten: ${message}` }, { status: 500 })
  }
}
