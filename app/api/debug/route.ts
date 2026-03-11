import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const symbol = (new URL(req.url).searchParams.get('symbol') ?? 'AAPL').trim()
  const key    = process.env.FMP_API_KEY
  if (!key) return NextResponse.json({ error: 'FMP_API_KEY not set' })

  const tests: Record<string, string> = {
    // New v4 endpoints
    profile_v4:      `https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${key}`,
    search_v4:       `https://financialmodelingprep.com/stable/search?query=${symbol}&apikey=${key}`,
    ratios_v4:       `https://financialmodelingprep.com/stable/ratios-ttm?symbol=${symbol}&apikey=${key}`,
    metrics_v4:      `https://financialmodelingprep.com/stable/key-metrics-ttm?symbol=${symbol}&apikey=${key}`,
    history_v4:      `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${symbol}&apikey=${key}`,
    // Try v3 stable
    profile_v3:      `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${key}`,
  }

  const results: Record<string, unknown> = { symbol, keyPreview: key.slice(0,6)+'****' }
  for (const [name, url] of Object.entries(tests)) {
    try {
      const r = await fetch(url, { cache: 'no-store' })
      const text = await r.text()
      results[name] = { status: r.status, preview: text.slice(0, 200) }
    } catch (e) { results[name] = { error: String(e) } }
  }
  return NextResponse.json(results)
}
