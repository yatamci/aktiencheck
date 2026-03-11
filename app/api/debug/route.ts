import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const symbol = new URL(req.url).searchParams.get('symbol') ?? 'AAPL'
  const key    = process.env.FMP_API_KEY

  if (!key) return NextResponse.json({ error: 'FMP_API_KEY not set in env' })

  const results: Record<string, unknown> = { symbol, keyPresent: true, keyLength: key.length }

  const tests: Record<string, string> = {
    search:    `https://financialmodelingprep.com/api/v3/search?query=${symbol}&limit=3&apikey=${key}`,
    ratiosTTM: `https://financialmodelingprep.com/api/v3/ratios-ttm/${symbol}?apikey=${key}`,
    ratiosAnn: `https://financialmodelingprep.com/api/v3/ratios/${symbol}?limit=1&apikey=${key}`,
    profile:   `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${key}`,
    history:   `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?timeseries=10&apikey=${key}`,
  }

  for (const [name, url] of Object.entries(tests)) {
    try {
      const r    = await fetch(url)
      const text = await r.text()
      results[name] = { status: r.status, body: text.slice(0, 400) }
    } catch (e) {
      results[name] = { fetchError: String(e) }
    }
  }

  return NextResponse.json(results, { headers: { 'Content-Type': 'application/json' } })
}
