import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const symbol = (new URL(req.url).searchParams.get('symbol') ?? 'AAPL').trim()
  const key    = process.env.FMP_API_KEY
  if (!key) return NextResponse.json({ error: 'FMP_API_KEY not set' })

  const results: Record<string, unknown> = { symbol, keyPresent: true, keyLength: key.length, keyPreview: key.slice(0,4)+'****' }

  const tests: Record<string, string> = {
    profile:     `https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${key}`,
    ratios_ttm:  `https://financialmodelingprep.com/stable/ratios-ttm?symbol=${symbol}&apikey=${key}`,
    metrics_ttm: `https://financialmodelingprep.com/stable/key-metrics-ttm?symbol=${symbol}&apikey=${key}`,
    rsi:         `https://financialmodelingprep.com/stable/technical-indicator/daily?symbol=${symbol}&type=rsi&period=14&apikey=${key}`,
    history:     `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${symbol}&limit=5&apikey=${key}`,
    fx_eurusd:   `https://financialmodelingprep.com/stable/fx-quotes?symbol=EURUSD&apikey=${key}`,
    search:      `https://financialmodelingprep.com/stable/search?query=${symbol}&limit=3&apikey=${key}`,
  }

  for (const [name, url] of Object.entries(tests)) {
    try {
      const r    = await fetch(url, { cache: 'no-store' })
      const json = await r.json()
      const first = Array.isArray(json) ? json[0] : json
      results[name] = {
        status:  r.status,
        keys:    first ? Object.keys(first) : [],
        sample:  JSON.stringify(first).slice(0, 300),
      }
    } catch (e) {
      results[name] = { error: String(e) }
    }
  }

  return NextResponse.json(results)
}
