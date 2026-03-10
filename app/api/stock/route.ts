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
    // Search for symbol
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

    // Fetch all data in parallel
    const [ratiosRes, metricsRes, profileRes, growthRes, technicalRes] = await Promise.allSettled([
      fetch(`https://financialmodelingprep.com/api/v3/ratios/${symbol}?limit=1&apikey=${key}`),
      fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?limit=1&apikey=${key}`),
      fetch(`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${key}`),
      fetch(`https://financialmodelingprep.com/api/v3/financial-growth/${symbol}?limit=1&apikey=${key}`),
      fetch(`https://financialmodelingprep.com/api/v3/technical_indicator/daily/${symbol}?period=14&type=rsi&limit=1&apikey=${key}`),
    ])

    const ratios = ratiosRes.status === 'fulfilled' ? await ratiosRes.value.json() : []
    const metrics = metricsRes.status === 'fulfilled' ? await metricsRes.value.json() : []
    const profile = profileRes.status === 'fulfilled' ? await profileRes.value.json() : []
    const growth = growthRes.status === 'fulfilled' ? await growthRes.value.json() : []
    const technical = technicalRes.status === 'fulfilled' ? await technicalRes.value.json() : []

    const r = ratios?.[0] ?? {}
    const m = metrics?.[0] ?? {}
    const p = profile?.[0] ?? {}
    const g = growth?.[0] ?? {}
    const t = technical?.[0] ?? {}

    const stockName = p.companyName || name

    return NextResponse.json({
      name: stockName,
      symbol,
      sector: p.sector,
      industry: p.industry,
      price: p.price,
      currency: p.currency || 'USD',

      // Valuation
      pe: r.priceEarningsRatio ?? null,
      ps: r.priceToSalesRatio ?? null,
      pb: r.priceToBookRatio ?? null,

      // Profitability
      roe: r.returnOnEquity ?? null,
      roa: r.returnOnAssets ?? null,
      grossMargin: r.grossProfitMargin ?? null,
      operatingMargin: r.operatingProfitMargin ?? null,
      netMargin: r.netProfitMargin ?? null,

      // Cash & Debt
      cashflow: m.freeCashFlowPerShare ?? null,
      debt: r.debtEquityRatio ?? null,
      currentRatio: r.currentRatio ?? null,

      // Technical
      rsi: t.rsi ?? null,

      // Income & Growth
      dividendYield: r.dividendYield ?? null,
      revenueGrowth: g.revenueGrowth ?? null,
      earningsGrowth: g.netIncomeGrowth ?? null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: `Fehler beim Laden der Daten: ${message}` }, { status: 500 })
  }
}
